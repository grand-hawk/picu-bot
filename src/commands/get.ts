import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
} from 'discord.js';
import { z } from 'zod';
import { tupleWithOptional } from 'zod-tuple-with-optional';

import { createCommand } from '@/commands';
import { COLLECTOR_IDLE_TIMEOUT, MEDIA_NAME_REGEX } from '@/constants';
import { attachmentFromMedia } from '@/lib/attachmentFromMedia';
import { deleteMedia } from '@/lib/deleteMedia';
import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';

import type { Media, Prisma } from '@prisma/client';
import type { InteractionUpdateOptions } from 'discord.js';

export const command = createCommand({
  command: 'get',
  aliases: ['i', 'img', 'image'],
  description: 'Get media',
  args: z.object({
    _: tupleWithOptional([
      z
        .union([
          z.string().regex(MEDIA_NAME_REGEX, {
            message: 'Media name contains invalid characters',
          }),
          z.number(),
        ])
        .optional()
        .describe('Media name'),
    ]).default([undefined]),
    info: z.boolean().default(false).describe('Show media info'),
  }),
  async handleCommand(message, args, _commands, options) {
    const fileName: string | undefined = args._[0]
      ? String(args._[0])
      : undefined;
    const fileIndex: number | undefined =
      typeof args._[0] === 'number' ? args._[0] : undefined;
    const shouldDisplayInfo = args.info;

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

    if (fileIndex && !Number.isNaN(fileIndex))
      query.where = {
        ...query.where,
        OR: [
          nameQuery,
          {
            index: fileIndex,
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
    const displayCountIncrementedMedia = new Map<Media['uuid'], boolean>();

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

      if (!displayCountIncrementedMedia.get(targetMedia.uuid)) {
        displayCountIncrementedMedia.set(targetMedia.uuid, true);

        prisma.media
          .update({
            where: {
              uuid: targetMedia.uuid,
            },
            data: {
              displayCount: {
                increment: 1,
              },
            },
          })
          .catch((err) => {
            log.warn(
              err,
              `Failed to increment display count for ${targetMedia.uuid}`,
            );

            displayCountIncrementedMedia.delete(targetMedia.uuid);
          });
      }

      return {
        content: `${escapeMarkdown(targetMedia.name.toLowerCase())}${formatIndex(targetMedia.index)}${
          shouldDisplayInfo
            ? '\n\n**Info**' +
              `\nCreated by: ${targetMedia.createdBy ? `<@${targetMedia.createdBy}>` : 'Unknown'}` +
              `\nCreated at: <t:${Math.floor(targetMedia.createdAt.getTime() / 1_000)}:F>` +
              `\nContent type: \`${targetMedia.contentType}\`` +
              `\nDisplay count: \`${targetMedia.displayCount + 1}\``
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
        time: COLLECTOR_IDLE_TIMEOUT,
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
});
