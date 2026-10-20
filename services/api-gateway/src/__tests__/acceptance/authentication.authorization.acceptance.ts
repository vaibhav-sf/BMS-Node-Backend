import {Client} from '@loopback/testlab';
import {sign} from 'jsonwebtoken';
import {ApiGatewayApplication} from '../..';
import {setupApplication} from './test-helper';

describe('Gateway authentication and RBAC', () => {
  const testJwtSecret = 'gateway-acceptance-test-secret-at-least-32-bytes-long';
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFetch = global.fetch;

  const resourcePaths = ['/api/books', '/api/authors', '/api/categories'];

  let app: ApiGatewayApplication;
  let client: Client;

  function createToken(
    role: 'USER' | 'ADMIN',
    expiresInSeconds: number = 900,
  ): string {
    return sign(
      {
        email: `${role.toLowerCase()}@example.com`,
        role,
      },
      testJwtSecret,
      {
        algorithm: 'HS256',
        issuer: 'bms-auth-service',
        audience: 'bms-api',
        subject: `test-${role.toLowerCase()}`,
        expiresIn: expiresInSeconds,
      },
    );
  }

  before(async () => {
    process.env.JWT_SECRET = testJwtSecret;

    // Mock backend responses so tests do not depend on live services.
    global.fetch = async (_url, options) => {
      const method = options?.method?.toUpperCase() ?? 'GET';

      return new Response(JSON.stringify({ok: true}), {
        status: method === 'GET' ? 200 : 201,
        headers: {'Content-Type': 'application/json'},
      });
    };

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

  for (const endpoint of resourcePaths) {
    it(`rejects GET ${endpoint} without a token`, async () => {
      await client.get(endpoint).expect(401);
    });

    it(`rejects malformed JWT for GET ${endpoint}`, async () => {
      await client
        .get(endpoint)
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);
    });

    it(`allows USER to read ${endpoint}`, async () => {
      await client
        .get(endpoint)
        .set('Authorization', `Bearer ${createToken('USER')}`)
        .expect(200);
    });

    it(`denies USER from creating resources at ${endpoint}`, async () => {
      await client
        .post(endpoint)
        .set('Authorization', `Bearer ${createToken('USER')}`)
        .send({})
        .expect(403);
    });

    it(`allows ADMIN to create resources at ${endpoint}`, async () => {
      await client
        .post(endpoint)
        .set('Authorization', `Bearer ${createToken('ADMIN')}`)
        .send({})
        .expect(response => {
          if (response.status < 200 || response.status >= 300) {
            throw new Error(
              `Expected a successful 2xx response, got ${response.status}`,
            );
          }
        });
    });
  }

  it('rejects an expired JWT', async () => {
    await client
      .get('/api/books')
      .set('Authorization', `Bearer ${createToken('USER', 0)}`)
      .expect(401);
  });
});
