import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

import { COLLECTOR_TIMEOUT } from '@/constants';
import { attachmentFromMedia } from '@/lib/attachmentFromMedia';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils//formatIndex';
import { validateFileName } from '@/utils/validateFileName';

import type { MessageCommand } from '@/commands';
import type { InteractionUpdateOptions } from 'discord.js';

export const command: MessageCommand = {
  command: 'get',
  aliases: ['i', 'img', 'image'],
  description: 'Get media',
  async handleCommand(message, args, _commands, options) {
    const fileName: string | undefined = args[0];
    if (fileName && !validateFileName(fileName))
      return message.reply('Media name contains invalid characters!');

    const shouldDisplayInfo = args[1] === '+info';
    const shouldSearch = options.search as string | undefined;

    let media = await prisma.media.findMany({
      where: {
        name: shouldSearch
          ? {
              search: fileName,
            }
          : fileName,
      },
    });
    if (!media.length) return message.reply('No media found!');
    if (!fileName) media = [media[Math.floor(Math.random() * media.length)]];

    let mediaIndex = 0;

    const getRow = () => {
      const previous = new ButtonBuilder()
        .setCustomId(`${message.id}-previous`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === 0);
      const next = new ButtonBuilder()
        .setCustomId(`${message.id}-next`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === media.length - 1);

      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        previous,
        next,
      );
    };

    const getOptionsForCurrentMedia = async () => {
      const targetMedia = media[mediaIndex];
      if (!targetMedia)
        return { content: 'Error!' } satisfies InteractionUpdateOptions;

      const attachment = await attachmentFromMedia(targetMedia);
      if (!attachment)
        return {
          content: 'Could not get media!',
        } satisfies InteractionUpdateOptions;

      return {
        content: `${targetMedia.name}${formatIndex(targetMedia.index)}${
          shouldDisplayInfo
            ? '\n\n**Info**' +
              `\nCreated by: ${targetMedia.createdBy ? `<@${targetMedia.createdBy}>` : 'Unknown'}` +
              `\nCreated at: <t:${Math.floor(targetMedia.createdAt.getTime() / 1_000)}:F>` +
              `\nContent type: \`${targetMedia.contentType}\``
            : ''
        }`,
        files: [attachment],
        components: media.length > 1 ? [getRow()] : undefined,
        allowedMentions: {
          repliedUser: true,
          users: [message.author.id],
        },
      } satisfies InteractionUpdateOptions;
    };

    const response = await message.reply(await getOptionsForCurrentMedia());

    if (media.length > 1) {
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        componentType: ComponentType.Button,
        time: COLLECTOR_TIMEOUT,
      });

      collector.on('collect', async (i) => {
        // eslint-disable-next-line default-case
        switch (i.customId) {
          case `${message.id}-previous`: {
            if (mediaIndex === 0) return;
            mediaIndex -= 1;

            break;
          }

          case `${message.id}-next`: {
            if (mediaIndex === media.length - 1) return;
            mediaIndex += 1;

            break;
          }
        }

        await i.update(await getOptionsForCurrentMedia());
      });
    }
  },
};
