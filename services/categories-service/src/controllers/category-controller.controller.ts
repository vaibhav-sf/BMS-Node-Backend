import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
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
  Response,
  RestBindings,
  HttpErrors,
} from '@loopback/rest';
import {Category} from '../models';
import {CategoryRepository} from '../repositories';
import {inject} from '@loopback/core';
import {logger} from '../services/logger.service';

function validateCategoryName(categoryName: string): string {
  const trimmedName = categoryName.trim();

  if (!trimmedName) {
    throw new HttpErrors.UnprocessableEntity(
      'category_name cannot be empty or whitespace',
    );
  }

  return trimmedName;
}
export class CategoryController {
  constructor(
    @repository(CategoryRepository)
    public categoryRepository: CategoryRepository,
    @inject(RestBindings.Http.RESPONSE)
    private httpResponse: Response,
  ) {}

  @post('/categories')
  @response(201, {
    description: 'Category model instance',
    content: {'application/json': {schema: getModelSchemaRef(Category)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            title: 'NewCategory',
            exclude: ['category_id', 'created_at'],
          }),
        },
      },
    })
    category: Omit<Category, 'category_id' | 'created_at'>,
  ): Promise<Category> {
    const validatedCategoryName = validateCategoryName(category.category_name);

    const created = await this.categoryRepository.create({
      ...category,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      category_name: validatedCategoryName,
    });
    const savedCategory = await this.categoryRepository.findById(
      created.category_id!,
    );
    logger.info('Category created', {categoryId: savedCategory.category_id});
    this.httpResponse.status(201);
    return savedCategory;
  }

  @get('/categories/count')
  @response(200, {
    description: 'Category model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Category) where?: Where<Category>): Promise<Count> {
    return this.categoryRepository.count(where);
  }

  @get('/categories')
  @response(200, {
    description: 'Array of Category model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Category),
        },
      },
    },
  })
  async find(
    @param.filter(Category) filter?: Filter<Category>,
  ): Promise<Category[]> {
    return this.categoryRepository.find(filter);
  }

  @patch('/categories')
  @response(200, {
    description: 'Category PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            partial: true,
            exclude: ['category_id', 'created_at'],
          }),
        },
      },
    })
    category: Category,
    @param.where(Category) where?: Where<Category>,
  ): Promise<Count> {
    if (!where) {
      throw new HttpErrors.BadRequest(
        'A where filter is required for bulk category updates',
      );
    }

    if (category.category_name === undefined) {
      throw new HttpErrors.UnprocessableEntity(
        'category_name is required for category updates',
      );
    }

    const validatedCategoryName = validateCategoryName(category.category_name);

    return this.categoryRepository.updateAll(
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        category_name: validatedCategoryName,
      },
      where,
    );
  }

  @get('/categories/{id}')
  @response(200, {
    description: 'Category model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Category),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Category, {exclude: 'where'})
    filter?: FilterExcludingWhere<Category>,
  ): Promise<Category> {
    return this.categoryRepository.findById(id, filter);
  }

  @patch('/categories/{id}')
  @response(204, {
    description: 'Category PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            partial: true,
            exclude: ['category_id', 'created_at'],
          }),
        },
      },
    })
    category: Category,
  ): Promise<void> {
    if (category.category_name !== undefined) {
      const validatedCategoryName = validateCategoryName(
        category.category_name,
      );

      await this.categoryRepository.updateById(id, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        category_name: validatedCategoryName,
      });

      return;
    }

    await this.categoryRepository.updateById(id, {});
  }

  @put('/categories/{id}')
  @response(204, {description: 'Category PUT success'})
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Category, {
            exclude: ['category_id', 'created_at'],
          }),
        },
      },
    })
    category: Category,
  ): Promise<void> {
    const validatedCategoryName = validateCategoryName(category.category_name);

    const existingCategory = await this.categoryRepository.findById(id);

    await this.categoryRepository.replaceById(id, {
      ...existingCategory,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      category_name: validatedCategoryName,
    });
  }

  @del('/categories/{id}')
  @response(204, {
    description: 'Category DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.categoryRepository.deleteById(id);
  }
}
