import {randomUUID} from 'crypto';
import {BindingScope, injectable} from '@loopback/core';
import amqp, {ChannelModel, ConfirmChannel} from 'amqplib';
import {logger} from './logger.service';
import {bookEventsPublishedTotal} from './metrics.service';
import {context, propagation, trace} from '@opentelemetry/api';

@injectable({scope: BindingScope.SINGLETON})
export class MessageQueueService {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private bookEventsTopology?: {
    channel: ConfirmChannel;
    ready: Promise<void>;
  };
  private stopping = false;

  private readonly rabbitMqUrl =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@127.0.0.1:5672';

  async connect(): Promise<void> {
    if (this.stopping) {
      throw new Error('RabbitMQ service is shutting down');
    }
    if (this.connection && this.channel) {
      return;
    }

    if (this.connecting) {
      await this.connecting;
      return;
    }

    this.connecting = this.openConnection();

    try {
      await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }

  private async openConnection(): Promise<void> {
    const connection = await amqp.connect(this.rabbitMqUrl);

    if (this.stopping) {
      await connection.close().catch(() => undefined);
      throw new Error('RabbitMQ service is shutting down');
    }

    this.connection = connection;

    connection.on('error', (error: Error) => {
      logger.error('RabbitMQ connection error', {
        error: error.message,
      });

      if (this.connection === connection) {
        this.connection = undefined;
        this.channel = undefined;
        this.bookEventsTopology = undefined;
      }

      connection.close().catch(() => undefined);
    });

    connection.on('close', () => {
      if (this.connection === connection) {
        this.connection = undefined;
        this.channel = undefined;
        this.bookEventsTopology = undefined;

        logger.warn(
          'RabbitMQ connection closed; it will reconnect on the next publish',
        );
      }
    });

    try {
      const channel = await connection.createConfirmChannel();

      if (this.stopping) {
        await channel.close().catch(() => undefined);
        await connection.close().catch(() => undefined);
        throw new Error('RabbitMQ service is shutting down');
      }

      this.channel = channel;

      channel.on('error', (error: Error) => {
        logger.error('RabbitMQ channel error', {
          error: error.message,
        });

        if (this.connection === connection && this.channel === channel) {
          this.connection = undefined;
          this.channel = undefined;
          this.bookEventsTopology = undefined;
        }

        connection.close().catch((closeError: Error) => {
          logger.warn('Error closing failed RabbitMQ connection', {
            error: closeError.message,
          });
        });
      });

      channel.on('close', () => {
        if (this.connection === connection && this.channel === channel) {
          this.connection = undefined;
          this.channel = undefined;
          this.bookEventsTopology = undefined;

          logger.warn(
            'RabbitMQ channel closed; it will reconnect on the next publish',
          );
        }
        connection.close().catch(() => undefined);
      });

      await channel.assertExchange('bms.events', 'topic', {
        durable: true,
      });

      if (this.connection !== connection || this.channel !== channel) {
        throw new Error('RabbitMQ connection closed during initialization');
      }

      logger.info('Connected to RabbitMQ', {
        exchange: 'bms.events',
      });
    } catch (error) {
      if (this.connection === connection) {
        this.connection = undefined;
        this.channel = undefined;
      }

      await connection.close().catch(() => undefined);
      throw error;
    }
  }

  async publishEvent(eventName: string, payload: unknown): Promise<void> {
    await this.connect();

    const channel = this.channel;

    if (!channel || this.stopping) {
      throw new Error('RabbitMQ channel is not available');
    }

    await this.ensureBookEventsTopology(channel);

    if (this.channel !== channel || this.connection === undefined) {
      throw new Error('RabbitMQ channel became stale during topology setup');
    }

    const correlationId = randomUUID();
    const tracer = trace.getTracer('books-service');

    await tracer.startActiveSpan(
      `rabbitmq publish ${eventName}`,
      {
        kind: 3,
      },
      async span => {
        try {
          const headers: Record<string, string> = {};

          propagation.inject(context.active(), headers);

          const message = Buffer.from(
            JSON.stringify({
              eventName,
              correlationId,
              timestamp: new Date().toISOString(),
              payload,
            }),
          );

          if (this.channel !== channel || this.connection === undefined) {
            throw new Error('RabbitMQ channel became stale before publish');
          }

          await new Promise<void>((resolve, reject) => {
            channel.publish(
              'bms.events',
              eventName,
              message,
              {
                persistent: true,
                contentType: 'application/json',
                headers,
              },
              error => (error ? reject(error) : resolve()),
            );
          });

          bookEventsPublishedTotal.inc();

          logger.info('Event published', {
            eventName,
            correlationId,
          });
        } catch (error) {
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          span.setStatus({code: 2});
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async close(): Promise<void> {
    this.stopping = true;
    const channel = this.channel;
    const connection = this.connection;

    this.channel = undefined;
    this.connection = undefined;
    this.bookEventsTopology = undefined;

    if (channel) {
      await channel.close().catch(() => undefined);
    }

    if (connection) {
      await connection.close().catch(() => undefined);
    }
  }

  async setupBookEventsQueue(): Promise<void> {
    await this.connect();

    const channel = this.channel;

    if (!channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    await this.ensureBookEventsTopology(channel);
  }

  private ensureBookEventsTopology(channel: ConfirmChannel): Promise<void> {
    if (this.bookEventsTopology?.channel === channel) {
      return this.bookEventsTopology.ready;
    }

    const topology = {channel, ready: Promise.resolve()};
    topology.ready = (async () => {
      try {
        await channel.assertQueue('bms.book.events', {durable: true});
        await channel.bindQueue(
          'bms.book.events',
          'bms.events',
          'book.created',
        );
      } catch (error) {
        logger.error('RabbitMQ book event topology initialization failed', {
          exchange: 'bms.events',
          queue: 'bms.book.events',
          routingKey: 'book.created',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    })().catch(error => {
      if (this.bookEventsTopology === topology) {
        this.bookEventsTopology = undefined;
      }
      throw error;
    });

    this.bookEventsTopology = topology;
    return topology.ready;
  }
}
