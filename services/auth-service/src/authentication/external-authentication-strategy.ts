/**
 * Short-lived OAuth transaction data.
 *
 * Keep this data server-side. Never send the nonce or PKCE verifier
 * to the browser as application data or store them in localStorage.
 */
export interface OAuthAuthorizationTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
}
/**
 * Result of starting an external authentication flow.
 *
 * The authorization URL may be sent to the browser. The transaction
 * must be stored securely on the server and must not be exposed.
 */
export interface OAuthAuthorizationRequest {
  authorizationUrl: string;
  transaction: OAuthAuthorizationTransaction;
}
/**
 * Trusted identity claims returned after successful provider validation.
 *
 * Local application roles are deliberately excluded. The external
 * provider must not directly assign BMS ADMIN privileges.
 */
export interface ExternalIdentity {
  provider: string;
  issuer: string;
  subject: string;
  email: string;
  emailVerified: boolean;
}
/**
 * Strategy contract for external identity providers.
 *
 * Each implementation owns provider-specific discovery, authorization
 * request construction, code exchange, and identity-token validation.
 */
export interface ExternalAuthenticationStrategy {
  readonly providerName: string;
  createAuthorizationRequest(
    redirectUri: string,
  ): Promise<OAuthAuthorizationRequest>;
  completeAuthentication(
    callbackUrl: URL,
    redirectUri: string,
    transaction: OAuthAuthorizationTransaction,
  ): Promise<ExternalIdentity>;
}
