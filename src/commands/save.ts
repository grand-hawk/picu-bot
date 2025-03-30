import { env } from '@/env';
import { saveMedia } from '@/lib/saveMedia';
import { log } from '@/pino';
import { formatIndex } from '@/utils//formatIndex';
import { getRepliedToMessage } from '@/utils/getRepliedToMessage';
import { validateFileName } from '@/utils/validateFileName';

import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'save',
  aliases: ['s'],
  description: 'Save media (Restricted)',
  async handleCommand(message, args) {
    const { member } = message;
    if (!member) return;

    if (!env.WRITE_ROLES.some((roleId) => member.roles.cache.get(roleId)))
      return message.reply(
        `You do not have permission to use ${env.COMMAND_PREFIX}${command.command}!`,
      );

    const fileName = args[0];
    if (!fileName) return message.reply('Please provide a media name!');
    if (!validateFileName(fileName))
      return message.reply('Media name contains invalid characters!');

    const targetMessage = (await getRepliedToMessage(message)) || message;

    for (const attachment of targetMessage.attachments.values().take(1)) {
      if (attachment.size > 1e7) continue;

      const media = await saveMedia(
        fileName,
        message.author.id,
        attachment.url,
      );

      if (media) {
        log.info(
          `Saved media "${media.name}" (${media.uuid}) from ${message.author.id}`,
        );

        await message.reply(
          `Saved as "${media.name}"${formatIndex(media.index)}`,
        );
      } else {
        await message.reply('There was an error saving the media!');
      }
    }
  },
};
