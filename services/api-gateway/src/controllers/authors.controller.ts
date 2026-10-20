import {authorize} from '@loopback/authorization';
import {adminOnly} from '../authorization/admin-only.voter';
import {authenticate} from '@loopback/authentication';
import {service} from '@loopback/core';
import {get, post, del, param, patch, requestBody} from '@loopback/rest';
import {AuthorsApiService} from '../services/authors-api.service';

@authenticate('jwt')
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
  @authorize({voters: [adminOnly]})
  async createAuthor(
    @requestBody() author: Record<string, unknown>,
  ): Promise<unknown> {
    return this.authorsApiService.createAuthor(author);
  }
  @patch('/api/authors/{id}')
  @authorize({voters: [adminOnly]})
  async updateAuthor(
    @param.path.number('id') id: number,
    @requestBody() updates: Record<string, unknown>,
  ): Promise<unknown> {
    return this.authorsApiService.updateAuthor(id, updates);
  }
  @del('/api/authors/{id}')
  @authorize({voters: [adminOnly]})
  async deleteAuthor(@param.path.number('id') id: number): Promise<void> {
    await this.authorsApiService.deleteAuthor(id);
  }
}
