import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import koaPinoLogger from 'koa-pino-logger';

import errorHandler from './errorHandler';
import router from './router';
import getPinoLogger from './logger';

const createServer = (): Koa => {
  const server = new Koa();

  server.use(errorHandler);
  server.use(koaPinoLogger({ logger: getPinoLogger() }));
  server.use(bodyParser());
  server.use(router.routes());
  server.use(router.allowedMethods({ throw: true }));

  return server;
};

export default createServer;
