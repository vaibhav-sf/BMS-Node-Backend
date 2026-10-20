/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database and API snake_case contracts. */
import {repository} from '@loopback/repository';
import {
  HttpErrors,
  post,
  requestBody,
  response,
  Response,
  RestBindings,
} from '@loopback/rest';
import {hash, compare} from 'bcryptjs';
import {sign} from 'jsonwebtoken';
import {UserRepository} from '../repositories';
import {inject} from '@loopback/core';

interface RegisterRequest {
  email: string;
  password: string;
}

interface PublicUser {
  user_id?: number;
  email: string;
  role: string;
  created_at?: Date;
}

export class AuthController {
  constructor(
    @repository(UserRepository)
    private readonly userRepository: UserRepository,
    @inject(RestBindings.Http.RESPONSE)
    private readonly httpResponse: Response,
  ) {}

  @post('/auth/register')
  @response(201, {
    description: 'User registered successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user_id: {type: 'number'},
            email: {type: 'string'},
            role: {type: 'string'},
            created_at: {type: 'string', format: 'date-time'},
          },
        },
      },
    },
  })
  async register(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            additionalProperties: false,
            properties: {
              email: {
                type: 'string',
                format: 'email',
                maxLength: 254,
              },
              password: {
                type: 'string',
                minLength: 8,
                maxLength: 72,
              },
            },
          },
        },
      },
    })
    credentials: RegisterRequest,
  ): Promise<PublicUser> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (
      email.length === 0 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new HttpErrors.BadRequest('A valid email address is required.');
    }

    if (typeof password !== 'string' || password.length < 8) {
      throw new HttpErrors.BadRequest(
        'Password must contain at least 8 characters.',
      );
    }

    // bcrypt processes at most 72 bytes of password input.
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new HttpErrors.BadRequest(
        'Password must not exceed 72 UTF-8 bytes.',
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: {email},
    });

    if (existingUser) {
      throw new HttpErrors.Conflict(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await hash(password, 12);

    try {
      const user = await this.userRepository.create({
        email,
        passwordHash,
        role: 'USER',
      });

      this.httpResponse.status(201);

      return {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      };
    } catch (error) {
      // Handle concurrent registration attempts against the unique index.
      const databaseError = error as {code?: string};

      if (databaseError.code === '23505') {
        throw new HttpErrors.Conflict(
          'An account with this email already exists.',
        );
      }

      throw error;
    }
  }
  @post('/auth/login')
  @response(200, {
    description: 'Login successful',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            access_token: {type: 'string'},
            token_type: {type: 'string'},
            expires_in: {type: 'number'},
          },
        },
      },
    },
  })
  async login(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            additionalProperties: false,
            properties: {
              email: {
                type: 'string',
                format: 'email',
                maxLength: 254,
              },
              password: {
                type: 'string',
                minLength: 1,
                maxLength: 72,
              },
            },
          },
        },
      },
    })
    credentials: RegisterRequest,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    user: PublicUser;
  }> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new HttpErrors.BadRequest('Invalid credentials.');
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
      throw new HttpErrors.InternalServerError(
        'Authentication service is not configured.',
      );
    }

    const user = await this.userRepository.findOne({
      where: {email},
    });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new HttpErrors.Unauthorized('Invalid email or password.');
    }

    const accessToken = sign(
      {
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        subject: String(user.user_id),
        expiresIn: '15m',
        issuer: 'bms-auth-service',
        audience: 'bms-api',
      },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    };
  }
}
