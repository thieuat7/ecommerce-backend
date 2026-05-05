import { registerAs } from '@nestjs/config';

import { dataSourceOptions } from '../data-source';

export default registerAs('database', () => ({
  ...dataSourceOptions,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
}));
