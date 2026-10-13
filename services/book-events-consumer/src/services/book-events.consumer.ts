import 'dotenv/config';
import {logger} from './logger.service';
import {BindingScope, injectable} from '@loopback/core';
import amqp, {ConfirmChannel, ChannelModel, ConsumeMessage} from 'amqplib';
import {
  bookEventsConsumedTotal,
  bookEventsFailedTotal,
  bookEventsRetriedTotal,
} from './metrics.service';
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';

@injectable({scope: BindingScope.SINGLETON})
export class BookEventsConsumer {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private startingConsumer?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private consumerTag?: string;
  private stopping = false;
  private reconnectDelayMs = 1000;

  private readonly maxReconnectDelayMs = 30000;

  private readonly rabbitMqUrl =
    process.env.RABBITMQ_URL ?? 'amqp://guest:guest@127.0.0.1:5672';

  private readonly exchangeName = 'bms.events';
  private readonly queueName = 'bms.book.events';
  private readonly routingKey = 'book.created';
  private readonly retryExchangeName = 'bms.retry';
  private readonly retryQueueName = 'bms.book.events.retry';
  private readonly deadLetterExchangeName = 'bms.dlx';
  private readonly deadLetterQueueName = 'bms.book.events.dlq';
  private readonly deadLetterRoutingKey = 'book.created.dlq';

  private readonly maxRetries = 3;

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.connecting) {
      await this.connecting;
      return;
    }

    const attempt = this.openConnection();
    this.connecting = attempt;

    try {
      await attempt;
    } finally {
      if (this.connecting === attempt) {
        this.connecting = undefined;
      }
    }
  }

  private async openConnection(): Promise<void> {
    const connection = await amqp.connect(this.rabbitMqUrl);

    if (this.stopping) {
      await connection.close().catch(() => undefined);
      return;
    }

    this.connection = connection;

    connection.on('error', (error: Error) => {
      logger.error('RabbitMQ connection error', {
        error: error.message,
      });

      this.handleConnectionLoss(connection);

      connection.close().catch(() => undefined);
    });

    connection.on('close', () => {
      this.handleConnectionLoss(connection);
    });

    try {
      const channel = await connection.createConfirmChannel();

      if (this.stopping) {
        await channel.close().catch(() => undefined);
        await connection.close().catch(() => undefined);
        return;
      }

      this.channel = channel;

      channel.on('error', (error: Error) => {
        logger.error('RabbitMQ channel error', {
          error: error.message,
        });

        this.handleConnectionLoss(connection, channel);
        connection.close().catch(() => undefined);
      });

      channel.on('close', () => {
        this.handleConnectionLoss(connection, channel);
        connection.close().catch(() => undefined);
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

  async start(): Promise<void> {
    this.stopping = false;

    try {
      await this.startConsumer();
    } catch (error) {
      logger.error('Could not start RabbitMQ consumer; retrying', {
        error: error instanceof Error ? error.message : String(error),
      });

      this.scheduleReconnect();
    }
  }

  private async startConsumer(): Promise<void> {
    if (this.startingConsumer) {
      await this.startingConsumer;
      return;
    }
    const attempt = this.startConsumerOnce();
    this.startingConsumer = attempt;
    try {
      await attempt;
    } finally {
      if (this.startingConsumer === attempt) {
        this.startingConsumer = undefined;
      }
    }
  }

  private async startConsumerOnce(): Promise<void> {
    if (this.stopping) {
      return;
    }

    if (this.channel && this.consumerTag) {
      return;
    }

    await this.connect();

    const connection = this.connection;
    const channel = this.channel;

    if (!connection || !channel) {
      throw new Error('RabbitMQ connection or channel is unavailable');
    }

    await this.setupReliabilityTopology(channel);

    if (
      this.connection !== connection ||
      this.channel !== channel ||
      this.stopping
    ) {
      throw new Error('RabbitMQ connection closed during setup');
    }

    const result = await channel.consume(
      this.queueName,
      (message: ConsumeMessage | null) => {
        this.handleMessage(connection, channel, message);
      },
    );

    if (
      this.connection !== connection ||
      this.channel !== channel ||
      this.stopping
    ) {
      await channel.cancel(result.consumerTag).catch(() => undefined);
      return;
    }

    this.consumerTag = result.consumerTag;
    this.reconnectDelayMs = 1000;

    logger.info('Consumer listening for events', {
      queue: this.queueName,
      exchange: this.exchangeName,
      routingKey: this.routingKey,
    });
  }

  private handleConnectionLoss(
    connection: ChannelModel,
    channel?: ConfirmChannel,
  ): void {
    const connectionIsCurrent = this.connection === connection;
    const channelIsCurrent = channel !== undefined && this.channel === channel;

    if (!connectionIsCurrent && !channelIsCurrent) {
      return;
    }

    if (connectionIsCurrent) {
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
    } else if (channelIsCurrent) {
      this.channel = undefined;
      this.consumerTag = undefined;
    }

    if (this.stopping) {
      return;
    }

    logger.warn('RabbitMQ connection lost; consumer will reconnect');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) {
      return;
    }

    const delayMs = this.reconnectDelayMs;

    this.reconnectDelayMs = Math.min(
      this.reconnectDelayMs * 2,
      this.maxReconnectDelayMs,
    );

    logger.warn('Scheduling RabbitMQ reconnection', {delayMs});

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;

      this.startConsumer().catch(error => {
        logger.error('RabbitMQ reconnection attempt failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        this.scheduleReconnect();
      });
    }, delayMs);
  }

  private handleMessage(
    connection: ChannelModel,
    channel: ConfirmChannel,
    message: ConsumeMessage | null,
  ): void {
    if (!message) {
      this.handleConnectionLoss(connection, channel);
      connection.close().catch(() => undefined);
      return;
    }

    const processingPromise = (async () => {
      const messageHeaders = message.properties.headers ?? {};

      const parentContext = propagation.extract(
        context.active(),
        messageHeaders,
      );

      const tracer = trace.getTracer('book-events-consumer');

      await tracer.startActiveSpan(
        `rabbitmq consume ${this.routingKey}`,
        {
          kind: SpanKind.CONSUMER,
        },
        parentContext,
        async span => {
          try {
            const event = JSON.parse(message.content.toString());

            logger.info('book.created event received', {
              correlationId: event.correlationId,
              eventName: event.eventName,
              bookId: event.payload?.book_id,
              traceId: span.spanContext().traceId,
            });

            // Never acknowledge a message after the delivering channel is stale.
            if (this.connection !== connection || this.channel !== channel) {
              throw new Error('RabbitMQ delivery channel is stale');
            }

            bookEventsConsumedTotal.inc();
            channel.ack(message);

            span.setStatus({code: SpanStatusCode.OK});

            logger.info('Message acknowledged', {
              eventName: event.eventName,
              correlationId: event.correlationId,
              traceId: span.spanContext().traceId,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            bookEventsFailedTotal.inc();

            logger.error('Failed to process book.created event', {
              error: errorMessage,
            });

            span.recordException(
              error instanceof Error ? error : new Error(errorMessage),
            );

            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMessage,
            });

            // If publishing the retry fails, leave the message unacked.
            // RabbitMQ can redeliver it after the channel closes.
            await this.retryMessage(channel, message);
          } finally {
            span.end();
          }
        },
      );
    })();

    processingPromise.catch(error => {
      logger.error('Unexpected consumer callback error', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private async setupReliabilityTopology(
    channel: ConfirmChannel,
  ): Promise<void> {
    await channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    await channel.assertQueue(this.queueName, {
      durable: true,
    });

    await channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);

    await channel.assertExchange(this.retryExchangeName, 'direct', {
      durable: true,
    });

    await channel.assertExchange(this.deadLetterExchangeName, 'direct', {
      durable: true,
    });

    await channel.assertQueue(this.retryQueueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 5000,
        'x-dead-letter-exchange': this.exchangeName,
        'x-dead-letter-routing-key': this.routingKey,
      },
    });

    await channel.bindQueue(
      this.retryQueueName,
      this.retryExchangeName,
      this.routingKey,
    );

    await channel.assertQueue(this.deadLetterQueueName, {
      durable: true,
    });

    await channel.bindQueue(
      this.deadLetterQueueName,
      this.deadLetterExchangeName,
      this.deadLetterRoutingKey,
    );
  }

  private async retryMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage,
  ): Promise<void> {
    const headers = message.properties.headers ?? {};
    const currentRetryCount = Number(headers['x-retry-count'] ?? 0);
    const nextRetryCount = currentRetryCount + 1;

    logger.warn('Message retry scheduled', {
      retryCount: nextRetryCount,
      maxRetries: this.maxRetries,
    });

    if (nextRetryCount > this.maxRetries) {
      await this.publishConfirmed(
        channel,
        this.deadLetterExchangeName,
        this.deadLetterRoutingKey,
        message.content,
        {
          persistent: true,
          contentType: 'application/json',
          headers: {
            ...headers,
            'x-retry-count': nextRetryCount,
          },
        },
      );

      if (!this.isCurrentChannel(channel)) {
        return;
      }
      channel.ack(message);

      logger.error('Message moved to DLQ', {
        retryCount: nextRetryCount,
        queue: this.deadLetterQueueName,
      });

      return;
    }

    bookEventsRetriedTotal.inc();

    await this.publishConfirmed(
      channel,
      this.retryExchangeName,
      this.routingKey,
      message.content,
      {
        persistent: true,
        contentType: 'application/json',
        headers: {
          ...headers,
          'x-retry-count': nextRetryCount,
        },
      },
    );

    if (!this.isCurrentChannel(channel)) {
      return;
    }
    channel.ack(message);

    logger.warn('Message scheduled for retry', {
      retryCount: nextRetryCount,
      maxRetries: this.maxRetries,
    });
  }

  private isCurrentChannel(channel: ConfirmChannel): boolean {
    return !this.stopping && this.channel === channel;
  }

  private publishConfirmed(
    channel: ConfirmChannel,
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: amqp.Options.Publish,
  ): Promise<void> {
    if (!this.isCurrentChannel(channel)) {
      return Promise.reject(new Error('RabbitMQ delivery channel is stale'));
    }
    return new Promise((resolve, reject) => {
      channel.publish(exchange, routingKey, content, options, error =>
        error ? reject(error) : resolve(),
      );
    });
  }

  async close(): Promise<void> {
    this.stopping = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    const channel = this.channel;
    const connection = this.connection;

    this.channel = undefined;
    this.connection = undefined;
    this.consumerTag = undefined;

    if (channel) {
      await channel.close().catch(() => undefined);
    }

    if (connection) {
      await connection.close().catch(() => undefined);
    }
  }
}
