import mockKnex from 'mock-knex';
import mockdate from 'mockdate';

import { getTrailUrl, getNonExistedTrailId, createTrail } from '../utils';
import knex from '../knex';
import redis from '../redis';
import {
  TEST_ID,
  TEST_URL,
  TEST_EXPIRE_AT,
  GENERATED_TRAIL_ID_1,
  GENERATED_TRAIL_ID_2,
} from '../../test/constants';

mockdate.set('2022-01-13');

jest.mock('../redis');
const mockedRedis = jest.mocked(redis, true);

let tracker: mockKnex.Tracker;

beforeAll(() => {
  mockKnex.mock(knex);
  tracker = mockKnex.getTracker();
});

beforeEach(() => {
  jest.clearAllMocks();
  tracker.install();
});

afterEach(() => {
  tracker.uninstall();
});

describe('#getTrailUrl', () => {
  it('should get cached url from redis if existed.', async () => {
    mockedRedis.get.mockResolvedValue(TEST_URL);

    const trailUrl = await getTrailUrl(TEST_ID);

    expect(trailUrl).toEqual(TEST_URL);
    expect(mockedRedis.get).toBeCalledWith(TEST_ID);
  });

  it('should get cached url from database if existed, and cache it with url and expired time.', async () => {
    mockedRedis.get.mockResolvedValue(null);

    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [TEST_ID],
          });

          query.response([
            {
              url: TEST_URL,
              expire_at: TEST_EXPIRE_AT,
            },
          ]);
        },
      ][step - 1]();
    });

    const trailUrl = await getTrailUrl(TEST_ID);

    const expireTime = Math.round(
      (TEST_EXPIRE_AT.getTime() - new Date().getTime()) / 1000
    );

    expect(trailUrl).toEqual(TEST_URL);
    expect(mockedRedis.get).toBeCalledWith(TEST_ID);
    expect(mockedRedis.setex).toHaveBeenCalledWith(
      TEST_ID,
      expireTime,
      TEST_URL
    );
  });

  it('should return null if none url found by querying given id.', async () => {
    mockedRedis.get.mockResolvedValue(null);

    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [TEST_ID],
          });

          query.response([]);
        },
      ][step - 1]();
    });

    const trailUrl = await getTrailUrl(TEST_ID);

    expect(trailUrl).toEqual(null);
    expect(mockedRedis.get).toBeCalledWith(TEST_ID);
    expect(mockedRedis.setex).not.toHaveBeenCalled();
  });
});

describe('#getNonExistedTrailId', () => {
  it('should retry when generated id existed in cache.', async () => {
    mockedRedis.get.mockImplementation(async (id) => {
      if (id === GENERATED_TRAIL_ID_1) return TEST_URL;
      return null;
    });

    tracker.on('query', (query) => {
      query.response([]);
    });

    const trailIdGenerator = jest
      .fn()
      .mockReturnValueOnce(GENERATED_TRAIL_ID_1)
      .mockReturnValueOnce(GENERATED_TRAIL_ID_2);

    expect(await getNonExistedTrailId(trailIdGenerator)).toEqual(
      GENERATED_TRAIL_ID_2
    );
    expect(trailIdGenerator).toHaveBeenCalledTimes(2);
    expect(mockedRedis.get.mock.calls[0][0]).toBe(GENERATED_TRAIL_ID_1);
    expect(mockedRedis.get.mock.calls[1][0]).toBe(GENERATED_TRAIL_ID_2);
  });

  it('should retry when generated id existed in database.', async () => {
    mockedRedis.get.mockResolvedValue(null);

    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [GENERATED_TRAIL_ID_1],
          });

          query.response([
            {
              url: TEST_URL,
              expire_at: TEST_EXPIRE_AT,
            },
          ]);
        },
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [GENERATED_TRAIL_ID_2],
          });

          query.response([]);
        },
      ][step - 1]();
    });

    const trailIdGenerator = jest
      .fn()
      .mockReturnValueOnce(GENERATED_TRAIL_ID_1)
      .mockReturnValueOnce(GENERATED_TRAIL_ID_2);

    expect(await getNonExistedTrailId(trailIdGenerator)).toEqual(
      GENERATED_TRAIL_ID_2
    );
    expect(trailIdGenerator).toHaveBeenCalledTimes(2);
    expect(mockedRedis.get.mock.calls[0][0]).toBe(GENERATED_TRAIL_ID_1);
    expect(mockedRedis.get.mock.calls[1][0]).toBe(GENERATED_TRAIL_ID_2);
  });

  it('should not retry when generated id not existed in cache or database.', async () => {
    mockedRedis.get.mockResolvedValue(null);

    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [GENERATED_TRAIL_ID_1],
          });

          query.response([]);
        },
        () => {
          expect(query).toMatchObject({
            sql: 'select "url", "expire_at" from "trails" where "id" = $1 and ("expire_at" > CURRENT_TIMESTAMP or "expire_at" is null)',
            bindings: [GENERATED_TRAIL_ID_2],
          });

          query.response([]);
        },
      ][step - 1]();
    });

    const trailIdGenerator = jest
      .fn()
      .mockReturnValueOnce(GENERATED_TRAIL_ID_1)
      .mockReturnValueOnce(GENERATED_TRAIL_ID_2);

    expect(await getNonExistedTrailId(trailIdGenerator)).toEqual(
      GENERATED_TRAIL_ID_1
    );
    expect(trailIdGenerator).toHaveBeenCalledTimes(1);
    expect(mockedRedis.get).toBeCalledWith(GENERATED_TRAIL_ID_1);
  });
});

describe('#createTrail', () => {
  it('should create both db and redis record without expireAt.', async () => {
    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'insert into "trails" ("expire_at", "id", "url") values (DEFAULT, $1, $2) on conflict ("id") do nothing returning "id", "expire_at"',
            bindings: [TEST_ID, TEST_URL],
          });

          query.response([
            {
              id: TEST_ID,
              url: TEST_URL,
            },
          ]);
        },
      ][step - 1]();
    });

    const trail = await createTrail({
      id: TEST_ID,
      url: TEST_URL,
    });

    const expireTime = Number(process.env.DEFAULT_CACHE_EXPIRE_IN_SEC);

    expect(trail).toEqual({
      id: TEST_ID,
      url: TEST_URL,
    });
    expect(mockedRedis.setex).toHaveBeenCalledWith(
      TEST_ID,
      expireTime,
      TEST_URL
    );
  });

  it('should create both db and redis record with expireAt.', async () => {
    tracker.on('query', (query, step) => {
      [
        () => {
          expect(query).toMatchObject({
            sql: 'insert into "trails" ("expire_at", "id", "url") values ($1, $2, $3) on conflict ("id") do nothing returning "id", "expire_at"',
            bindings: [TEST_EXPIRE_AT, TEST_ID, TEST_URL],
          });

          query.response([
            {
              id: TEST_ID,
              url: TEST_URL,
              expire_at: TEST_EXPIRE_AT,
            },
          ]);
        },
      ][step - 1]();
    });

    const trail = await createTrail({
      id: TEST_ID,
      url: TEST_URL,
      expireAt: TEST_EXPIRE_AT,
    });

    const expireTime = Math.round(
      (TEST_EXPIRE_AT.getTime() - new Date().getTime()) / 1000
    );

    expect(trail).toEqual({
      id: TEST_ID,
      url: TEST_URL,
      expireAt: TEST_EXPIRE_AT,
    });
    expect(mockedRedis.setex).toHaveBeenCalledWith(
      TEST_ID,
      expireTime,
      TEST_URL
    );
  });
});
