import { SlashCommandBuilder } from 'discord.js';

import { createCommand } from '@/commands';
import { addGetOptions, command as getCommand } from '@/commands/get';
import { env } from '@/env';

export const command = createCommand({
  data: addGetOptions(
    new SlashCommandBuilder().setName('delete').setDescription('Delete media'),
  ),
  aliases: ['d', 'del'],
  async handleCommand(interaction, commands) {
    if (
      !env.DELETE_ROLES.some((roleId) =>
        interaction.member.roles.cache.get(roleId),
      )
    )
      return interaction.reply({
        content: 'You do not have permission to use this command!',
        ephemeral: true,
      });

    await getCommand.handleCommand(interaction, commands, {
      allowDeletion: true,
    });
  },
});
