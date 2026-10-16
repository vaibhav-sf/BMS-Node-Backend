import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

export interface RemoteAuthor {
  author_id: number;
  name: string;
  email: string;
  bio?: string;
  created_at?: string;
}

@injectable({scope: BindingScope.SINGLETON})
export class AuthorsApiService {
  private readonly requestTimeoutMs = 5000;
  private readonly baseUrl =
    process.env.AUTHORS_SERVICE_URL ?? 'http://127.0.0.1:3002';

  async getAuthorById(authorId: number): Promise<RemoteAuthor> {
    let response: globalThis.Response;

    try {
      response = await fetch(`${this.baseUrl}/authors/${authorId}`, {
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new HttpErrors.GatewayTimeout(
          'Authors Service request timed out',
        );
      }
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.UnprocessableEntity(
        `author_id ${authorId} does not exist`,
      );
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }

    return (await response.json()) as RemoteAuthor;
  }
}
