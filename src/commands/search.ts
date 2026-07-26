import { SlashCommandBuilder } from 'discord.js';

import { createCommand } from '@/commands';
import { addListOptions, command as getCommand } from '@/commands/get';

export const command = createCommand({
  data: addListOptions(
    new SlashCommandBuilder()
      .setName('search')
      .setDescription('Search media')
      .addStringOption((option) =>
        option
          .setName('query')
          .setDescription('Media name to search for')
          .setRequired(true),
      ),
  ),
  async handleCommand(interaction, commands) {
    await getCommand.handleCommand(interaction, commands, {
      search: true,
      searchValue: interaction.options.getString('query', true),
    });
  },
});
