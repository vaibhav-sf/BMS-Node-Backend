import {sign} from 'jsonwebtoken';
import {Client, expect} from '@loopback/testlab';
import {ApiGatewayApplication} from '../..';
import {setupApplication} from './test-helper';

describe('BooksController gateway response', () => {
  let app: ApiGatewayApplication;
  let client: Client;
  const originalFetch = global.fetch;
  const testJwtSecret = 'gateway-acceptance-test-secret-at-least-32-bytes-long';
  const originalJwtSecret = process.env.JWT_SECRET;

  before(async () => {
    process.env.JWT_SECRET = testJwtSecret;
    ({app, client} = await setupApplication());
  });

  after(async () => {
    global.fetch = originalFetch;

    try {
      await app.stop();
    } finally {
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
    }
  });

  it('returns HTTP 201 and the created book from POST /api/books', async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const created = {book_id: 73, title: 'Gateway test'};
    global.fetch = async () =>
      new Response(JSON.stringify(created), {
        status: 201,
        headers: {'Content-Type': 'application/json'},
      });

    const token = sign(
      {email: 'admin@example.com', role: 'ADMIN'},
      testJwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'bms-auth-service',
        audience: 'bms-api',
        subject: 'test-admin-user',
        expiresIn: '15m',
      },
    );

    const response = await client
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .send({title: created.title})
      .expect(201);
    expect(response.body).to.containEql(created);
  });
});
