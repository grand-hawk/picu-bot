import { createCommand } from '@/commands';
import { command as getCommand } from '@/commands/get';
import { env } from '@/env';

export const command = createCommand({
  command: 'delete',
  aliases: ['d', 'del'],
  description: 'Delete media',
  args: getCommand.args,
  async handleCommand(message, args, commands) {
    const { member } = message;
    if (!member) return;

    if (!env.DELETE_ROLES.some((roleId) => member.roles.cache.get(roleId)))
      return message.reply(`You do not have permission to use this command!`);

    await getCommand.handleCommand(message, args, commands, {
      allowDeletion: true,
    });
  },
});
