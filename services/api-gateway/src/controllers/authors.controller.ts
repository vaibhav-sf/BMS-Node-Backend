import {service} from '@loopback/core';
import {get, post, del, param, patch, requestBody} from '@loopback/rest';
import {AuthorsApiService} from '../services/authors-api.service';

export class AuthorsController {
  constructor(
    @service(AuthorsApiService)
    private readonly authorsApiService: AuthorsApiService,
  ) {}

  @get('/api/authors')
  async getAuthors(): Promise<unknown> {
    return this.authorsApiService.getAuthors();
  }
  @get('/api/authors/{id}')
  async getAuthorById(@param.path.number('id') id: number): Promise<unknown> {
    return this.authorsApiService.getAuthorById(id);
  }
  @post('/api/authors')
  async createAuthor(
    @requestBody() author: Record<string, unknown>,
  ): Promise<unknown> {
    return this.authorsApiService.createAuthor(author);
  }
  @patch('/api/authors/{id}')
  async updateAuthor(
    @param.path.number('id') id: number,
    @requestBody() updates: Record<string, unknown>,
  ): Promise<unknown> {
    return this.authorsApiService.updateAuthor(id, updates);
  }
  @del('/api/authors/{id}')
  async deleteAuthor(@param.path.number('id') id: number): Promise<void> {
    await this.authorsApiService.deleteAuthor(id);
  }
}
