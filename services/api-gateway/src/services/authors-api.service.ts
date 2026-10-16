import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

@injectable({scope: BindingScope.SINGLETON})
export class AuthorsApiService {
  private readonly baseUrl =
    process.env.AUTHORS_SERVICE_URL ?? 'http://127.0.0.1:3002';
  private readonly requestTimeoutMs = 5000;

  private fetchWithTimeout(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });
  }

  async getAuthors(): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/authors`);
    } catch {
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }

    return response.json();
  }
  async getAuthorById(authorId: number): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/authors/${authorId}`,
      );
    } catch {
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Author ${authorId} not found`);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }

    return response.json();
  }
  async createAuthor(author: Record<string, unknown>): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/authors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(author),
      });
    } catch {
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (response.status === 409) {
      let message = 'Author already exists';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep default message.
      }

      throw new HttpErrors.Conflict(message);
    }

    if (response.status === 422) {
      let message = 'Invalid author data';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        throw new HttpErrors.UnprocessableEntity('Invalid author data');
      }

      throw new HttpErrors.UnprocessableEntity(message);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }

    return response.json();
  }
  async updateAuthor(
    authorId: number,
    updates: Record<string, unknown>,
  ): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/authors/${authorId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Author ${authorId} not found`);
    }

    if (response.status === 409) {
      let message = 'Author update conflicts with existing data';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep default message.
      }

      throw new HttpErrors.Conflict(message);
    }

    if (response.status === 422) {
      let message = 'Invalid author data';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep default message.
      }

      throw new HttpErrors.UnprocessableEntity(message);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }

    if (response.status === 204) {
      return this.getAuthorById(authorId);
    }

    return response.json();
  }
  async deleteAuthor(authorId: number): Promise<void> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/authors/${authorId}`,
        {
          method: 'DELETE',
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Authors Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Author ${authorId} not found`);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Authors Service returned an unexpected response',
      );
    }
  }
}
