import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { createCommand } from '@/commands';
import { canSave, saveAndReply } from '@/commands/save';
import { MEDIA_NAME_REGEX } from '@/constants';
import { maxUploadSizeFromTier } from '@/utils/maxUploadSizeFromTier';

import type {
  Message,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

const MODAL_ID = 'save-media';

function findDownloadURL(message: Message, maxSize: number) {
  for (const attachment of message.attachments.values()) {
    if (attachment.size > maxSize) continue;

    return attachment.url;
  }

  for (const embed of message.embeds) {
    if (!embed.data) continue;
    if (
      embed.data.type !== 'video' &&
      embed.data.type !== 'image' &&
      embed.data.type !== 'gifv'
    )
      continue;

    const mediaObject = embed.data.video || embed.data.thumbnail;
    if (!mediaObject) continue;

    return mediaObject.proxy_url;
  }

  return undefined;
}

export const command = createCommand<
  MessageContextMenuCommandInteraction<'cached'>
>({
  data: new ContextMenuCommandBuilder()
    .setName('Save media')
    .setType(ApplicationCommandType.Message),
  async handleCommand(interaction) {
    if (!canSave(interaction.member))
      return interaction.reply({
        content: 'You do not have permission to use this command!',
        ephemeral: true,
      });

    const maxSize = maxUploadSizeFromTier(interaction.guild.premiumTier);
    if (!findDownloadURL(interaction.targetMessage, maxSize))
      return interaction.reply({
        content: 'No valid media found!',
        ephemeral: true,
      });

    return interaction.showModal(
      new ModalBuilder()
        .setCustomId(`${MODAL_ID}:${interaction.targetMessage.id}`)
        .setTitle('Save media')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Media name')
              .setStyle(TextInputStyle.Short)
              .setRequired(true),
          ),
        ),
    );
  },
});

export async function handleSaveModal(
  interaction: ModalSubmitInteraction<'cached'>,
) {
  const [modalId, messageId] = interaction.customId.split(':');
  if (modalId !== MODAL_ID || !messageId) return;

  if (!canSave(interaction.member))
    return interaction.reply({
      content: 'You do not have permission to use this command!',
      ephemeral: true,
    });

  const name = interaction.fields.getTextInputValue('name');
  if (!MEDIA_NAME_REGEX.test(name))
    return interaction.reply({
      content: 'Media name contains invalid characters',
      ephemeral: true,
    });

  const targetMessage = await interaction.channel?.messages
    .fetch(messageId)
    .catch(() => null);
  const maxSize = maxUploadSizeFromTier(interaction.guild.premiumTier);
  const downloadURL = targetMessage && findDownloadURL(targetMessage, maxSize);
  if (!downloadURL)
    return interaction.reply({
      content: 'No valid media found!',
      ephemeral: true,
    });

  await interaction.deferReply();
  return saveAndReply(interaction, name, downloadURL, maxSize);
}
