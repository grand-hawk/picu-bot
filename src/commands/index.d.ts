import type { Awaitable } from '@/utils//awaitable';
import type { Message } from 'discord.js';

export interface MessageCommand {
  command: string;
  aliases?: string[];
  description?: string;
  handleCommand(
    message: Message<true>,
    args: string[],
    commands: Map<string, MessageCommand>,
    options: Record<string, unknown>,
  ): Awaitable<unknown>;
}

export interface CommandModule {
  command: MessageCommand;
}
