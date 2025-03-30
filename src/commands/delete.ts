import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

import { COLLECTOR_TIMEOUT } from '@/constants';
import { env } from '@/env';
import { attachmentFromMedia } from '@/lib/attachmentFromMedia';
import { deleteMedia } from '@/lib/deleteMedia';
import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils//formatIndex';
import { validateFileName } from '@/utils/validateFileName';

import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'delete',
  aliases: ['d', 'del'],
  description: 'Delete media (Restricted)',
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

    const media = await prisma.media.findMany({
      where: {
        name: fileName,
      },
    });
    if (!media.length) return message.reply('No media found!');

    let mediaIndex = 0;

    const getRow = () => {
      const previousButton = new ButtonBuilder()
        .setCustomId(`${message.id}-previous`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === 0);
      const nextButton = new ButtonBuilder()
        .setCustomId(`${message.id}-next`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === media.length - 1);
      const deleteButton = new ButtonBuilder()
        .setCustomId(`${message.id}-delete`)
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger);

      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        previousButton,
        nextButton,
        deleteButton,
      );
    };

    const getOptionsForCurrentMedia = async () => {
      const targetMedia = media[mediaIndex];
      if (!targetMedia) return { content: 'Error!' };

      const attachment = await attachmentFromMedia(targetMedia);
      if (!attachment) return { content: 'Could not get media!' };

      return {
        content: `${targetMedia.name}${formatIndex(targetMedia.index)}`,
        files: [attachment],
        components: [getRow()],
      };
    };

    const response = await message.reply(await getOptionsForCurrentMedia());

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

        case `${message.id}-delete`: {
          const targetMedia = media[mediaIndex];
          if (!targetMedia) return;

          const success = await deleteMedia(targetMedia);
          if (success) {
            log.info(
              `Deleted media "${targetMedia.name}"${formatIndex(targetMedia.index)} (${targetMedia.uuid})`,
            );

            await i.update({
              content: `Deleted "${targetMedia.name}"${formatIndex(targetMedia.index)}`,
              files: [],
              components: [],
            });
          } else
            await i.update({
              content: 'Failed to delete media!',
              files: [],
              components: [],
            });

          return;
        }
      }

      await i.update(await getOptionsForCurrentMedia());
    });
  },
};
