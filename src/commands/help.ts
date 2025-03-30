import { EmbedBuilder, escapeMarkdown } from 'discord.js';

import { env } from '@/env';
import { commands } from '@/services/bot/events/messageCreate';

import type { MessageCommand } from '@/commands';
import type { APIEmbedField } from 'discord.js';

export const command: MessageCommand = {
  command: 'help',
  aliases: ['cmds'],
  description: 'Help',
  async handleCommand(message) {
    const fields: APIEmbedField[] = [];

    for (const [, commandModule] of commands)
      fields.push({
        name: `${env.COMMAND_PREFIX}${commandModule.command}`,
        value:
          `Aliases: ${commandModule.aliases?.length ? commandModule.aliases.map((alias) => `\`${env.COMMAND_PREFIX}${alias}\``).join(', ') : 'None'}` +
          `\nDescription: ${commandModule.description ? escapeMarkdown(commandModule.description) : 'None'}`,
      });

    return message.reply({
      embeds: [new EmbedBuilder().setTitle('Commands').setFields(fields)],
    });
  },
};
