import { EmbedBuilder, SlashCommandBuilder, escapeMarkdown } from 'discord.js';

import { createCommand } from '@/commands';

export const command = createCommand({
  data: new SlashCommandBuilder().setName('help').setDescription('Help'),
  aliases: ['cmds'],
  async handleCommand(interaction, commands) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setTitle('Commands').setFields(
          [...commands.values()].map(({ data, aliases }) => ({
            name: 'description' in data ? `/${data.name}` : data.name,
            value:
              ('description' in data
                ? escapeMarkdown(data.description)
                : 'Available from a message\'s "Apps" menu') +
              (aliases?.length
                ? `\nAliases: ${aliases.map((alias) => `/${alias}`).join(', ')}`
                : ''),
          })),
        ),
      ],
      ephemeral: true,
    });
  },
});
