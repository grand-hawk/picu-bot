import path from 'node:path';

import klaw from 'klaw';

import { importPath } from '@/utils/importPath';

import type { CommandModule, Commands } from '@/commands';

export const commands: Commands = new Map();

for await (const file of klaw('dist/commands')) {
  const basename = path.basename(file.path);
  if (!basename.endsWith('.js')) continue;
  if (basename.startsWith('_')) continue;

  const module: CommandModule = await import(importPath(file.path));

  const commandModule = module?.command;
  if (!commandModule) continue;

  commands.set(commandModule.data.name, commandModule);
}
