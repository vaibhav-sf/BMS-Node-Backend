/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database and API snake_case contracts. */
import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {
      table: 'users',
    },
    indexes: {
      uniqueEmail: {
        keys: {email: 1},
        options: {unique: true},
      },
    },
  },
})
export class User extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  user_id?: number;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      format: 'email',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      errorMessage: 'email must be a valid email address',
    },
  })
  email: string;

  @property({
    type: 'string',
    required: true,
  })
  passwordHash: string;

  @property({
    type: 'string',
    required: true,
    default: 'USER',
  })
  role: string;

  @property({
    type: 'date',
    defaultFn: 'now',
  })
  created_at?: Date;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
