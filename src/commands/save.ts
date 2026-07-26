import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';

import { createCommand } from '@/commands';
import { MEDIA_NAME_REGEX } from '@/constants';
import { env } from '@/env';
import { saveMedia } from '@/lib/saveMedia';
import { log } from '@/pino';
import { formatIndex } from '@/utils/formatIndex';
import { maxUploadSizeFromTier } from '@/utils/maxUploadSizeFromTier';

import type { GuildMember, RepliableInteraction } from 'discord.js';

export function canSave(member: GuildMember) {
  return env.SAVE_ROLES.some((roleId) => member.roles.cache.get(roleId));
}

// interaction must already be deferred
export async function saveAndReply(
  interaction: RepliableInteraction<'cached'>,
  name: string,
  downloadURL: string,
  maxSize: number,
) {
  const media = await saveMedia(
    name.toLowerCase(),
    interaction.user.id,
    downloadURL,
    maxSize,
  ).catch((err) => {
    log.warn(err, 'Failed to save media');
    return null;
  });

  if (!media)
    return interaction.editReply('There was an error saving the media!');

  // lower case was done in saveMedia
  return interaction.editReply(
    `Saved as "${escapeMarkdown(media.name)}"${formatIndex(media.index)}`,
  );
}

export const command = createCommand({
  data: new SlashCommandBuilder()
    .setName('save')
    .setDescription('Save media')
    .addStringOption((option) =>
      option.setName('name').setDescription('Media name').setRequired(true),
    )
    .addAttachmentOption((option) =>
      option.setName('file').setDescription('Media to save').setRequired(true),
    ),
  async handleCommand(interaction) {
    if (!canSave(interaction.member))
      return interaction.reply({
        content: 'You do not have permission to use this command!',
        ephemeral: true,
      });

    const name = interaction.options.getString('name', true);
    if (!MEDIA_NAME_REGEX.test(name))
      return interaction.reply({
        content: 'Media name contains invalid characters',
        ephemeral: true,
      });

    const attachment = interaction.options.getAttachment('file', true);
    const maxSize = maxUploadSizeFromTier(interaction.guild.premiumTier);
    if (attachment.size > maxSize)
      return interaction.reply({
        content: `Media is larger than ${maxSize / 1e6} MB!`,
        ephemeral: true,
      });

    await interaction.deferReply();
    return saveAndReply(interaction, name, attachment.url, maxSize);
  },
});
