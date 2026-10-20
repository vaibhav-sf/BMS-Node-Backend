/* eslint-disable @typescript-eslint/naming-convention -- Preserve PostgreSQL column names. */
import {createHash, randomUUID} from 'node:crypto';
import {expect} from '@loopback/testlab';
import {AuthServiceApplication} from '../..';
import {OAuthTransactionStore} from '../../authentication/oauth-transaction.store';
import {OAuthTransactionRepository} from '../../repositories';
import {setupApplication} from './test-helper';

describe('OAuth transaction storage', () => {
  let app: AuthServiceApplication;
  let client: Awaited<ReturnType<typeof setupApplication>>['client'];
  let repository: OAuthTransactionRepository;
  let store: OAuthTransactionStore;
  const originalKey = process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY;
  const testKey = '4f'.repeat(32);
  const testStateHashes: string[] = [];

  function trackState(state: string): string {
    const hash = createHash('sha256').update(state).digest('hex');
    testStateHashes.push(hash);
    return hash;
  }

  before(async () => {
    process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY = testKey;
    ({app, client} = await setupApplication());
    repository = await app.get<OAuthTransactionRepository>(
      'repositories.OAuthTransactionRepository',
    );
    store = new OAuthTransactionStore(repository);
  });

  it('fails closed when Arc provider configuration is missing', async () => {
    const names = [
      'ARC_OIDC_ISSUER_URL',
      'ARC_OIDC_CLIENT_ID',
      'ARC_OIDC_CLIENT_SECRET',
      'ARC_OIDC_CLIENT_AUTH_METHOD',
      'ARC_OIDC_REDIRECT_URI',
      'ARC_OIDC_SCOPES',
    ];
    const previous = names.map(name => process.env[name]);
    try {
      names.forEach(name => delete process.env[name]);
      await client.get('/auth/arc/login').expect(503);
      process.env.ARC_OIDC_ISSUER_URL = 'https://issuer.invalid';
      process.env.ARC_OIDC_CLIENT_ID = 'test-client-id';
      process.env.ARC_OIDC_CLIENT_SECRET = 'test-client-secret';
      process.env.ARC_OIDC_CLIENT_AUTH_METHOD = 'client_secret_post';
      process.env.ARC_OIDC_REDIRECT_URI =
        'https://gateway.example/api/auth/arc/callback';
      process.env.ARC_OIDC_SCOPES = 'openid';
      const configuredKey = process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY;
      delete process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY;
      await client.get('/auth/arc/login').expect(503);
      if (configuredKey !== undefined) {
        process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY = configuredKey;
      }
    } finally {
      names.forEach((name, index) => {
        const value = previous[index];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      });
    }
  });

  after(async () => {
    if (repository && testStateHashes.length) {
      await repository.deleteAll({state_hash: {inq: testStateHashes}});
    }
    if (originalKey === undefined)
      delete process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY;
    else process.env.OAUTH_TRANSACTION_ENCRYPTION_KEY = originalKey;
    if (app) await app.stop();
  });

  it('stores secrets encrypted and consumes a transaction only once under concurrency', async () => {
    const state = randomUUID();
    const nonce = randomUUID();
    const codeVerifier = randomUUID();
    const binding = randomUUID();
    await store.save(
      'arc',
      {state, nonce, codeVerifier, expiresAt: Date.now() + 60_000},
      binding,
    );
    const stored = await repository.findById(trackState(state));
    expect(stored.nonce).to.not.equal(nonce);
    expect(stored.code_verifier).to.not.equal(codeVerifier);

    const results = await Promise.allSettled([
      store.consume('arc', state, binding),
      store.consume('arc', state, binding),
    ]);
    expect(
      results.filter(result => result.status === 'fulfilled'),
    ).to.have.length(1);
    const consumed = results.find(result => result.status === 'fulfilled');
    if (consumed?.status === 'fulfilled') {
      expect(consumed.value.nonce).to.equal(nonce);
      expect(consumed.value.codeVerifier).to.equal(codeVerifier);
    }
    await expect(store.consume('arc', state, binding)).to.be.rejected();
  });

  it('rejects a browser binding mismatch and expired transaction', async () => {
    const mismatchState = randomUUID();
    const mismatchBinding = randomUUID();
    await store.save(
      'arc',
      {
        state: mismatchState,
        nonce: randomUUID(),
        codeVerifier: randomUUID(),
        expiresAt: Date.now() + 60_000,
      },
      mismatchBinding,
    );
    trackState(mismatchState);
    await expect(
      store.consume('arc', mismatchState, randomUUID()),
    ).to.be.rejected();
    await expect(
      store.consume('arc', randomUUID(), mismatchBinding),
    ).to.be.rejected();

    const expiredState = randomUUID();
    const expiredBinding = randomUUID();
    await store.save(
      'arc',
      {
        state: expiredState,
        nonce: randomUUID(),
        codeVerifier: randomUUID(),
        expiresAt: Date.now() + 60_000,
      },
      expiredBinding,
    );
    const stateHash = trackState(expiredState);
    await repository.updateById(stateHash, {
      expires_at: new Date(Date.now() - 1_000),
    });
    await expect(
      store.consume('arc', expiredState, expiredBinding),
    ).to.be.rejected();
  });

  it('removes expired records during transaction creation', async () => {
    const expiredState = randomUUID();
    const stateHash = trackState(expiredState);
    await repository.create({
      state_hash: stateHash,
      provider: 'arc',
      nonce: 'encrypted',
      code_verifier: 'encrypted',
      browser_binding_hash: 'expired',
      expires_at: new Date(Date.now() - 1_000),
    });
    const activeState = randomUUID();
    await store.save(
      'arc',
      {
        state: activeState,
        nonce: randomUUID(),
        codeVerifier: randomUUID(),
        expiresAt: Date.now() + 60_000,
      },
      randomUUID(),
    );
    trackState(activeState);
    expect(await repository.exists(stateHash)).to.equal(false);
  });
});
