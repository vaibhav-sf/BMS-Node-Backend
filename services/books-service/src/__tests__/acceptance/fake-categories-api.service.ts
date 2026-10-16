import {injectable} from '@loopback/core';
import {RemoteCategory} from '../../services/categories-api.service';
import {HttpErrors} from '@loopback/rest';

@injectable()
export class FakeCategoriesApiService {
  async getCategoryById(categoryId: number): Promise<RemoteCategory> {
    if (categoryId === 999999) {
      throw new HttpErrors.UnprocessableEntity(
        `category_id ${categoryId} does not exist`,
      );
    }
    return {
      category_id: categoryId,
      category_name: 'Test Category',
    };
  }
}
