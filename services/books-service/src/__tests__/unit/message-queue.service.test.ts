import {expect} from '@loopback/testlab';
import {EventEmitter} from 'events';
import amqp, {ChannelModel, ConfirmChannel} from 'amqplib';
import {MessageQueueService} from '../../services/message-queue.service';

describe('MessageQueueService', () => {
  const amqpModule = amqp as unknown as {
    connect: (url: string) => Promise<ChannelModel>;
  };
  const originalConnect = amqpModule.connect;

  afterEach(() => {
    amqpModule.connect = originalConnect;
  });

  function installMockBroker(
    options: {failFirstQueueAssertion?: boolean} = {},
  ) {
    const calls: Array<{name: string; args: unknown[]}> = [];
    let queueAssertions = 0;
    const channel = Object.assign(new EventEmitter(), {
      assertExchange: async (...args: unknown[]) => {
        calls.push({name: 'assertExchange', args});
        return {};
      },
      assertQueue: async (...args: unknown[]) => {
        calls.push({name: 'assertQueue', args});
        queueAssertions++;
        if (options.failFirstQueueAssertion && queueAssertions === 1) {
          throw new Error('queue assertion failed');
        }
        return {};
      },
      bindQueue: async (...args: unknown[]) => {
        calls.push({name: 'bindQueue', args});
        return {};
      },
      publish: (
        exchange: string,
        routingKey: string,
        content: Buffer,
        _options: unknown,
        confirm?: (error: Error | null) => void,
      ) => {
        calls.push({name: 'publish', args: [exchange, routingKey, content]});
        queueMicrotask(() => confirm?.(null));
        return true;
      },
      close: async () => undefined,
    }) as unknown as ConfirmChannel;

    const connection = Object.assign(new EventEmitter(), {
      createConfirmChannel: async () => channel,
      close: async () => undefined,
    }) as unknown as ChannelModel;

    amqpModule.connect = async () => connection;
    return calls;
  }

  it('creates and binds the durable queue before publishing without consumer setup', async () => {
    const calls = installMockBroker();
    const service = new MessageQueueService();

    try {
      await service.publishEvent('book.created', {book_id: 42});

      const queueAssertion = calls.find(call => call.name === 'assertQueue');
      const binding = calls.find(call => call.name === 'bindQueue');
      const publish = calls.find(call => call.name === 'publish');

      expect(queueAssertion?.args).to.deepEqual([
        'bms.book.events',
        {durable: true},
      ]);
      expect(binding?.args).to.deepEqual([
        'bms.book.events',
        'bms.events',
        'book.created',
      ]);
      expect(calls.indexOf(queueAssertion!)).to.be.lessThan(
        calls.indexOf(publish!),
      );
      expect(calls.indexOf(binding!)).to.be.lessThan(calls.indexOf(publish!));
    } finally {
      await service.close();
    }
  });

  it('shares topology setup and does not redeclare it on every publish', async () => {
    const calls = installMockBroker();
    const service = new MessageQueueService();

    try {
      await Promise.all([
        service.publishEvent('book.created', {book_id: 1}),
        service.publishEvent('book.created', {book_id: 2}),
      ]);

      expect(calls.filter(call => call.name === 'assertQueue')).to.have.length(
        1,
      );
      expect(calls.filter(call => call.name === 'bindQueue')).to.have.length(1);
      expect(calls.filter(call => call.name === 'publish')).to.have.length(2);
    } finally {
      await service.close();
    }
  });

  it('stops initialization when shutdown begins during channel creation', async () => {
    let resolveChannelCreation: (channel: ConfirmChannel) => void = () => {};
    let channelCreationStarted: () => void = () => {};
    const channelStarted = new Promise<void>(resolve => {
      channelCreationStarted = resolve;
    });
    const calls: string[] = [];
    const channel = Object.assign(new EventEmitter(), {
      assertExchange: async () => {
        calls.push('assertExchange');
        return {};
      },
      assertQueue: async () => {
        calls.push('assertQueue');
        return {};
      },
      bindQueue: async () => {
        calls.push('bindQueue');
        return {};
      },
      publish: () => {
        calls.push('publish');
        return true;
      },
      close: async () => {
        calls.push('channel.close');
      },
    }) as unknown as ConfirmChannel;
    const connection = Object.assign(new EventEmitter(), {
      createConfirmChannel: () => {
        channelCreationStarted();
        return new Promise<ConfirmChannel>(resolve => {
          resolveChannelCreation = resolve;
        });
      },
      close: async () => {
        calls.push('connection.close');
      },
    }) as unknown as ChannelModel;
    amqpModule.connect = async () => connection;
    const service = new MessageQueueService();

    const publish = service.publishEvent('book.created', {book_id: 3});
    await channelStarted;
    await service.close();
    resolveChannelCreation(channel);

    const error = await expect(publish).to.be.rejected();
    expect(error.message).to.equal('RabbitMQ service is shutting down');
    expect(calls).to.containEql('channel.close');
    expect(calls).to.containEql('connection.close');
    expect(calls).to.not.containEql('assertExchange');
    expect(calls).to.not.containEql('publish');
  });

  it('does not publish after topology failure and retries initialization', async () => {
    const calls = installMockBroker({failFirstQueueAssertion: true});
    const service = new MessageQueueService();

    try {
      const error = await expect(
        service.publishEvent('book.created', {book_id: 7}),
      ).to.be.rejected();
      expect(error.message).to.equal('queue assertion failed');
      expect(calls.filter(call => call.name === 'publish')).to.have.length(0);

      await service.publishEvent('book.created', {book_id: 7});

      expect(calls.filter(call => call.name === 'assertQueue')).to.have.length(
        2,
      );
      expect(calls.filter(call => call.name === 'bindQueue')).to.have.length(1);
      expect(calls.filter(call => call.name === 'publish')).to.have.length(1);
    } finally {
      await service.close();
    }
  });
});
