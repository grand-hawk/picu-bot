import path from 'node:path';

import klaw from 'klaw';
import minimist from 'minimist';

import { defaultArgsSchema } from '@/commands';
import { env } from '@/env';
import { log } from '@/pino';
import { importPath } from '@/utils/importPath';

import type { CommandModule, MessageCommand } from '@/commands';
import type { ClientEvents } from 'discord.js';

export const commands = new Map<string, MessageCommand>();

for await (const file of klaw('dist/commands')) {
  const basename = path.basename(file.path);
  if (!basename.endsWith('.js')) continue;
  if (basename.startsWith('_')) continue;

  const module: CommandModule = await import(importPath(file.path));

  const commandModule = module?.command;
  if (!commandModule) continue;

  commands.set(commandModule.command, commandModule);
}

export const event = 'messageCreate' as const satisfies keyof ClientEvents;

export const handleEvent: (
  ...args: ClientEvents[typeof event]
) => unknown = async (message) => {
  if (message.author.bot) return;
  if (!message.inGuild()) return;
  if (!message.content) return;
  if (!message.content.startsWith(env.COMMAND_PREFIX)) return;

  const args = message.content
    .slice(env.COMMAND_PREFIX.length)
    .trim()
    .split(/ +/g);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  let command: MessageCommand | undefined;
  for (const commandModule of commands.values())
    if (
      commandModule.command === commandName ||
      commandModule.aliases?.includes(commandName)
    ) {
      command = commandModule;
      break;
    }
  if (!command) return;

  log.info(`Command "${command.command}" ran by ${message.author.id}`);

  try {
    const parsedArgs = minimist(args, {
      alias: command.args?.alias,
    });
    const parseResult = (command.args?.schema ?? defaultArgsSchema).safeParse(
      parsedArgs,
    );

    if (!parseResult.success)
      return message.reply(
        'Invalid argument(s):' +
          `\n${parseResult.error.issues
            .map((issue) => issue.message)
            .join('\n')}`,
      );

    await command.handleCommand(message, parseResult.data, commands, {});
  } catch (err) {
    log.error(err, `Error handling command "${commandName}"`);
  }
};
