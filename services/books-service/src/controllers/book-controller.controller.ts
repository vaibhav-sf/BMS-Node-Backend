import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
  Response,
  RestBindings,
} from '@loopback/rest';

import {Book} from '../models';
import {BookRepository} from '../repositories';

// PostgreSQL error codes surfaced by loopback-connector-postgresql.
const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';
const PG_NOT_NULL_VIOLATION = '23502';

/**
 * Translate low-level PostgreSQL driver errors into safe HTTP errors without
 * leaking raw database internals (constraint names, SQL, etc.) to the client.
 */
function rethrowDbError(err: unknown): never {
  const code = (err as {code?: string}).code;
  if (code === PG_UNIQUE_VIOLATION) {
    throw new HttpErrors.Conflict('book_isbn already exists');
  }
  if (code === PG_CHECK_VIOLATION) {
    throw new HttpErrors.UnprocessableEntity(
      'one or more fields violate a data constraint',
    );
  }
  if (code === PG_NOT_NULL_VIOLATION) {
    throw new HttpErrors.UnprocessableEntity('a required field is missing');
  }
  throw err;
}

export class BookController {
  constructor(
    @repository(BookRepository)
    public bookRepository: BookRepository,
    @inject(RestBindings.Http.RESPONSE)
    private httpResponse: Response,
  ) {}

  /**
   * Create a new book
   */
  @post('/books')
  @response(201, {
    description: 'Book model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Book),
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Book, {
            title: 'NewBook',
            exclude: ['book_id'],
          }),
        },
      },
    })
    book: Omit<Book, 'book_id'>,
  ): Promise<Book> {
    try {
      const created = await this.bookRepository.create(book);
      // Force the actual HTTP status to 201, not only the OpenAPI metadata.
      this.httpResponse.status(201);
      return created;
    } catch (err) {
      rethrowDbError(err);
    }
  }

  /**
   * Get the total number of books
   */
  @get('/books/count')
  @response(200, {
    description: 'Book model count',
    content: {
      'application/json': {
        schema: CountSchema,
      },
    },
  })
  async count(@param.where(Book) where?: Where<Book>): Promise<Count> {
    return this.bookRepository.count(where);
  }

  /**
   * Get all books
   */
  @get('/books')
  @response(200, {
    description: 'Array of Book model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Book),
        },
      },
    },
  })
  async find(@param.filter(Book) filter?: Filter<Book>): Promise<Book[]> {
    return this.bookRepository.find(filter);
  }

  /**
   * Update multiple books matching a condition
   */
  @patch('/books')
  @response(200, {
    description: 'Book PATCH success count',
    content: {
      'application/json': {
        schema: CountSchema,
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Book, {
            partial: true,
          }),
        },
      },
    })
    book: Book,
    @param.where(Book) where?: Where<Book>,
  ): Promise<Count> {
    try {
      return await this.bookRepository.updateAll(book, where);
    } catch (err) {
      rethrowDbError(err);
    }
  }

  /**
   * Get a single book by ID
   */
  @get('/books/{id}')
  @response(200, {
    description: 'Book model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Book),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Book, {exclude: 'where'})
    filter?: FilterExcludingWhere<Book>,
  ): Promise<Book> {
    return this.bookRepository.findById(id, filter);
  }

  /**
   * Partially update a book by ID
   */
  @patch('/books/{id}')
  @response(204, {
    description: 'Book PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Book, {
            partial: true,
          }),
        },
      },
    })
    book: Book,
  ): Promise<void> {
    try {
      await this.bookRepository.updateById(id, book);
    } catch (err) {
      rethrowDbError(err);
    }
  }

  /**
   * Replace a book by ID
   */
  @put('/books/{id}')
  @response(204, {
    description: 'Book PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Book),
        },
      },
    })
    book: Book,
  ): Promise<void> {
    try {
      await this.bookRepository.replaceById(id, book);
    } catch (err) {
      rethrowDbError(err);
    }
  }

  /**
   * Delete a book by ID
   */
  @del('/books/{id}')
  @response(204, {
    description: 'Book DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.bookRepository.deleteById(id);
  }
}
