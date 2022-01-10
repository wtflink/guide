import { knex as _knex } from 'knex';

import config from './knexfile';

const knex = _knex(config);

export default knex;
