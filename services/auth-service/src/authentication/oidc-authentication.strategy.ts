/* eslint-disable @typescript-eslint/naming-convention -- OIDC protocol parameters require snake_case names. */
import * as oidc from 'openid-client';
import {
  ExternalAuthenticationStrategy,
  ExternalIdentity,
  OAuthAuthorizationRequest,
  OAuthAuthorizationTransaction,
} from './external-authentication-strategy';
export interface OidcStrategyOptions {
  providerName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  clientAuthenticationMethod?: 'client_secret_post' | 'client_secret_basic';
  scopes?: string[];
}
const TRANSACTION_TTL_MS = 5 * 60 * 1000;
function parseSecureUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && localHosts.has(parsed.hostname))
  ) {
    throw new Error(`${label} must use HTTPS except for local development.`);
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error(`${label} must not contain credentials or a fragment.`);
  }
  return parsed;
}
export class OidcAuthenticationStrategy implements ExternalAuthenticationStrategy {
  readonly providerName: string;
  private readonly issuerUrl: URL;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly clientAuthenticationMethod?:
    'client_secret_post' | 'client_secret_basic';
  private readonly scopes: string[];
  private configurationPromise?: Promise<oidc.Configuration>;
  constructor(options: OidcStrategyOptions) {
    if (!options.providerName.trim()) {
      throw new Error('An OIDC provider name is required.');
    }
    if (!options.clientId.trim() || !options.clientSecret) {
      throw new Error('OIDC client credentials are not configured.');
    }
    this.providerName = options.providerName;
    this.issuerUrl = parseSecureUrl(options.issuerUrl, 'OIDC issuer URL');
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.clientAuthenticationMethod = options.clientAuthenticationMethod;
    this.scopes = options.scopes ?? ['openid'];
    if (!this.scopes.includes('openid')) {
      throw new Error('OIDC scopes must include openid.');
    }
  }
  private getConfiguration(): Promise<oidc.Configuration> {
    if (!this.configurationPromise) {
      this.configurationPromise = oidc
        .discovery(
          this.issuerUrl,
          this.clientId,
          this.clientSecret,
          this.clientAuthenticationMethod === 'client_secret_basic'
            ? oidc.ClientSecretBasic(this.clientSecret)
            : this.clientAuthenticationMethod === 'client_secret_post'
              ? oidc.ClientSecretPost(this.clientSecret)
              : undefined,
          this.issuerUrl.protocol === 'http:'
            ? {execute: [oidc.allowInsecureRequests]}
            : undefined,
        )
        .then(configuration => {
          oidc.enableNonRepudiationChecks(configuration);
          return configuration;
        })
        .catch(() => {
          this.configurationPromise = undefined;
          throw new Error('OIDC provider discovery failed.');
        });
    }
    return this.configurationPromise;
  }
  async createAuthorizationRequest(
    redirectUri: string,
  ): Promise<OAuthAuthorizationRequest> {
    const callback = parseSecureUrl(redirectUri, 'OIDC redirect URI');
    if (callback.search || callback.hash) {
      throw new Error(
        'OIDC redirect URI must not contain a query or fragment.',
      );
    }
    const configuration = await this.getConfiguration();
    if (!configuration.serverMetadata().supportsPKCE()) {
      throw new Error(
        'The OIDC provider does not advertise PKCE support; refusing an insecure downgrade.',
      );
    }
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: callback.href,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return {
      authorizationUrl: authorizationUrl.href,
      transaction: {
        state,
        nonce,
        codeVerifier,
        expiresAt: Date.now() + TRANSACTION_TTL_MS,
      },
    };
  }
  async completeAuthentication(
    callbackUrl: URL,
    redirectUri: string,
    transaction: OAuthAuthorizationTransaction,
  ): Promise<ExternalIdentity> {
    const callback = parseSecureUrl(callbackUrl.href, 'OIDC callback URL');
    const registeredCallback = parseSecureUrl(redirectUri, 'OIDC redirect URI');
    if (
      callback.origin !== registeredCallback.origin ||
      callback.pathname !== registeredCallback.pathname ||
      callback.hash
    ) {
      throw new Error(
        'OIDC callback URL does not match the configured redirect URI.',
      );
    }
    if (Date.now() >= transaction.expiresAt) {
      throw new Error('OIDC authentication transaction has expired.');
    }
    if (
      !transaction.state ||
      callback.searchParams.get('state') !== transaction.state
    ) {
      throw new Error('OIDC state validation failed.');
    }
    if (callback.searchParams.has('error')) {
      throw new Error('OIDC provider returned an authentication error.');
    }
    const configuration = await this.getConfiguration();
    const tokens = await oidc.authorizationCodeGrant(configuration, callback, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) {
      throw new Error(
        'OIDC provider did not return validated identity claims.',
      );
    }
    if (
      typeof claims.iss !== 'string' ||
      claims.iss !== this.issuerUrl.href ||
      typeof claims.sub !== 'string' ||
      !claims.sub.trim()
    ) {
      throw new Error('OIDC issuer or subject claim is invalid.');
    }
    if (
      typeof claims.email !== 'string' ||
      !claims.email.trim() ||
      claims.email_verified !== true
    ) {
      throw new Error('OIDC provider must return a verified email address.');
    }
    return {
      provider: this.providerName,
      issuer: claims.iss,
      subject: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerified: true,
    };
  }
}
