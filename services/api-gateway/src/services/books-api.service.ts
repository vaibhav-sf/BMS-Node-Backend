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

  private throwUpstreamError(status: number): never {
    const error = new Error('Books Service returned an error') as Error & {
      statusCode: number;
    };
    error.statusCode = status;
    throw error;
  }

  private rethrowRequestError(error: unknown): never {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new HttpErrors.GatewayTimeout('Books Service request timed out');
    }
    throw new HttpErrors.BadGateway('Books Service is unavailable');
  }

  private async readJson(response: globalThis.Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new HttpErrors.BadGateway(
        'Books Service returned an invalid response',
      );
    }
  }

  async getBooks(): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/books`);
    } catch (error) {
      this.rethrowRequestError(error);
    }

    if (!response.ok) {
      this.throwUpstreamError(response.status);
    }

    return this.readJson(response);
  }
  async getBookById(bookId: number): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/books/${bookId}`);
    } catch (error) {
      this.rethrowRequestError(error);
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (!response.ok) {
      this.throwUpstreamError(response.status);
    }

    return this.readJson(response);
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
    } catch (error) {
      this.rethrowRequestError(error);
    }

    if (!response.ok) {
      if (response.status === 400) {
        throw new HttpErrors.BadRequest('Books Service rejected the request');
      }

      if (response.status === 409) {
        throw new HttpErrors.Conflict('Book conflicts with existing data');
      }

      if (response.status >= 400 && response.status <= 599) {
        if (response.status === 422) {
          throw new HttpErrors.UnprocessableEntity('Book data is invalid');
        }
        this.throwUpstreamError(response.status);
      }
      throw new HttpErrors.BadGateway(
        'Books Service returned an invalid response',
      );
    }

    return this.readJson(response);
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
    } catch (error) {
      this.rethrowRequestError(error);
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (!response.ok) {
      this.throwUpstreamError(response.status);
    }
    if (response.status === 204) {
      return this.getBookById(bookId);
    }

    return this.readJson(response);
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
    } catch (error) {
      this.rethrowRequestError(error);
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Book ${bookId} not found`);
    }

    if (!response.ok) {
      this.throwUpstreamError(response.status);
    }
  }
}
