# Assignment 15 security notes

## Authentication and authorization

- Local passwords are hashed with bcrypt cost 12. Registration accepts only the email and password fields and assigns `USER`; public responses omit password hashes.
- BMS access tokens are HS256 JWTs with issuer `bms-auth-service`, audience `bms-api`, subject set to the BMS user ID, and a 15 minute lifetime. The Gateway pins the algorithm and validates issuer, audience, expiry, subject, email, and role before applying its default deny RBAC policy.
- External authentication uses the Strategy contract in `src/authentication/external-authentication-strategy.ts` and the generic OIDC authorization-code adapter. The browser flow is exposed through `/api/auth/arc/login` and `/api/auth/arc/callback` at the Gateway.
- External identities are keyed by validated issuer and subject. New accounts receive `USER` only. Matching local email addresses are rejected until a separate authenticated account-linking process exists. Database uniqueness races are handled inside a transaction.

## OAuth transaction safeguards

- Authorization code flow uses PKCE `S256`, random state and nonce, a five minute transaction lifetime, and a one-time conditional PostgreSQL update that requires `consumed_at IS NULL` and an unexpired row.
- State and browser binding are stored as SHA-256 hashes. Nonce and PKCE verifier are stored with AES-256-GCM using a unique 96-bit IV and authentication tag for each value. `OAUTH_TRANSACTION_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters (32 bytes); OAuth routes fail closed if it is absent or malformed.
- Browser binding uses an HttpOnly, SameSite=Lax cookie with a five minute lifetime and narrow `/api/auth/arc` path behind the Gateway. `Secure` is set whenever the configured callback is HTTPS. Production must use HTTPS end to end.
- The OIDC adapter validates state, nonce, PKCE, issuer, audience, subject, expiry, email verification, and ID token signatures against discovered JWKS. Provider errors and validation failures are returned without token contents.

## Arc activation remains pending

Repository documentation and configuration did not identify a trustworthy Arc Authentication MS issuer or client registration. The OIDC implementation intentionally does not contain an assumed endpoint or client. Until the identity provider owner supplies and approves these values, the login route returns HTTP 503:

- Exact OIDC issuer/discovery issuer identifier from Arc Authentication MS.
- Registered client ID and client secret, placed in the deployment secret manager.
- Exact externally registered redirect URI, normally `https://<approved-host>/api/auth/arc/callback`.
- The exact scopes Arc has enabled for that client, including `openid` and whichever approved claim scope returns a verified email.
- The registered token endpoint client authentication method (`client_secret_post` or `client_secret_basic`), configured as `ARC_OIDC_CLIENT_AUTH_METHOD`.
- A 32 byte encryption key encoded as 64 hexadecimal characters for `OAUTH_TRANSACTION_ENCRYPTION_KEY`.
- Confirmation that Arc supports authorization code flow with PKCE `S256` and returns an ID token with a boolean `email_verified` claim.

Set the values only in deployment environment/secret management. Do not add production credentials or encryption keys to Compose literals, source, CI YAML, or `.env.example` files. The Compose file only passes optional environment values through to the Auth Service.

Email-only account linking is not implemented. A user must authenticate to the existing local account and explicitly confirm an account-linking flow before an external identity can be attached.

## Remaining operational work

- Add request rate limiting at the public edge for password login, registration, and OAuth initiation/callback before production deployment.
- Rotate and protect `JWT_SECRET`, `OAUTH_TRANSACTION_ENCRYPTION_KEY`, database credentials, and the Arc client secret using the production secret manager.
- Configure TLS at the public Gateway and restrict service-to-service network access. Auth Service is bound to host loopback in the development Compose stack; the Gateway uses its internal Compose network address.
- No live Arc sign-in or CI workflow execution is claimed by this document. Local automated tests use only a generated test OIDC signing key and local test database data.
