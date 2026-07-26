import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  escapeMarkdown,
} from 'discord.js';

import { createCommand } from '@/commands';
import { COLLECTOR_IDLE_TIMEOUT, MEDIA_NAME_REGEX } from '@/constants';
import { deleteMedia } from '@/lib/deleteMedia';
import { prepareMediaFile } from '@/lib/prepareMediaFile';
import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';

import type { Media, Prisma } from '@prisma/client';
import type {
  InteractionEditReplyOptions,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export function addGetOptions(builder: SlashCommandBuilder) {
  return builder
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Media name or index')
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('info')
        .setDescription('Show media info')
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('newest')
        .setDescription('Show newest media first')
        .setRequired(false),
    );
}

export function addListOptions(builder: SlashCommandOptionsOnlyBuilder) {
  return builder
    .addBooleanOption((option) =>
      option
        .setName('info')
        .setDescription('Show media info')
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('newest')
        .setDescription('Show newest media first')
        .setRequired(false),
    );
}

export const command = createCommand({
  data: addGetOptions(
    new SlashCommandBuilder().setName('get').setDescription('Get media'),
  ),
  async handleCommand(interaction, _commands, options) {
    const nameOption = interaction.options.getString('name') ?? undefined;
    if (nameOption && !MEDIA_NAME_REGEX.test(nameOption))
      return interaction.reply({
        content: 'Media name contains invalid characters',
        ephemeral: true,
      });

    const fileName = nameOption;
    const parsedIndex = nameOption ? Number(nameOption) : NaN;
    const fileIndex = Number.isInteger(parsedIndex) ? parsedIndex : undefined;
    const shouldDisplayInfo = interaction.options.getBoolean('info') ?? false;
    const shouldSortNewestFirst =
      interaction.options.getBoolean('newest') ?? false;

    const { search, searchValue } = options as {
      search: boolean | undefined;
      searchValue: string | undefined;
    };
    // authenticated in the delete command
    const allowDeletion = options.allowDeletion as boolean | undefined;

    await interaction.deferReply();

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

    if (fileIndex)
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
    if (!media.length) return interaction.editReply('No media found!');
    if (!fileName && !search) {
      const weights = media.map((m) => 1 / (m.displayCount + 1));
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const randomValue = Math.random() * totalWeight;

      let cumulativeWeight = 0;
      let selectedMedia = media[0];
      for (let i = 0; i < media.length; i += 1) {
        cumulativeWeight += weights[i];
        if (randomValue < cumulativeWeight) {
          selectedMedia = media[i];
          break;
        }
      }

      media = [selectedMedia];
    }

    if (shouldSortNewestFirst)
      media.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else media.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let mediaIndex = 0;
    const displayCountIncrementedMedia = new Map<Media['uuid'], boolean>();

    const getRow = () => {
      const previous = new ButtonBuilder()
        .setCustomId(`${interaction.id}-previous`)
        .setLabel(`(${mediaIndex}) Previous`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === 0);
      const next = new ButtonBuilder()
        .setCustomId(`${interaction.id}-next`)
        .setLabel(`Next (${media.length - mediaIndex - 1})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(mediaIndex === media.length - 1);

      const baseComponents: ButtonBuilder[] = [previous, next];

      if (allowDeletion) {
        const deleteButton = new ButtonBuilder()
          .setCustomId(`${interaction.id}-delete`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);

        baseComponents.push(deleteButton);
      }

      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        baseComponents,
      );
    };

    const getOptionsForCurrentMedia = async () => {
      const baseOptions = {
        components: media.length > 1 || allowDeletion ? [getRow()] : [],
      } satisfies InteractionEditReplyOptions;

      const targetMedia = media[mediaIndex];
      if (!targetMedia)
        return {
          content: 'Error!',
          files: [],
          ...baseOptions,
        } satisfies InteractionEditReplyOptions;

      const mediaFile = await prepareMediaFile(targetMedia);
      if (!mediaFile)
        return {
          content: 'Could not get media!',
          files: [],
          ...baseOptions,
        } satisfies InteractionEditReplyOptions;

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
              `\nDisplay count: ${(targetMedia.displayCount + 1).toLocaleString()}` +
              `\nSize: ${(mediaFile.stat.size / 1024 / 1024).toLocaleString()} MB` +
              `\nContent type: \`${targetMedia.contentType}\`` +
              `\nCreated by: ${targetMedia.createdBy ? `<@${targetMedia.createdBy}>` : 'Unknown'}` +
              `\nCreated at: <t:${Math.floor(targetMedia.createdAt.getTime() / 1_000)}:F>`
            : ''
        }`,
        files: [mediaFile.attachment],
        ...baseOptions,
      } satisfies InteractionEditReplyOptions;
    };

    const response = await interaction.editReply(
      await getOptionsForCurrentMedia(),
    );

    if (media.length > 1 || allowDeletion) {
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: COLLECTOR_IDLE_TIMEOUT,
      });

      collector.on('collect', async (i) => {
        // eslint-disable-next-line default-case
        switch (i.customId) {
          case `${interaction.id}-previous`: {
            if (mediaIndex === 0) return;
            mediaIndex -= 1;

            break;
          }

          case `${interaction.id}-next`: {
            if (mediaIndex === media.length - 1) return;
            mediaIndex += 1;

            break;
          }

          case `${interaction.id}-delete`: {
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

        await i.deferUpdate();
        await i
          .editReply(await getOptionsForCurrentMedia())
          .catch((err) => log.warn(err, 'Failed to update message'));
      });
    }
  },
});
