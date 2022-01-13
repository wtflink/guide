import mockKnex from 'mock-knex';

import knex from '../../knex';

import { up, down } from '../20220110150635_create-trails-table';

let tracker: mockKnex.Tracker;

beforeAll(() => {
  mockKnex.mock(knex);
  tracker = mockKnex.getTracker();
});

beforeEach(() => {
  tracker.install();
});

afterEach(() => {
  tracker.uninstall();
});

function setupMockQuery({ responses = {} }: Record<string, any> = {}) {
  const sql: string[] = [];

  tracker.on('query', (query) => {
    let boundSQL = query.sql;

    if (query.bindings) {
      query.bindings.forEach((_: any, i: number) => {
        boundSQL = boundSQL.replace(`$${i + 1}`, '?');
      });
    }

    const rawQuery = knex.raw(boundSQL, query.bindings).toString();

    sql.push(rawQuery);

    const response = responses[rawQuery];

    query.response(response || []);
  });

  return {
    getSQL: () => sql.join(` \n`),
  };
}

describe('#up', () => {
  it('should match SQL snapshot', async () => {
    const { getSQL } = setupMockQuery();

    await up(knex);

    expect(getSQL()).toMatchSnapshot();
  });
});

describe('#down', () => {
  it('should match SQL snapshot', async () => {
    const { getSQL } = setupMockQuery();

    await down(knex);

    expect(getSQL()).toMatchSnapshot();
  });
});
