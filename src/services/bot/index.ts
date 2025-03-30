import path from 'node:path';

import { Client, IntentsBitField } from 'discord.js';
import klaw from 'klaw';

import { env } from '@/env';
import { importPath } from '@/utils/importPath';

import type { EventModule } from '@/services/bot/events';

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

for await (const file of klaw('dist/services/bot/events')) {
  const basename = path.basename(file.path);
  if (!basename.endsWith('.js')) continue;
  if (basename.startsWith('_')) continue;

  const module: EventModule = await import(importPath(file.path));
  if (!module.event || !module.handleEvent) continue;

  client.on(module.event, module.handleEvent);
}

client.login(env.DISCORD_TOKEN);
