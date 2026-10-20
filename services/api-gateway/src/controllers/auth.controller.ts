import {inject, service} from '@loopback/core';
import {
  post,
  requestBody,
  response,
  Response,
  RestBindings,
} from '@loopback/rest';
import {AuthApiService} from '../services/auth-api.service';

export class AuthController {
  constructor(
    @service(AuthApiService)
    private readonly authApiService: AuthApiService,

    @inject(RestBindings.Http.RESPONSE)
    private readonly httpResponse: Response,
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
}
