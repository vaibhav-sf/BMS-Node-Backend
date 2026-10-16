import {AuthorsServiceApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
} from '@loopback/testlab';
import {CoreTags} from '@loopback/core';
import {BooksReferenceService} from '../../services/books-reference.service';
import {FakeBooksReferenceService} from './fake-books-reference.service';

export async function setupApplication(): Promise<AppWithClient> {
  const restConfig = givenHttpServerConfig({
    // Customize the server configuration here.
    // Empty values (undefined, '') will be ignored by the helper.
    //
    // host: process.env.HOST,
    // port: +process.env.PORT,
  });

  const app = new AuthorsServiceApplication({
    rest: restConfig,
  });

  await app.boot();
  app
    .bind('services.BooksReferenceService')
    .toClass(FakeBooksReferenceService)
    .tag({[CoreTags.SERVICE_INTERFACE]: BooksReferenceService});
  await app.start();

  const client = createRestAppClient(app);

  return {app, client};
}

export interface AppWithClient {
  app: AuthorsServiceApplication;
  client: Client;
}
