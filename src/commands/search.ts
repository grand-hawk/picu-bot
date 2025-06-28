import { createCommand } from '@/commands';
import { command as getCommand } from '@/commands/get';

export const command = createCommand({
  command: 'search',
  aliases: ['find', 'f'],
  description: 'Search media',
  args: getCommand.args,
  async handleCommand(message, args, commands) {
    await getCommand.handleCommand(
      message,
      { ...args, _: [undefined] },
      commands,
      {
        search: true,
        searchValue: args._[0],
      },
    );
  },
});
