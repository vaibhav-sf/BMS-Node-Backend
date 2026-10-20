/* eslint-disable @typescript-eslint/naming-convention -- Preserve database column names. */
import {Entity, model, property} from '@loopback/repository';
@model({
  settings: {
    postgresql: {
      table: 'external_identities',
    },
    indexes: {
      uniqueIssuerSubject: {
        keys: {issuer: 1, subject: 1},
        options: {unique: true},
      },
      externalIdentityUserId: {
        keys: {user_id: 1},
      },
    },
    foreignKeys: {
      fk_external_identities_user: {
        name: 'fk_external_identities_user',
        entity: 'User',
        entityKey: 'user_id',
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
      },
    },
  },
})
export class ExternalIdentity extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  external_identity_id?: number;
  @property({
    type: 'number',
    required: true,
  })
  user_id: number;
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 100,
    },
  })
  provider: string;
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 2048,
    },
  })
  issuer: string;
  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      minLength: 1,
      maxLength: 255,
    },
  })
  subject: string;
  @property({
    type: 'date',
    defaultFn: 'now',
  })
  created_at?: Date;
  constructor(data?: Partial<ExternalIdentity>) {
    super(data);
  }
}
export interface ExternalIdentityRelations {
  // External identity relationship metadata can be added here.
}
export type ExternalIdentityWithRelations = ExternalIdentity &
  ExternalIdentityRelations;
