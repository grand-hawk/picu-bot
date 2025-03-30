import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'search',
  aliases: ['find'],
  description: 'Search media',
  async handleCommand(message, args, commands) {
    const searchValue: string | undefined = args[0];

    await commands.get('get')!.handleCommand(message, [], commands, {
      search: true,
      searchValue,
    });
  },
};
