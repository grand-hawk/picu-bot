import { log } from '@/pino';
import { nowReady } from '@/services/server';

import type { ClientEvents } from 'discord.js';

export const event = 'ready' as const satisfies keyof ClientEvents;

export const handleEvent: (
  ...args: ClientEvents[typeof event]
) => unknown = async (_client) => {
  log.info('Client ready');
  nowReady();
};
