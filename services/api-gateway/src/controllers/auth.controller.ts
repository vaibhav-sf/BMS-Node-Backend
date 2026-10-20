import {inject, service} from '@loopback/core';
import {
  post,
  get,
  requestBody,
  response,
  Response,
  RestBindings,
  Request,
} from '@loopback/rest';
import {AuthApiService} from '../services/auth-api.service';

export class AuthController {
  constructor(
    @service(AuthApiService)
    private readonly authApiService: AuthApiService,

    @inject(RestBindings.Http.RESPONSE)
    private readonly httpResponse: Response,
    @inject(RestBindings.Http.REQUEST)
    private readonly httpRequest: Request,
  ) {}

  @post('/api/auth/register')
  @response(201, {
    description: 'User registered successfully',
  })
  async register(
    @requestBody() credentials: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await this.authApiService.register(credentials);

    this.httpResponse.status(result.statusCode);
    return result.body;
  }

  @post('/api/auth/login')
  @response(200, {
    description: 'Login successful',
  })
  async login(
    @requestBody() credentials: Record<string, unknown>,
  ): Promise<unknown> {
    const result = await this.authApiService.login(credentials);

    this.httpResponse.status(result.statusCode);
    return result.body;
  }

  @get('/api/auth/arc/login')
  @response(302, {
    description: 'Redirect to configured external identity provider',
  })
  async arcLogin(): Promise<unknown> {
    const result = await this.authApiService.arcLogin();
    return this.forwardArcResult(result);
  }

  @get('/api/auth/arc/callback')
  @response(200, {description: 'Complete external authentication'})
  async arcCallback(): Promise<unknown> {
    const binding = (this.httpRequest.headers.cookie ?? '')
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith('bms_arc_binding='));
    const result = await this.authApiService.arcCallback(
      this.httpRequest.url,
      binding,
    );
    return this.forwardArcResult(result);
  }

  private forwardArcResult(result: {
    statusCode: number;
    body: unknown;
    headers?: Record<string, string>;
  }): unknown {
    this.httpResponse.status(result.statusCode);
    for (const [name, value] of Object.entries(result.headers ?? {})) {
      this.httpResponse.setHeader(name, value);
    }
    if (
      typeof result.body === 'string' &&
      result.headers?.['content-type']?.includes('application/json')
    ) {
      try {
        return JSON.parse(result.body) as unknown;
      } catch {
        throw new Error('Auth Service returned an invalid response');
      }
    }
    return result.body;
  }
}
