import {Client, expect} from '@loopback/testlab';
import {ApiGatewayApplication} from '../..';
import {setupApplication} from './test-helper';

describe('BooksController gateway response', () => {
  let app: ApiGatewayApplication;
  let client: Client;
  const originalFetch = global.fetch;

  before(async () => {
    ({app, client} = await setupApplication());
  });

  after(async () => {
    global.fetch = originalFetch;
    await app.stop();
  });

  it('returns HTTP 201 and the created book from POST /api/books', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const created = {book_id: 73, title: 'Gateway test'};
    global.fetch = async () =>
      new Response(JSON.stringify(created), {
        status: 201,
        headers: {'Content-Type': 'application/json'},
      });

    const response = await client
      .post('/api/books')
      .send({title: created.title})
      .expect(201);
    expect(response.body).to.containEql(created);
  });
});
