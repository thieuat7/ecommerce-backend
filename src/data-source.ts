import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'ecommerce',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  // Việc chạy migrations sẽ được thực hiện nhờ Knex, nên chúng ta không cần chỉ định migrations ở đây nữa
  //migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
