import {injectable} from '@loopback/core';
import {RemoteAuthor} from '../../services/authors-api.service';

@injectable()
export class FakeAuthorsApiService {
  async getAuthorById(authorId: number): Promise<RemoteAuthor> {
    return {
      author_id: authorId,
      name: 'Test Author',
      email: 'test-author@example.com',
    };
  }
}
