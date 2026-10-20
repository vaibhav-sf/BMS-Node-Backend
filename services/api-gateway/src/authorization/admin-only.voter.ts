import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
} from '@loopback/authorization';

export async function adminOnly(
  context: AuthorizationContext,
  _metadata: AuthorizationMetadata,
): Promise<AuthorizationDecision> {
  const principal = context.principals[0] as {role?: string} | undefined;

  if (principal?.role === 'ADMIN') {
    return AuthorizationDecision.ALLOW;
  }

  return AuthorizationDecision.DENY;
}
