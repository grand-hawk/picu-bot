import path from 'node:path';

import { z } from 'zod';

import { createCommand } from '@/commands';
import { env } from '@/env';
import { importMediaFromFolder } from '@/lib/importMediaFromFolder';
import { log } from '@/pino';
import { safeStat } from '@/utils/safeStat';

export const command = createCommand({
  command: 'import',
  description: 'Import media from folder',
  args: z.object({
    _: z.tuple([z.string().describe('Folder path')]),
  }),
  async handleCommand(message, args) {
    if (!env.ADMIN_USERS.some((userId) => message.author.id === userId))
      return message.reply(`You do not have permission to use this command!`);

    const folderPath = args._[0];
    const resolvedPath = path.resolve(folderPath);
    const resolvedPathStat = await safeStat(resolvedPath);
    if (!resolvedPathStat || !resolvedPathStat.isDirectory())
      return message.reply('Invalid folder path!');

    try {
      log.info(`Importing media from folder "${folderPath}"`);

      const importedMedia = await importMediaFromFolder(resolvedPath);
      return message.reply(`Imported ${importedMedia.length} media!`);
    } catch (err) {
      log.error(err, `Failed to import media from folder "${folderPath}"`);
      return message.reply('Failed to import media!');
    }
  },
});
