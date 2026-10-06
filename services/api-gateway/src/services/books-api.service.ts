import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

@injectable({scope: BindingScope.SINGLETON})
export class BooksApiService {
  private readonly baseUrl =
    process.env.BOOKS_SERVICE_URL ?? 'http://127.0.0.1:3001';
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

  async getBooks(): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/books`);
    } catch {
      throw new HttpErrors.BadGateway('Books Service is unavailable');
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Books Service returned an unexpected response',
      );
    }

    return response.json();
  }
  async getBookById(bookId: number): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/books/${bookId}`);
    } catch {
      throw new HttpErrors.BadGateway('Books Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Books Service returned an unexpected response',
      );
    }

    return response.json();
  }
  async createBook(book: Record<string, unknown>): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(book),
      });
    } catch {
      throw new HttpErrors.BadGateway('Books Service is unavailable');
    }

    if (!response.ok) {
      let message = 'Books Service returned an unexpected response';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string; details?: unknown};
        };

        message = errorBody.error?.message ?? message;

        // Keep LoopBack's field-level validation errors when proxying the
        // response. Without these, clients only see the generic 422 message.
        if (errorBody.error?.details !== undefined) {
          message = `${message} ${JSON.stringify(errorBody.error.details)}`;
        }
      } catch {
        throw new HttpErrors.BadGateway('Books Service is unavailable');
      }

      if (response.status === 409) {
        throw new HttpErrors.Conflict(message);
      }

      if (response.status === 422) {
        throw new HttpErrors.UnprocessableEntity(message);
      }

      if (response.status === 400) {
        throw new HttpErrors.BadRequest(message);
      }

      throw new HttpErrors.BadGateway(message);
    }

    return response.json();
  }
  async updateBook(
    bookId: number,
    updates: Record<string, unknown>,
  ): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/books/${bookId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Books Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (response.status === 409) {
      let message = 'Book update conflicts with existing data';

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
      let message = 'Invalid book data';

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
        'Books Service returned an unexpected response',
      );
    }
    if (response.status === 204) {
      return this.getBookById(bookId);
    }

    return response.json();
  }
  async deleteBook(bookId: number): Promise<void> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/books/${bookId}`,
        {
          method: 'DELETE',
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Books Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Books Service returned an unexpected response',
      );
    }
  }
}
