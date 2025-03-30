import { validateFileName } from '@/utils/validateFileName';

import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'search',
  aliases: ['find'],
  description: 'Search media',
  async handleCommand(message, args, commands) {
    const searchValue: string | undefined = args[0];
    if (searchValue && !validateFileName(searchValue))
      return message.reply('Search contains invalid characters!');

    await commands
      .get('get')!
      .handleCommand(message, [], commands, { search: searchValue });
  },
};
