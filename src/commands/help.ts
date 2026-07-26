import { EmbedBuilder, SlashCommandBuilder, escapeMarkdown } from 'discord.js';

import { createCommand } from '@/commands';

export const command = createCommand({
  data: new SlashCommandBuilder().setName('help').setDescription('Help'),
  async handleCommand(interaction, commands) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle('Commands').setFields(
          [...commands.values()].map(({ data }) => ({
            name: 'description' in data ? `/${data.name}` : data.name,
            value:
              'description' in data
                ? escapeMarkdown(data.description)
                : 'Available from a message\'s "Apps" menu',
          })),
        ),
      ],
      ephemeral: true,
    });
  },
});
