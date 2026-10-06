import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {BookEventsConsumer} from './services/book-events.consumer';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';

export {ApplicationConfig};

export class BookEventsConsumerApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);
    this.bind('services.BookEventsConsumer').toClass(BookEventsConsumer);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
  start = async (): Promise<void> => {
    await super.start();

    const consumer = await this.get<BookEventsConsumer>(
      'services.BookEventsConsumer',
    );

    await consumer.start();
  };

  stop = async (): Promise<void> => {
    const consumer = await this.get<BookEventsConsumer>(
      'services.BookEventsConsumer',
    );

    await consumer.close();

    await super.stop();
  };
}
