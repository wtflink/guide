import { config } from 'dotenv';
import { Knex } from 'knex';

// load config for migrations;
config({ path: '../.env' });

const knexCofig: Knex.Config = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    timezone: 'utc',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    extension: 'ts',
    tableName: 'knex_migrations',
    directory: 'migrations',
  },
  debug: process.env.ENABLE_KNEX_DEBUG === 'true',
};

export default knexCofig;
