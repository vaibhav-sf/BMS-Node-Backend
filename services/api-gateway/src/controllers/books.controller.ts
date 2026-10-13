import {service} from '@loopback/core';
import {
  get,
  param,
  post,
  patch,
  del,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {inject} from '@loopback/core';
import {BooksApiService} from '../services/books-api.service';
import {logger} from '../services/logger.service';

export class BooksController {
  constructor(
    @service(BooksApiService)
    private readonly booksApiService: BooksApiService,
    @inject(RestBindings.Http.RESPONSE)
    private readonly response: Response,
  ) {}

  @get('/api/books')
  async getBooks(): Promise<unknown> {
    return this.booksApiService.getBooks();
  }
  @get('/api/books/{id}')
  async getBookById(@param.path.number('id') id: number): Promise<unknown> {
    return this.booksApiService.getBookById(id);
  }
  @post('/api/books')
  async createBook(
    @requestBody() book: Record<string, unknown>,
  ): Promise<unknown> {
    const createdBook = await this.booksApiService.createBook(book);
    logger.info('Book creation request completed');
    this.response.status(201);
    return createdBook;
  }
  @patch('/api/books/{id}')
  async updateBook(
    @param.path.number('id') id: number,
    @requestBody() updates: Record<string, unknown>,
  ): Promise<unknown> {
    return this.booksApiService.updateBook(id, updates);
  }
  @del('/api/books/{id}')
  async deleteBook(@param.path.number('id') id: number): Promise<void> {
    await this.booksApiService.deleteBook(id);
  }
}
