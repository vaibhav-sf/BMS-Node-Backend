import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSourceDataSource} from '../datasources';
import {Book, BookRelations} from '../models';

export class BookRepository extends DefaultCrudRepository<
  Book,
  typeof Book.prototype.book_id,
  BookRelations
> {
  constructor(
    @inject('datasources.DbDataSource') dataSource: DbDataSourceDataSource,
  ) {
    super(Book, dataSource);
  }
}
