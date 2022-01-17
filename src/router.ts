import Router, { RouterContext } from '@koa/router';
import compose from 'koa-compose';
import validator, { Joi } from 'koa-context-validator';

import {
  getTrailUrl,
  getNonExistedTrailId,
  trailIdGenerator,
  createTrail,
  AVAILABLE_CHARACTERS,
} from './utils';

const { GUIDE_ORIGIN } = process.env;

const router = new Router();

router.get('/', (ctx) => {
  ctx.status = 404;
});

router.get(
  '/:trail_id',
  compose([
    validator({
      params: Joi.object().keys({
        trail_id: Joi.string().regex(
          new RegExp(`^[${AVAILABLE_CHARACTERS}]+$`)
        ),
      }),
    }),
    async (ctx: RouterContext) => {
      const { trail_id: trailId } = ctx.params;

      const trailUrl = await getTrailUrl(trailId);

      if (!trailUrl) {
        ctx.status = 404;
        return;
      }

      ctx.redirect(trailUrl);
    },
  ])
);

router.post(
  '/api/v1/create_trail',
  compose([
    validator({
      body: Joi.object().keys({
        url: Joi.string().uri().required(),
        expireAt: Joi.date().iso().greater('now'),
      }),
    }),
    async (ctx: RouterContext) => {
      const { url, expireAt: _expireAt } = ctx.request.body;
      const expireAt = _expireAt ? new Date(_expireAt) : null;

      const trailId = await getNonExistedTrailId(trailIdGenerator);

      const trail = await createTrail({ id: trailId, url, expireAt });

      ctx.body = {
        id: trail.id,
        shortUrl: `${GUIDE_ORIGIN}/${trail.id}`,
        expireAt: trail.expireAt,
      };
      ctx.status = 200;
    },
  ])
);

export default router;
