import {logger} from '../services/logger.service';
import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import {Author} from '../models';
import {AuthorRepository} from '../repositories';

// PostgreSQL SQLSTATE for a unique-constraint violation.
const PG_UNIQUE_VIOLATION = '23505';

export class AuthorController {
  constructor(
    @repository(AuthorRepository)
    public authorRepository: AuthorRepository,
  ) {}

  @post('/authors')
  @response(200, {
    description: 'Author model instance',
    content: {'application/json': {schema: getModelSchemaRef(Author)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Author, {
            title: 'NewAuthor',
            exclude: ['author_id'],
          }),
        },
      },
    })
    author: Omit<Author, 'author_id'>,
  ): Promise<Author> {
    try {
      const createdAuthor = await this.authorRepository.create(author);

      logger.info('Author created', {
        authorId: createdAuthor.author_id,
      });

      return createdAuthor;
    } catch (err) {
      logger.error('Failed to create author', {
        error: err instanceof Error ? err.message : String(err),
      });
      // Surface a duplicate email (unique index violation) as 409 Conflict
      // instead of a generic 500.
      if (err.code === PG_UNIQUE_VIOLATION) {
        throw new HttpErrors.Conflict('email already exists');
      }
      throw err;
    }
  }

  @get('/authors')
  @response(200, {
    description: 'Array of Author model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Author, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(Author) filter?: Filter<Author>): Promise<Author[]> {
    const authors = await this.authorRepository.find(filter);

    logger.info('Authors fetched', {
      count: authors.length,
    });

    return authors;
  }

  @get('/authors/{id}')
  @response(200, {
    description: 'Author model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Author, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Author, {exclude: 'where'})
    filter?: FilterExcludingWhere<Author>,
  ): Promise<Author> {
    const author = await this.authorRepository.findById(id, filter);

    logger.info('Author fetched', {
      authorId: id,
    });

    return author;
  }
  @patch('/authors/{id}')
  @response(204, {
    description: 'Author PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Author, {partial: true}),
        },
      },
    })
    author: Author,
  ): Promise<void> {
    await this.authorRepository.updateById(id, author);
    logger.info('Author updated', {
      authorId: id,
    });
  }

  @put('/authors/{id}')
  @response(204, {
    description: 'Author PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() author: Author,
  ): Promise<void> {
    await this.authorRepository.replaceById(id, author);
    logger.info('Author replaced', {
      authorId: id,
    });
  }

  @del('/authors/{id}')
  @response(204, {
    description: 'Author DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.authorRepository.deleteById(id);
    logger.info('Author deleted', {
      authorId: id,
    });
  }
}
