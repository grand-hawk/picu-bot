import express from 'express';

import { env } from '@/env';
import { log } from '@/pino';

const app = express();

let isReady = false;

app.get('/healthcheck', (_, res) => res.status(isReady ? 200 : 503).send('OK'));

app.listen(env.PORT, '0.0.0.0', () =>
  log.info(`Server listening on 0.0.0.0:${env.PORT}`),
);

export function nowReady() {
  isReady = true;
  log.info('Server now ready');
}
