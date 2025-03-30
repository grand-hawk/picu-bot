import type { Awaitable } from '@/utils//awaitable';
import type { Message } from 'discord.js';

export interface MessageCommand {
  command: string;
  aliases?: string[];
  description?: string;
  handleCommand(
    message: Message<true>,
    arguments: string[],
  ): Awaitable<unknown>;
}

export interface CommandModule {
  command: MessageCommand;
}
