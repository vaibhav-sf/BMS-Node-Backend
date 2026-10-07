import {Client} from '@opensearch-project/opensearch';
import type {TransformableInfo} from 'logform';
import TransportStream, {type TransportStreamOptions} from 'winston-transport';

interface OpenSearchTransportOptions extends TransportStreamOptions {
  node: string;
  index: string;
}

export class OpenSearchTransport extends TransportStream {
  private readonly client: Client;
  private readonly index: string;

  constructor(options: OpenSearchTransportOptions) {
    super(options);

    this.client = new Client({
      node: options.node,
    });

    this.index = options.index;
  }

  log(info: TransformableInfo, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const {level, message, timestamp, ...metadata} = info;

    const document = {
      '@timestamp': timestamp ?? new Date().toISOString(),
      level,
      message,
      service: process.env.SERVICE_NAME ?? 'book-events-consumer',
      ...metadata,
    };

    this.client
      .index({
        index: this.index,
        body: document,
      })
      .catch(error => {
        this.emit('error', error);
      });

    callback();
  }
}
