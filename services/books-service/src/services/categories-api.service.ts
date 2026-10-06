import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

export interface RemoteCategory {
  category_id: number;
  category_name: string;
  created_at?: string;
}

@injectable({scope: BindingScope.SINGLETON})
export class CategoriesApiService {
  private readonly baseUrl =
    process.env.CATEGORIES_SERVICE_URL ?? 'http://127.0.0.1:3003';

  async getCategoryById(categoryId: number): Promise<RemoteCategory> {
    let response: globalThis.Response;

    try {
      response = await fetch(`${this.baseUrl}/categories/${categoryId}`);
    } catch {
      throw new HttpErrors.BadGateway('Categories Service is unavailable');
    }

    if (response.status === 404) {
      throw new HttpErrors.UnprocessableEntity(
        `category_id ${categoryId} does not exist`,
      );
    }

    if (!response.ok) {
      throw new HttpErrors.BadGateway(
        'Categories Service returned an unexpected response',
      );
    }

    return (await response.json()) as RemoteCategory;
  }
}
