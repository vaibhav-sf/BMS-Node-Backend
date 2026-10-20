import {expect} from '@loopback/testlab';
import {AuthApiService} from '../../services/auth-api.service';

describe('AuthApiService external authentication proxy', () => {
  const service = new AuthApiService();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('forwards the provider redirect and binding cookie without following redirects', async () => {
    global.fetch = async (_url, options) => {
      expect(options?.redirect).to.equal('manual');
      return new Response(null, {
        status: 302,
        headers: {
          location: 'https://identity.example/authorize?state=test',
          'set-cookie': 'bms_arc_binding=binding; Path=/api/auth/arc; HttpOnly',
        },
      });
    };

    const result = await service.arcLogin();
    expect(result.statusCode).to.equal(302);
    expect(result.headers?.location).to.containEql('identity.example');
    expect(result.headers?.['set-cookie']).to.containEql('HttpOnly');
  });

  it('forwards only the configured callback query and browser binding', async () => {
    let requestedUrl = '';
    let forwardedCookie = '';
    global.fetch = async (input, options) => {
      requestedUrl = String(input);
      forwardedCookie = new Headers(options?.headers).get('cookie') ?? '';
      return new Response(
        '{"error":"External authentication is not configured."}',
        {
          status: 503,
          headers: {'content-type': 'application/json'},
        },
      );
    };

    const result = await service.arcCallback(
      '/api/auth/arc/callback?code=one-time-code&state=opaque-state',
      'bms_arc_binding=browser-binding',
    );
    expect(new URL(requestedUrl).pathname).to.equal('/auth/arc/callback');
    expect(new URL(requestedUrl).searchParams.get('state')).to.equal(
      'opaque-state',
    );
    expect(forwardedCookie).to.equal('bms_arc_binding=browser-binding');
    expect(result.statusCode).to.equal(503);
    expect(result.body).to.containEql('not configured');
  });

  it('does not expose upstream error details when the Auth Service is unavailable', async () => {
    global.fetch = async () => {
      throw new Error('sensitive upstream details');
    };
    const error = await expect(service.arcLogin()).to.be.rejected();
    expect(error.statusCode).to.equal(502);
    expect(error.message).to.not.containEql('sensitive upstream details');
  });
});
