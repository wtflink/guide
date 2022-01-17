import mockdate from 'mockdate';
import Koa from 'koa';
import request from 'supertest';
import bodyParser from 'koa-bodyparser';

import router from '../router';
import errorHandler from '../errorHandler';
import { getTrailUrl, getNonExistedTrailId, createTrail } from '../utils';
import {
  TEST_ID,
  TEST_URL,
  TEST_EXPIRE_AT,
  INVALID_ID,
  TEST_EXPIRE_AT_ISO_STRING,
} from '../../test/constants';

mockdate.set('2022-01-13');

jest.mock('../utils');
const mockedGetTrailUrl = jest.mocked(getTrailUrl);
const mockedGetNonExistedTrailId = jest.mocked(getNonExistedTrailId);
const mockedCreateTrail = jest.mocked(createTrail);

function setup() {
  const app = new Koa();

  app.use(bodyParser());
  app.use(errorHandler);
  app.use(router.routes());

  return {
    app,
  };
}

describe('#GET /', () => {
  it('should return 404', async () => {
    const { app } = setup();

    const res = await request(app.callback()).get('/');

    expect(res.status).toEqual(404);
  });
});

describe('#GET /:trail_id', () => {
  it('should get redirect when found matched trailId', async () => {
    mockedGetTrailUrl.mockResolvedValue(TEST_URL);

    const { app } = setup();

    const res = await request(app.callback()).get(`/${TEST_ID}`);

    expect(mockedGetTrailUrl).toBeCalledWith(TEST_ID);
    expect(res.status).toEqual(302);
    expect(res.text).toEqual(
      'Redirecting to <a href="https://test.com">https://test.com</a>.'
    );
  });

  it('should return 404 when no matched trailId', async () => {
    mockedGetTrailUrl.mockResolvedValue(null);

    const { app } = setup();

    const res = await request(app.callback()).get(`/${TEST_ID}`);

    expect(mockedGetTrailUrl).toBeCalledWith(TEST_ID);
    expect(res.status).toEqual(404);
  });

  it('should return error when given invalid trailId', async () => {
    const { app } = setup();

    const res = await request(app.callback()).get(`/${INVALID_ID}`);

    expect(mockedGetTrailUrl).not.toBeCalledWith(INVALID_ID);
    expect(res.status).toEqual(400);
    expect(res.body).toEqual({
      error: {
        message: `"trail_id" with value "${INVALID_ID}" fails to match the required pattern`,
      },
    });
  });
});

describe('#POST /api/v1/create_trail', () => {
  it('should creat trail with given parameters', async () => {
    mockedGetNonExistedTrailId.mockResolvedValue(TEST_ID);
    mockedCreateTrail.mockResolvedValue({
      id: TEST_ID,
      url: TEST_URL,
      expireAt: TEST_EXPIRE_AT,
    });

    const { app } = setup();

    const res = await request(app.callback())
      .post('/api/v1/create_trail')
      .send({
        url: TEST_URL,
        expireAt: TEST_EXPIRE_AT_ISO_STRING,
      });

    expect(res.status).toEqual(200);
    expect(res.body).toEqual({
      id: TEST_ID,
      expireAt: TEST_EXPIRE_AT_ISO_STRING,
      shortUrl: `${process.env.GUIDE_ORIGIN}/${TEST_ID}`,
    });
  });

  it('should throw when expireAt is not greater than now', async () => {
    const yesterday = new Date('2022-01-12');

    const { app } = setup();

    const res = await request(app.callback())
      .post('/api/v1/create_trail')
      .send({
        url: TEST_URL,
        expireAt: yesterday,
      });

    expect(res.status).toEqual(400);
    expect(res.body).toEqual({
      error: {
        message: '"expireAt" must be greater than "now"',
      },
    });
  });
});
