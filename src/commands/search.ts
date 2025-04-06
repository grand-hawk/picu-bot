import { z } from 'zod';
import { tupleWithOptional } from 'zod-tuple-with-optional';

import { createCommand } from '@/commands';
import { command as getCommand } from '@/commands/get';
import { MEDIA_NAME_REGEX } from '@/constants';

export const command = createCommand({
  command: 'search',
  aliases: ['find', 'f'],
  description: 'Search media',
  args: {
    schema: z.object({
      _: tupleWithOptional([
        z
          .string()
          .regex(MEDIA_NAME_REGEX, {
            message: 'Search value contains invalid characters',
          })
          .optional()
          .describe('Search value'),
      ]).default([undefined]),
    }),
  },
  async handleCommand(message, args, commands) {
    await getCommand.handleCommand(
      message,
      getCommand.args!.schema.parse({}),
      commands,
      {
        search: true,
        searchValue: args._[0],
      },
    );
  },
});
