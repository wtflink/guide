import { Middleware } from 'koa';
import Joi from 'joi';

const isDeveloping = process.env.NODE_ENV === 'development';

const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error: any) {
    if (error.status) {
      ctx.response.status = error.status;
    } else if (error.name === 'ValidationError') {
      const message = error?.details
        .map((detail: Joi.ValidationErrorItem) =>
          detail.message.includes('fails to match the required pattern: /')
            ? // removes the pattens for response body
              detail.message.split(':')[0]
            : detail.message
        )
        .join('\n');

      ctx.response.status = 400;
      ctx.response.body = { error: { message } };
    } else {
      ctx.response.status = 500;

      if (isDeveloping) {
        ctx.response.body = { error };
      }
    }

    ctx.app.emit('error', error, ctx);
  }
};

export default errorHandler;