import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
} from 'discord.js';

import { COLLECTOR_TIMEOUT } from '@/constants';
import { attachmentFromMedia } from '@/lib/attachmentFromMedia';
import { deleteMedia } from '@/lib/deleteMedia';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';
import { validateFileName } from '@/utils/validateFileName';

import type { MessageCommand } from '@/commands';
import type { Prisma } from '@prisma/client';
import type { InteractionUpdateOptions } from 'discord.js';

export const command: MessageCommand = {
  command: 'get',
  aliases: ['i', 'img', 'image'],
  description: 'Get media',
  async handleCommand(message, args, _commands, options) {
    const fileName: string | undefined = args[0];
    if (fileName && !validateFileName(fileName))
      return message.reply('Media name contains invalid characters!');
    const searchIndex = fileName ? Number(fileName) : undefined;

    const shouldDisplayInfo = args[1] === '+info';
    const { search, searchValue } = options as {
      search: boolean | undefined;
      searchValue: string | undefined;
    };
    // authenticated in the delete command
    const allowDeletion = options.allowDeletion as boolean | undefined;

    const query: Prisma.MediaFindManyArgs = {
      where: {
        downloaded: true,
      },
    };

    const nameQuery: Prisma.MediaWhereInput = {};
    if (search) {
      if (searchValue)
        nameQuery.name = {
          contains: searchValue,
          mode: 'insensitive',
        } satisfies Prisma.StringFilter<'Media'>;
    } else
      nameQuery.name = {
        equals: fileName,
        mode: 'insensitive',
      } satisfies Prisma.StringFilter<'Media'>;

    if (searchIndex && !Number.isNaN(searchIndex))
      query.where = {
        ...query.where,
        OR: [
          nameQuery,
          {
            index: searchIndex,
          },
        ],
      };
    else
      query.where = {
        ...query.where,
        ...nameQuery,
      };

    let media = await prisma.media.findMany(query);
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
      const baseOptions = {
        components: media.length > 1 || allowDeletion ? [getRow()] : undefined,
      } satisfies InteractionUpdateOptions;

      const targetMedia = media[mediaIndex];
      if (!targetMedia)
        return {
          content: 'Error!',
          files: [],
          ...baseOptions,
        } satisfies InteractionUpdateOptions;

      const attachment = await attachmentFromMedia(targetMedia);
      if (!attachment)
        return {
          content: 'Could not get media!',
          files: [],
          ...baseOptions,
        } satisfies InteractionUpdateOptions;

      return {
        content: `${escapeMarkdown(targetMedia.name.toLowerCase())}${formatIndex(targetMedia.index)}${
          shouldDisplayInfo
            ? '\n\n**Info**' +
              `\nCreated by: ${targetMedia.createdBy ? `<@${targetMedia.createdBy}>` : 'Unknown'}` +
              `\nCreated at: <t:${Math.floor(targetMedia.createdAt.getTime() / 1_000)}:F>` +
              `\nContent type: \`${targetMedia.contentType}\``
            : ''
        }`,
        files: [attachment],
        allowedMentions: {
          repliedUser: true,
          users: [message.author.id],
        },
        ...baseOptions,
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
            if (success)
              await i.update({
                content: `Deleted "${escapeMarkdown(targetMedia.name.toLowerCase())}"${formatIndex(targetMedia.index)}`,
                files: [],
                components: [],
              });
            else
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
