import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSourceDataSource} from '../datasources';
import {OAuthTransaction, OAuthTransactionRelations} from '../models';
export class OAuthTransactionRepository extends DefaultCrudRepository<
  OAuthTransaction,
  typeof OAuthTransaction.prototype.state_hash,
  OAuthTransactionRelations
> {
  constructor(
    @inject('datasources.DbDataSource')
    dataSource: DbDataSourceDataSource,
  ) {
    super(OAuthTransaction, dataSource);
  }
}
