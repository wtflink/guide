import { customAlphabet } from 'nanoid';

import redis from './redis';
import knex from './knex';

const DEFAULT_CACHE_EXPIRE_IN_SEC = process.env.DEFAULT_CACHE_EXPIRE_IN_SEC
  ? Number(process.env.DEFAULT_CACHE_EXPIRE_IN_SEC)
  : 10;

const SHORT_ID_LENGTH = process.env.SHORT_ID_LENGTH
  ? Number(process.env.SHORT_ID_LENGTH)
  : 6;

export const AVAILABLE_CHARACTERS =
  '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const trailIdGenerator = customAlphabet(
  AVAILABLE_CHARACTERS,
  SHORT_ID_LENGTH
);

export const getTrailUrl = async (id: string) => {
  const cachedData = await redis.get(id);

  if (cachedData) {
    return cachedData;
  }

  const [trail] = await knex('trails')
    .select('url', 'expire_at')
    .where({ id })
    .where((qb) =>
      qb.where('expire_at', '>', knex.fn.now()).orWhereNull('expire_at')
    );

  if (trail) {
    const expireTimeInSec = trail.expire_at
      ? Math.round((trail.expire_at - new Date().getTime()) / 1000)
      : DEFAULT_CACHE_EXPIRE_IN_SEC;

    redis.setex(id, expireTimeInSec, trail.url);

    return trail.url;
  }

  return null;
};

export const getNonExistedTrailId = async (
  idGenerator: typeof trailIdGenerator
) => {
  let trailId = idGenerator();
  let existedTrailUrl = await getTrailUrl(trailId);

  while (existedTrailUrl) {
    trailId = idGenerator();

    // eslint-disable-next-line no-await-in-loop
    existedTrailUrl = await getTrailUrl(trailId);
  }

  return trailId;
};

export const createTrail = async ({
  id,
  url,
  expireAt,
}: {
  id: string;
  url: string;
  expireAt?: Date | null;
}) => {
  const [trail] = await knex('trails')
    .insert({
      id,
      url,
      expire_at: expireAt,
    })
    .onConflict('id')
    .ignore()
    .returning(['id', 'expire_at']);

  if (!trail) {
    // TODO: handle on conflict better
    throw new Error('trail id conflict');
  }

  const expireTimeInSec = trail.expire_at
    ? Math.round((trail.expire_at - new Date().getTime()) / 1000)
    : DEFAULT_CACHE_EXPIRE_IN_SEC;

  redis.setex(id, expireTimeInSec, trail.url);

  return {
    id,
    url,
    expireAt: trail.expire_at,
  };
};
