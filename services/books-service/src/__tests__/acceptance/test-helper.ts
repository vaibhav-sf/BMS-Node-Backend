import {CoreTags} from '@loopback/core';
import {BooksServiceApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
} from '@loopback/testlab';
import {AuthorsApiService} from '../../services/authors-api.service';
import {FakeAuthorsApiService} from './fake-authors-api.service';
import {CategoriesApiService} from '../../services/categories-api.service';
import {FakeCategoriesApiService} from './fake-categories-api.service';

export async function setupApplication(): Promise<AppWithClient> {
  const restConfig = givenHttpServerConfig({
    // Customize the server configuration here.
    // Empty values (undefined, '') will be ignored by the helper.
    //
    // host: process.env.HOST,
    // port: +process.env.PORT,
  });

  const app = new BooksServiceApplication({
    rest: restConfig,
  });

  await app.boot();

  // Replace the production AuthorsApiService with a deterministic
  // fake for Books acceptance tests.
  app
    .bind('services.AuthorsApiService')
    .toClass(FakeAuthorsApiService)
    .tag({
      [CoreTags.SERVICE_INTERFACE]: AuthorsApiService,
    });

  app
    .bind('services.CategoriesApiService')
    .toClass(FakeCategoriesApiService)
    .tag({
      [CoreTags.SERVICE_INTERFACE]: CategoriesApiService,
    });

  await app.start();

  const client = createRestAppClient(app);

  return {app, client};
}

export interface AppWithClient {
  app: BooksServiceApplication;
  client: Client;
}
