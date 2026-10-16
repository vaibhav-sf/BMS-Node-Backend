import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

@injectable({scope: BindingScope.SINGLETON})
export class CategoriesApiService {
  private readonly baseUrl =
    process.env.CATEGORIES_SERVICE_URL ?? 'http://127.0.0.1:3003';
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

  async getCategories(): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/categories`);
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Categories Service returned an unexpected response',
      );
    }

    return response.json();
  }

  async getCategoryById(categoryId: number): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/categories/${categoryId}`,
      );
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Category ${categoryId} not found`);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Categories Service returned an unexpected response',
      );
    }

    return response.json();
  }

  async createCategory(category: Record<string, unknown>): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(`${this.baseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
      });
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (!response.ok) {
      let message = 'Categories Service returned an unexpected response';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep the default message.
      }

      if (response.status === 404) {
        throw new HttpErrors.NotFound(message);
      }

      if (response.status === 409) {
        throw new HttpErrors.Conflict(message);
      }

      if (response.status === 422) {
        throw new HttpErrors.UnprocessableEntity(message);
      }

      throw new HttpErrors.BadGateway(message);
    }

    return response.json();
  }

  async updateCategory(
    categoryId: number,
    updates: Record<string, unknown>,
  ): Promise<unknown> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/categories/${categoryId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Category ${categoryId} not found`);
    }

    if (response.status === 409 || response.status === 422) {
      let message =
        response.status === 409
          ? 'Category update conflicts with existing data'
          : 'Invalid category data';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep the default message.
      }

      if (response.status === 409) {
        throw new HttpErrors.Conflict(message);
      }

      throw new HttpErrors.UnprocessableEntity(message);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Categories Service returned an unexpected response',
      );
    }

    if (response.status === 204) {
      return this.getCategoryById(categoryId);
    }

    return response.json();
  }

  async deleteCategory(categoryId: number): Promise<void> {
    let response: globalThis.Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.baseUrl}/categories/${categoryId}`,
        {
          method: 'DELETE',
        },
      );
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.NotFound(`Category ${categoryId} not found`);
    }

    if (response.status === 409) {
      let message = 'Category cannot be deleted';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep the default message.
      }

      throw new HttpErrors.Conflict(message);
    }

    if (response.status === 422) {
      let message = 'Invalid category data';

      try {
        const errorBody = (await response.json()) as {
          error?: {message?: string};
        };

        message = errorBody.error?.message ?? message;
      } catch {
        // Keep the default message.
      }

      throw new HttpErrors.UnprocessableEntity(message);
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Categories Service returned an unexpected response',
      );
    }
  }
}
