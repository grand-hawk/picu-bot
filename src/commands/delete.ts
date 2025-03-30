import { env } from '@/env';

import type { MessageCommand } from '@/commands';

export const command: MessageCommand = {
  command: 'delete',
  aliases: ['d', 'del'],
  description: 'Delete media (Restricted)',
  async handleCommand(message, args, commands) {
    const { member } = message;
    if (!member) return;

    if (!env.WRITE_ROLES.some((roleId) => member.roles.cache.get(roleId)))
      return message.reply(
        `You do not have permission to use ${env.COMMAND_PREFIX}${command.command}!`,
      );

    await commands.get('get')!.handleCommand(message, args, commands, {
      allowDeletion: true,
    });
  },
};
