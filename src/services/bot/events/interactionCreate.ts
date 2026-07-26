import { handleSaveModal } from '@/commands/saveMessage';
import { log } from '@/pino';
import { commands } from '@/services/bot/commands';

import type { ClientEvents } from 'discord.js';

export const event = 'interactionCreate' as const satisfies keyof ClientEvents;

export const handleEvent: (
  ...args: ClientEvents[typeof event]
) => unknown = async (interaction) => {
  if (!interaction.inCachedGuild()) return;

  if (interaction.isModalSubmit()) return handleSaveModal(interaction);
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  log.info(
    `Command "${interaction.commandName}" ran by ${interaction.user.id}`,
  );

  try {
    await command.handleCommand(interaction, commands, {});
  } catch (err) {
    log.error(err, `Error handling command "${interaction.commandName}"`);
  }
};
