import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      table: 'books',
    },
    // Enforce ISBN uniqueness. The index name intentionally matches the
    // existing database constraint (`books_book_isbn_key`) so that LoopBack's
    // non-destructive `alter` migration recognizes it as already present and
    // leaves the existing UNIQUE constraint untouched.
    indexes: {
      books_book_isbn_key: {
        keys: {book_isbn: 1},
        options: {unique: true},
      },
    },
  },
})
export class Book extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  book_id?: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      errorMessage: {
        minLength: 'title must not be empty',
      },
    },
  })
  title: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      pattern: '^\\d{10}$',
      errorMessage: {
        pattern: 'book_isbn must be exactly 10 digits',
      },
    },
  })
  book_isbn: string;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      type: 'integer',
      minimum: 1000,
      maximum: 2026,
      errorMessage: {
        type: 'published_year must be an integer',
        minimum: 'published_year must be a valid year',
        maximum: 'published_year must not be in the future (max 2026)',
      },
    },
  })
  published_year: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['printed book', 'ebook'],
      errorMessage: {
        enum: "book_type must be either 'printed book' or 'ebook'",
      },
    },
  })
  book_type: string;

  @property({
    type: 'number',
    jsonSchema: {
      type: 'integer',
      minimum: 1,
      errorMessage: {
        type: 'page_count must be an integer',
        minimum: 'page_count must be greater than 0',
      },
    },
  })
  page_count?: number;

  @property({
    type: 'number',
    postgresql: {
      dataType: 'DECIMAL',
      dataPrecision: 10,
      dataScale: 2,
    },
    jsonSchema: {
      exclusiveMinimum: 0,
      errorMessage: {
        exclusiveMinimum: 'file_size must be greater than 0',
      },
    },
  })
  file_size?: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      type: 'integer',
      errorMessage: {
        type: 'author_id must be an integer',
      },
    },
  })
  author_id: number;

  @property({
    type: 'number',
    required: true,
    jsonSchema: {
      type: 'integer',
      errorMessage: {
        type: 'category_id must be an integer',
      },
    },
  })
  category_id: number;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  created_at?: Date;

  constructor(data?: Partial<Book>) {
    super(data);
  }
}

export interface BookRelations {}

export type BookWithRelations = Book & BookRelations;
