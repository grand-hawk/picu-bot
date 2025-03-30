import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'search',
  aliases: ['find'],
  description: 'Search media',
  async handleCommand(message, args, commands) {
    const searchValue = args[0];
    if (!searchValue) return message.reply('Please provide a search value!');

    await commands.get('get')!.handleCommand(message, [], commands, {
      search: searchValue,
    });
  },
};
