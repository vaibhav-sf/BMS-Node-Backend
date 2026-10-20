import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSourceDataSource} from '../datasources';
import {ExternalIdentity, ExternalIdentityRelations} from '../models';
export class ExternalIdentityRepository extends DefaultCrudRepository<
  ExternalIdentity,
  typeof ExternalIdentity.prototype.external_identity_id,
  ExternalIdentityRelations
> {
  constructor(
    @inject('datasources.DbDataSource')
    dataSource: DbDataSourceDataSource,
  ) {
    super(ExternalIdentity, dataSource);
  }
}
