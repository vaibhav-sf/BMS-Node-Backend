import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import 'dotenv/config';

const config = {
  name: 'DbDataSource',
  connector: 'postgresql',
  url: '',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? 'authors_db',
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbDataSourceDataSource
  extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName = 'DbDataSource';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.DbDataSource', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
