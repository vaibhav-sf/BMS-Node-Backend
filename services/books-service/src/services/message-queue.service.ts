import {randomUUID} from 'crypto';
import {BindingScope, injectable} from '@loopback/core';
import amqp, {Channel, ChannelModel} from 'amqplib';
import {logger} from './logger.service';
import {bookEventsPublishedTotal} from './metrics.service';
import {context, propagation, trace} from '@opentelemetry/api';

@injectable({scope: BindingScope.SINGLETON})
export class MessageQueueService {
  private connection?: ChannelModel;
  private channel?: Channel;

  private readonly rabbitMqUrl =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@127.0.0.1:5672';

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }

    this.connection = await amqp.connect(this.rabbitMqUrl);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange('bms.events', 'topic', {durable: true});
    logger.info('Connected to RabbitMQ', {
      exchange: 'bms.events',
    });
  }

  async publishEvent(eventName: string, payload: unknown): Promise<void> {
    await this.connect();

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

          this.channel!.publish('bms.events', eventName, message, {
            persistent: true,
            contentType: 'application/json',
            headers,
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
    if (this.channel) {
      await this.channel.close();
      this.channel = undefined;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }
  }
  async setupBookEventsQueue(): Promise<void> {
    await this.connect();

    await this.channel!.assertQueue('bms.book.events', {
      durable: true,
    });

    await this.channel!.bindQueue(
      'bms.book.events',
      'bms.events',
      'book.created',
    );
  }
}
