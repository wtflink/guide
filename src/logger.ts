import pino, { LoggerOptions, DestinationStream } from 'pino';

const loggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
};

export const getLogger = (config?: LoggerOptions | DestinationStream) =>
  pino({ ...loggerConfig, ...config });

export default getLogger;
