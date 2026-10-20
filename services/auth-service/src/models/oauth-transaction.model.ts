/* eslint-disable @typescript-eslint/naming-convention -- Preserve database column names. */
import {Entity, model, property} from '@loopback/repository';
@model({
  settings: {
    postgresql: {
      table: 'oauth_transactions',
    },
  },
})
export class OAuthTransaction extends Entity {
  @property({
    type: 'string',
    id: true,
    required: true,
  })
  state_hash: string;
  @property({
    type: 'string',
    required: true,
  })
  provider: string;
  @property({
    type: 'string',
    required: true,
  })
  nonce: string;
  @property({
    type: 'string',
    required: true,
  })
  code_verifier: string;
  @property({
    type: 'string',
    required: true,
  })
  browser_binding_hash: string;
  @property({
    type: 'date',
    required: true,
  })
  expires_at: Date;
  @property({
    type: 'date',
  })
  consumed_at?: Date | null;
  @property({
    type: 'date',
    defaultFn: 'now',
  })
  created_at?: Date;
  constructor(data?: Partial<OAuthTransaction>) {
    super(data);
  }
}
export interface OAuthTransactionRelations {}
export type OAuthTransactionWithRelations = OAuthTransaction &
  OAuthTransactionRelations;
