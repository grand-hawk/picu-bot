import { log } from '@/pino';
import { commands } from '@/services/bot/commands';
import { nowReady } from '@/services/server';

import type { ClientEvents } from 'discord.js';

export const event = 'ready' as const satisfies keyof ClientEvents;

export const handleEvent: (
  ...args: ClientEvents[typeof event]
) => unknown = async (client) => {
  try {
    const registered = await client.application.commands.set(
      [...commands.values()].flatMap(({ data, aliases }) => {
        const json = data.toJSON();
        return [
          json,
          ...(aliases ?? []).map((alias) => ({ ...json, name: alias })),
        ];
      }),
    );
    log.info(`Registered ${registered.size} application commands`);
  } catch (err) {
    log.error(err, 'Failed to register application commands');
  }

  log.info('Client ready');
  nowReady();
};
