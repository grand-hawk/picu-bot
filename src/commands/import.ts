import path from 'node:path';

import { SlashCommandBuilder } from 'discord.js';

import { createCommand } from '@/commands';
import { env } from '@/env';
import { importMediaFromFolder } from '@/lib/importMediaFromFolder';
import { log } from '@/pino';
import { safeStat } from '@/utils/safeStat';

export const command = createCommand({
  data: new SlashCommandBuilder()
    .setName('import')
    .setDescription('Import media from folder')
    .addStringOption((option) =>
      option.setName('path').setDescription('Folder path').setRequired(true),
    ),
  async handleCommand(interaction) {
    if (!env.ADMIN_USERS.some((userId) => interaction.user.id === userId))
      return interaction.reply({
        content: 'You do not have permission to use this command!',
        ephemeral: true,
      });

    const folderPath = interaction.options.getString('path', true);
    const resolvedPath = path.resolve(folderPath);
    const resolvedPathStat = await safeStat(resolvedPath);
    if (!resolvedPathStat || !resolvedPathStat.isDirectory())
      return interaction.reply({
        content: 'Invalid folder path!',
        ephemeral: true,
      });

    await interaction.deferReply();

    try {
      log.info(`Importing media from folder "${folderPath}"`);

      const importedMedia = await importMediaFromFolder(resolvedPath);
      return interaction.editReply(`Imported ${importedMedia.length} media!`);
    } catch (err) {
      log.error(err, `Failed to import media from folder "${folderPath}"`);
      return interaction.editReply('Failed to import media!');
    }
  },
});
