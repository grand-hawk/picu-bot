import path from 'node:path';

import { env } from '@/env';
import { importMediaFromFolder } from '@/lib/importMediaFromFolder';
import { log } from '@/pino';
import { safeStat } from '@/utils/safeStat';

import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'import',
  description: 'Import media from folder (Restricted)',
  async handleCommand(message, args) {
    if (!env.ADMIN_USERS.some((userId) => message.author.id === userId))
      return message.reply(
        `You do not have permission to use ${env.COMMAND_PREFIX}${command.command}!`,
      );

    const folderPath = args[0];
    if (!folderPath) return message.reply('Please provide a folder path!');

    const resolvedPath = path.resolve(folderPath);
    const resolvedPathStat = await safeStat(resolvedPath);
    if (!resolvedPathStat || !resolvedPathStat.isDirectory())
      return message.reply('Invalid folder path!');

    try {
      log.info(`Importing media from folder "${folderPath}"`);

      const importedMedia = await importMediaFromFolder(resolvedPath);
      return message.reply(`Imported ${importedMedia.length} media! `);
    } catch (err) {
      log.error(err, `Failed to import media from folder "${folderPath}"`);
      return message.reply('Failed to import media!');
    }
  },
};
