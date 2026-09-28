import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      table: 'authors',
    },
    // Enforce a database-level UNIQUE constraint on email through a unique
    // index. The PostgreSQL connector creates this index during migration.
    indexes: {
      uniqueEmail: {
        keys: {email: 1},
        options: {unique: true},
      },
    },
  },
})
export class Author extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  author_id?: number;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
    // A reasonable syntactic email-format check. This validates the shape of
    // the address only; it does NOT verify that the mailbox actually exists.
    jsonSchema: {
      format: 'email',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      errorMessage: 'email must be a valid email address',
    },
  })
  email: string;

  @property({
    type: 'string',
  })
  bio?: string;

  @property({
    type: 'date',
    // Populated automatically at creation time by LoopBack.
    defaultFn: 'now',
  })
  created_at?: Date;

  constructor(data?: Partial<Author>) {
    super(data);
  }
}

export interface AuthorRelations {}

export type AuthorWithRelations = Author & AuthorRelations;
