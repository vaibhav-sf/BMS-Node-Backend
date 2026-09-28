import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSourceDataSource} from '../datasources';
import {Author, AuthorRelations} from '../models';

export class AuthorRepository extends DefaultCrudRepository<
  Author,
  typeof Author.prototype.author_id,
  AuthorRelations
> {
  constructor(
    @inject('datasources.DbDataSource') dataSource: DbDataSourceDataSource,
  ) {
    super(Author, dataSource);
  }
}
