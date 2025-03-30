import { escapeMarkdown } from 'discord.js';

import { env } from '@/env';
import { saveMedia } from '@/lib/saveMedia';
import { formatIndex } from '@/utils//formatIndex';
import { getRepliedToMessage } from '@/utils/getRepliedToMessage';
import { maxUploadSizeFromTier } from '@/utils/maxUploadSizeFromTier';
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
    const maxSize = maxUploadSizeFromTier(targetMessage.guild.premiumTier);
    let downloadURL: string | undefined;

    if (!downloadURL)
      for (const attachment of targetMessage.attachments.values()) {
        if (attachment.size > maxSize) continue;

        downloadURL = attachment.url;

        break;
      }

    if (!downloadURL)
      for (const embed of targetMessage.embeds) {
        if (!embed.data) continue;
        if (
          embed.data.type !== 'video' &&
          embed.data.type !== 'image' &&
          embed.data.type !== 'gifv'
        )
          continue;

        const mediaObject = embed.data.video || embed.data.thumbnail;
        if (!mediaObject) continue;

        downloadURL = mediaObject.proxy_url;

        break;
      }

    if (!downloadURL) return message.reply('No media found!');

    const media = await saveMedia(
      fileName,
      message.author.id,
      downloadURL,
      maxSize,
    );

    if (media)
      await message.reply(
        `Saved as "${escapeMarkdown(media.name)}"${formatIndex(media.index)}`,
      );
    else await message.reply('There was an error saving the media!');
  },
};
