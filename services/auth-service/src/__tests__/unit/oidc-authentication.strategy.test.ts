/* eslint-disable @typescript-eslint/naming-convention -- OIDC claims use protocol field names. */
import {createServer, Server} from 'node:http';
import {AddressInfo} from 'node:net';
import {generateKeyPairSync} from 'node:crypto';
import {expect} from '@loopback/testlab';
import {sign} from 'jsonwebtoken';
import {OidcAuthenticationStrategy} from '../../authentication/oidc-authentication.strategy';

describe('OIDC authentication strategy', () => {
  let server: Server;
  let issuer: string;
  let strategy: OidcAuthenticationStrategy;
  let activeMode = 'valid';
  let activeNonce = '';
  const primaryKey = generateKeyPairSync('rsa', {modulusLength: 2048});
  const otherKey = generateKeyPairSync('rsa', {modulusLength: 2048});
  const publicJwk = primaryKey.publicKey.export({format: 'jwk'});

  before(async () => {
    // The async handler awaits only the token request body stream.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server = createServer(async (request, response) => {
      const url = new URL(request.url ?? '/', issuer);
      response.setHeader('content-type', 'application/json');
      if (url.pathname === '/.well-known/openid-configuration') {
        response.end(
          JSON.stringify({
            issuer,
            authorization_endpoint: `${issuer}authorize`,
            token_endpoint: `${issuer}token`,
            jwks_uri: `${issuer}jwks`,
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['client_secret_post'],
          }),
        );
        return;
      }
      if (url.pathname === '/jwks') {
        response.end(
          JSON.stringify({
            keys: [{...publicJwk, kid: 'test-key', use: 'sig', alg: 'RS256'}],
          }),
        );
        return;
      }
      if (url.pathname === '/token' && request.method === 'POST') {
        let body = '';
        for await (const chunk of request) body += chunk.toString();
        const parameters = new URLSearchParams(body);
        if (!parameters.get('code_verifier')) {
          response.statusCode = 400;
          response.end(JSON.stringify({error: 'missing_pkce_verifier'}));
          return;
        }
        const now = Math.floor(Date.now() / 1000);
        const claims: Record<string, unknown> = {
          iss: activeMode === 'wrong-issuer' ? `${issuer}/wrong` : issuer,
          aud:
            activeMode === 'wrong-audience' ? 'another-client' : 'test-client',
          exp: activeMode === 'expired' ? now - 3600 : now + 300,
          iat: now,
          nonce: activeMode === 'wrong-nonce' ? 'different-nonce' : activeNonce,
          email: 'oidc-user@example.com',
          email_verified: activeMode !== 'unverified-email',
        };
        if (activeMode !== 'missing-subject') claims.sub = 'provider-subject';
        const signingKey =
          activeMode === 'invalid-signature'
            ? otherKey.privateKey
            : primaryKey.privateKey;
        const idToken =
          activeMode === 'malformed-token'
            ? 'not.a.valid-token'
            : sign(claims, signingKey, {
                algorithm: 'RS256',
                keyid: 'test-key',
              });
        response.end(
          JSON.stringify({
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 300,
            id_token: idToken,
          }),
        );
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({error: 'not_found'}));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    issuer = `http://127.0.0.1:${address.port}/`;
    strategy = new OidcAuthenticationStrategy({
      providerName: 'test-provider',
      issuerUrl: issuer,
      clientId: 'test-client',
      clientSecret: 'test-client-secret',
      clientAuthenticationMethod: 'client_secret_post',
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  });

  async function authenticate(mode = 'valid') {
    activeMode = mode;
    const redirectUri = `${issuer}callback`;
    const authorization =
      await strategy.createAuthorizationRequest(redirectUri);
    const authorizationUrl = new URL(authorization.authorizationUrl);
    activeNonce = authorizationUrl.searchParams.get('nonce')!;
    const callback = new URL(redirectUri);
    callback.searchParams.set('code', 'one-time-test-code');
    callback.searchParams.set(
      'state',
      authorizationUrl.searchParams.get('state')!,
    );
    return strategy.completeAuthentication(
      callback,
      redirectUri,
      authorization.transaction,
    );
  }

  it('uses the configured client, exact redirect URI, and PKCE S256', async () => {
    const authorization = await strategy.createAuthorizationRequest(
      `${issuer}callback`,
    );
    const url = new URL(authorization.authorizationUrl);
    expect(url.searchParams.get('client_id')).to.equal('test-client');
    expect(url.searchParams.get('redirect_uri')).to.equal(`${issuer}callback`);
    expect(url.searchParams.get('response_type')).to.equal('code');
    expect(url.searchParams.get('code_challenge_method')).to.equal('S256');
    expect(url.searchParams.get('code_challenge')?.length).to.be.greaterThan(
      40,
    );
    expect(url.searchParams.get('state')).to.be.a.String();
    expect(url.searchParams.get('nonce')).to.be.a.String();
  });

  it('validates signature, issuer, audience, expiry, nonce, subject, and verified email', async () => {
    const identity = await authenticate();
    expect(identity.subject).to.equal('provider-subject');
    expect(identity.email).to.equal('oidc-user@example.com');
    expect(identity.emailVerified).to.equal(true);

    for (const mode of [
      'wrong-issuer',
      'wrong-audience',
      'expired',
      'wrong-nonce',
      'invalid-signature',
      'malformed-token',
      'missing-subject',
      'unverified-email',
    ]) {
      const rejected = await authenticate(mode).then(
        () => false,
        () => true,
      );
      if (!rejected) {
        throw new Error(`Validation unexpectedly accepted: ${mode}`);
      }
    }
  });

  it('rejects incorrect state and provider denial before accepting an identity', async () => {
    activeMode = 'valid';
    const redirectUri = `${issuer}callback`;
    const authorization =
      await strategy.createAuthorizationRequest(redirectUri);
    const url = new URL(authorization.authorizationUrl);
    activeNonce = url.searchParams.get('nonce')!;
    const callback = new URL(redirectUri);
    callback.searchParams.set('code', 'test-code');
    callback.searchParams.set('state', 'incorrect-state');
    await expect(
      strategy.completeAuthentication(
        callback,
        redirectUri,
        authorization.transaction,
      ),
    ).to.be.rejected();

    callback.searchParams.set('state', url.searchParams.get('state')!);
    callback.searchParams.delete('code');
    callback.searchParams.set('error', 'access_denied');
    await expect(
      strategy.completeAuthentication(
        callback,
        redirectUri,
        authorization.transaction,
      ),
    ).to.be.rejected();
  });

  it('rejects invalid issuer and callback configuration', async () => {
    expect(
      () =>
        new OidcAuthenticationStrategy({
          providerName: 'test-provider',
          issuerUrl: 'http://example.com',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        }),
    ).to.throw(/HTTPS/);
    await expect(
      strategy.createAuthorizationRequest(`${issuer}callback?next=/`),
    ).to.be.rejected();
  });
});
