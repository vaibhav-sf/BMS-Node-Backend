import {AuthenticationStrategy} from '@loopback/authentication';
import {HttpErrors, Request} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {JwtPayload, verify} from 'jsonwebtoken';

export class JwtAuthenticationStrategy implements AuthenticationStrategy {
  readonly name = 'jwt';

  async authenticate(request: Request): Promise<UserProfile | undefined> {
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new HttpErrors.Unauthorized(
        'Authorization Bearer token is required.',
      );
    }

    const parts = authorization.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== 'bearer' ||
      !parts[1]
    ) {
      throw new HttpErrors.Unauthorized(
        'Authorization header must use Bearer token format.',
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new HttpErrors.InternalServerError(
        'JWT authentication is not configured correctly.',
      );
    }

    let payload: string | JwtPayload;

    try {
      payload = verify(parts[1], secret, {
        algorithms: ['HS256'],
        issuer: 'bms-auth-service',
        audience: 'bms-api',
      });
    } catch {
      throw new HttpErrors.Unauthorized('Invalid or expired access token.');
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      throw new HttpErrors.Unauthorized(
        'Access token contains invalid claims.',
      );
    }

    return {
      [securityId]: payload.sub,
      name: payload.email,
      email: payload.email,
      role: payload.role,
    };
  }
}
