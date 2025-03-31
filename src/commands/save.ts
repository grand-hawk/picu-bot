import { escapeMarkdown } from 'discord.js';
import { z } from 'zod';

import { createCommand } from '@/commands';
import { MEDIA_NAME_REGEX } from '@/constants';
import { env } from '@/env';
import { saveMedia } from '@/lib/saveMedia';
import { formatIndex } from '@/utils/formatIndex';
import { getRepliedToMessage } from '@/utils/getRepliedToMessage';
import { maxUploadSizeFromTier } from '@/utils/maxUploadSizeFromTier';

export const command = createCommand({
  command: 'save',
  aliases: ['s'],
  description: 'Save media',
  args: z.object({
    _: z.tuple([
      z
        .string()
        .regex(MEDIA_NAME_REGEX, {
          message: 'Media name contains invalid characters',
        })
        .describe('Media name'),
    ]),
  }),
  async handleCommand(message, args) {
    const { member } = message;
    if (!member) return;

    if (!env.SAVE_ROLES.some((roleId) => member.roles.cache.get(roleId)))
      return message.reply(`You do not have permission to use this command!`);

    const fileName = args._[0];
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

    if (!downloadURL) return message.reply('No valid media found!');

    const media = await saveMedia(
      fileName.toLowerCase(),
      message.author.id,
      downloadURL,
      maxSize,
    );

    if (media)
      await message.reply(
        // lower case was done in saveMedia
        `Saved as "${escapeMarkdown(media.name)}"${formatIndex(media.index)}`,
      );
    else await message.reply('There was an error saving the media!');
  },
});
