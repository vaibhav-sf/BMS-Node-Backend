import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

export interface AuthUpstreamResult {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

@injectable({scope: BindingScope.SINGLETON})
export class AuthApiService {
  private readonly baseUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3006';

  private readonly requestTimeoutMs = 5000;

  async register(
    credentials: Record<string, unknown>,
  ): Promise<AuthUpstreamResult> {
    return this.forward('/auth/register', credentials);
  }

  async login(
    credentials: Record<string, unknown>,
  ): Promise<AuthUpstreamResult> {
    return this.forward('/auth/login', credentials);
  }

  async arcLogin(): Promise<AuthUpstreamResult> {
    return this.forwardArc('/auth/arc/login');
  }

  async arcCallback(
    requestUrl: string,
    cookie?: string,
  ): Promise<AuthUpstreamResult> {
    const incoming = new URL(requestUrl, 'http://gateway.local');
    return this.forwardArc(`/auth/arc/callback${incoming.search}`, cookie);
  }

  private async forwardArc(
    path: string,
    cookie?: string,
  ): Promise<AuthUpstreamResult> {
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: cookie ? {cookie} : {},
        redirect: 'manual',
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new HttpErrors.BadGateway('Auth Service is unavailable');
    }

    const headers: Record<string, string> = {};
    const location = upstream.headers.get('location');
    const cookies = upstream.headers.getSetCookie?.();
    const setCookie = cookies?.length
      ? cookies.join(', ')
      : upstream.headers.get('set-cookie');
    const contentType = upstream.headers.get('content-type');
    if (location) headers.location = location;
    if (setCookie) headers['set-cookie'] = setCookie;
    if (contentType) headers['content-type'] = contentType;
    const body = upstream.status === 302 ? undefined : await upstream.text();
    return {statusCode: upstream.status, body, headers};
  }

  private async forward(
    path: string,
    credentials: Record<string, unknown>,
  ): Promise<AuthUpstreamResult> {
    let upstream: globalThis.Response;

    try {
      upstream = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new HttpErrors.GatewayTimeout('Auth Service timed out');
      }

      throw new HttpErrors.BadGateway('Auth Service is unavailable');
    }

    let body: unknown;

    try {
      body = await upstream.json();
    } catch {
      throw new HttpErrors.BadGateway(
        'Auth Service returned an invalid response',
      );
    }

    if (upstream.status >= 500) {
      throw new HttpErrors.BadGateway(
        'Auth Service failed to process the request',
      );
    }

    // Preserve registration, login, and authentication error statuses.
    return {
      statusCode: upstream.status,
      body,
    };
  }
}
