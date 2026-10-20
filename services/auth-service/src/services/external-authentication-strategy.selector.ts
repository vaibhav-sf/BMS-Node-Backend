import {injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {ExternalAuthenticationStrategy} from '../authentication/external-authentication-strategy';
import {OidcAuthenticationStrategy} from '../authentication/oidc-authentication.strategy';
import {assertOAuthEncryptionConfigured} from '../authentication/oauth-transaction.store';

export interface SelectedAuthenticationStrategy {
  strategy: ExternalAuthenticationStrategy;
  redirectUri: string;
}

@injectable()
export class ExternalAuthenticationStrategySelector {
  select(providerName: string): SelectedAuthenticationStrategy {
    if (providerName !== 'arc') {
      throw new HttpErrors.ServiceUnavailable(
        'External authentication is not configured.',
      );
    }
    const issuerUrl = process.env.ARC_OIDC_ISSUER_URL;
    const clientId = process.env.ARC_OIDC_CLIENT_ID;
    const clientSecret = process.env.ARC_OIDC_CLIENT_SECRET;
    const clientAuthenticationMethod = process.env.ARC_OIDC_CLIENT_AUTH_METHOD;
    const redirectUri = process.env.ARC_OIDC_REDIRECT_URI;
    const configuredScopes = process.env.ARC_OIDC_SCOPES;
    if (
      !issuerUrl ||
      !clientId ||
      !clientSecret ||
      !clientAuthenticationMethod ||
      !redirectUri ||
      !configuredScopes
    ) {
      throw new HttpErrors.ServiceUnavailable(
        'External authentication is not configured.',
      );
    }
    if (
      clientAuthenticationMethod !== 'client_secret_post' &&
      clientAuthenticationMethod !== 'client_secret_basic'
    ) {
      throw new HttpErrors.ServiceUnavailable(
        'External authentication is not configured.',
      );
    }
    try {
      assertOAuthEncryptionConfigured();
      return {
        strategy: new OidcAuthenticationStrategy({
          providerName,
          issuerUrl,
          clientId,
          clientSecret,
          clientAuthenticationMethod,
          scopes: configuredScopes.split(/\s+/).filter(Boolean),
        }),
        redirectUri,
      };
    } catch {
      throw new HttpErrors.ServiceUnavailable(
        'External authentication is not configured.',
      );
    }
  }
}
