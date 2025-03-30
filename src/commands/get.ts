import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

import { COLLECTOR_TIMEOUT } from '@/constants';
import { attachmentFromMedia } from '@/lib/attachmentFromMedia';
import { deleteMedia } from '@/lib/deleteMedia';
import { log } from '@/pino';
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
    const { search, searchValue } = options as {
      search: boolean | undefined;
      searchValue: string | undefined;
    };
    // authenticated in the delete command
    const allowDeletion = options.allowDeletion as boolean | undefined;

    let media = await prisma.media.findMany({
      where: {
        name: search
          ? {
              contains: searchValue,
            }
          : fileName,
        downloaded: true,
      },
    });
    if (!media.length) return message.reply('No media found!');
    if (!fileName && !search)
      media = [media[Math.floor(Math.random() * media.length)]];

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
      const deleteButton = new ButtonBuilder()
        .setCustomId(`${message.id}-delete`)
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger);

      const components: ButtonBuilder[] = [previous, next];
      if (allowDeletion) components.push(deleteButton);

      return new ActionRowBuilder<ButtonBuilder>().addComponents(components);
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
        components: media.length > 1 || allowDeletion ? [getRow()] : undefined,
        allowedMentions: {
          repliedUser: true,
          users: [message.author.id],
        },
      } satisfies InteractionUpdateOptions;
    };

    const response = await message.reply(await getOptionsForCurrentMedia());

    if (media.length > 1 || allowDeletion) {
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
            if (!allowDeletion) return;

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
    }
  },
};
