import 'dotenv/config';
import {logger} from './logger.service';
import {BindingScope, injectable} from '@loopback/core';
import amqp, {Channel, ChannelModel, ConsumeMessage} from 'amqplib';
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
  private channel?: Channel;

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
    if (this.channel) {
      return;
    }

    this.connection = await amqp.connect(this.rabbitMqUrl);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    await this.channel.assertQueue(this.queueName, {
      durable: true,
    });

    await this.channel.bindQueue(
      this.queueName,
      this.exchangeName,
      this.routingKey,
    );
  }

  async start(): Promise<void> {
    await this.setupReliabilityTopology();

    const tracer = trace.getTracer('book-events-consumer');

    await this.channel!.consume(
      this.queueName,
      (message: ConsumeMessage | null) => {
        const processingPromise = (async () => {
          if (!message) {
            return;
          }

          const messageHeaders = message.properties.headers ?? {};

          const parentContext = propagation.extract(
            context.active(),
            messageHeaders,
          );

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

                bookEventsConsumedTotal.inc();

                this.channel!.ack(message);

                span.setStatus({
                  code: SpanStatusCode.OK,
                });

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

                await this.retryMessage(message);
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
      },
    );

    logger.info('Consumer listening for events', {
      queue: this.queueName,
      exchange: this.exchangeName,
      routingKey: this.routingKey,
    });
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
  async setupReliabilityTopology(): Promise<void> {
    await this.connect();

    await this.channel!.assertExchange(this.retryExchangeName, 'direct', {
      durable: true,
    });

    await this.channel!.assertExchange(this.deadLetterExchangeName, 'direct', {
      durable: true,
    });

    await this.channel!.assertQueue(this.retryQueueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 5000,
        'x-dead-letter-exchange': this.exchangeName,
        'x-dead-letter-routing-key': this.routingKey,
      },
    });

    await this.channel!.bindQueue(
      this.retryQueueName,
      this.retryExchangeName,
      this.routingKey,
    );

    await this.channel!.assertQueue(this.deadLetterQueueName, {durable: true});

    await this.channel!.bindQueue(
      this.deadLetterQueueName,
      this.deadLetterExchangeName,
      this.deadLetterRoutingKey,
    );
  }
  private async retryMessage(message: ConsumeMessage): Promise<void> {
    const headers = message.properties.headers ?? {};
    const currentRetryCount = Number(headers['x-retry-count'] ?? 0);
    const nextRetryCount = currentRetryCount + 1;
    logger.warn('Message retry scheduled', {
      retryCount: nextRetryCount,
      maxRetries: this.maxRetries,
    });

    if (nextRetryCount > this.maxRetries) {
      this.channel!.publish(
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

      this.channel!.ack(message);

      logger.error('Message moved to DLQ', {
        retryCount: nextRetryCount,
        queue: this.deadLetterQueueName,
      });

      return;
    }

    bookEventsRetriedTotal.inc();
    this.channel!.publish(
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

    this.channel!.ack(message);

    console.warn(
      `⚠️ Message scheduled for retry ${nextRetryCount}/${this.maxRetries}.`,
    );
  }
}
