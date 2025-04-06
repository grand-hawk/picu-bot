/* eslint-disable no-underscore-dangle */

import { EmbedBuilder, escapeMarkdown } from 'discord.js';

import { createCommand } from '@/commands';
import { env } from '@/env';
import { getInnerType } from '@/utils/getInnerType';
import { getTypeName } from '@/utils/getTypeName';

import type { APIEmbedField } from 'discord.js';

export const command = createCommand({
  command: 'help',
  aliases: ['cmds'],
  description: 'Help',
  async handleCommand(message, _args, commands) {
    const fields: APIEmbedField[] = [];

    for (const [, commandModule] of commands) {
      let helpText = '';

      if (commandModule.args) {
        const { shape } = commandModule.args.schema;

        const wrappedUnderscore = shape._ && getInnerType(shape._);
        if (
          wrappedUnderscore &&
          Array.isArray(wrappedUnderscore._def.items) &&
          wrappedUnderscore._def.items.length > 0
        ) {
          helpText += 'Arguments:\n';

          for (const item of wrappedUnderscore._def.items) {
            let placeholder: string;

            switch (getTypeName(item)) {
              case 'ZodString':
                placeholder = 'string';
                break;
              case 'ZodNumber':
                placeholder = 'number';
                break;
              case 'ZodBoolean':
                placeholder = 'boolean';
                break;
              default:
                placeholder = 'arg';
            }

            const description = item._def.description || '';
            helpText += `<${placeholder}>    ${description}\n`;
          }

          helpText += '\n';
        }

        const optionKeys = Object.keys(shape).filter((key) => key !== '_');
        if (optionKeys.length > 0) {
          helpText += 'Options:\n';

          for (const key of optionKeys) {
            const fieldSchema = shape[key];
            const typeName = getTypeName(fieldSchema);
            const flagPrefix = `-${typeName === 'ZodBoolean' ? '' : '-'}`;
            const flags: string[] = [`${flagPrefix}${key}`];

            const alias = commandModule.args?.alias?.[key];
            if (alias) {
              if (typeof alias === 'string')
                flags.push(`${flagPrefix}${alias}`);
              else if (Array.isArray(alias))
                flags.push(...alias.map((v) => `${flagPrefix}${v}`));
            }

            let valuePlaceholder = '';
            if (typeName === 'ZodString')
              valuePlaceholder = key === 'separator' ? ' <char>' : ' <string>';
            else if (typeName === 'ZodNumber') valuePlaceholder = ' <number>';

            let defaultText = '';
            if (fieldSchema._def.defaultValue !== undefined)
              defaultText = ` (default: \`${
                typeof fieldSchema._def.defaultValue === 'function'
                  ? fieldSchema._def.defaultValue()
                  : fieldSchema._def.defaultValue
              }\`)`;

            const description = fieldSchema._def.description || '';
            helpText += `${flags.join(', ')}${valuePlaceholder}    ${description}${defaultText}\n`;
          }
        }
      }

      fields.push({
        name: `${env.COMMAND_PREFIX}${commandModule.command}`,
        value:
          `Aliases: ${commandModule.aliases?.length ? commandModule.aliases.map((alias) => `${env.COMMAND_PREFIX}${alias}`).join(', ') : 'None'}` +
          `\nDescription: ${commandModule.description ? escapeMarkdown(commandModule.description) : 'None'}` +
          `${helpText ? `\n\n${helpText}` : ''}`,
      });
    }

    return message.reply({
      embeds: [new EmbedBuilder().setTitle('Commands').setFields(fields)],
    });
  },
});
