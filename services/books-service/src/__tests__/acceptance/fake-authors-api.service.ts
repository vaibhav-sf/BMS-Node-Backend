import {injectable} from '@loopback/core';
import {RemoteAuthor} from '../../services/authors-api.service';
import {HttpErrors} from '@loopback/rest';

@injectable()
export class FakeAuthorsApiService {
  async getAuthorById(authorId: number): Promise<RemoteAuthor> {
    if (authorId === 999999) {
      throw new HttpErrors.UnprocessableEntity(
        `author_id ${authorId} does not exist`,
      );
    }
    return {
      author_id: authorId,
      name: 'Test Author',
      email: 'test-author@example.com',
    };
  }
}
