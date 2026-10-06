import {injectable} from '@loopback/core';
import {RemoteCategory} from '../../services/categories-api.service';

@injectable()
export class FakeCategoriesApiService {
  async getCategoryById(categoryId: number): Promise<RemoteCategory> {
    return {
      category_id: categoryId,
      category_name: 'Test Category',
    };
  }
}
