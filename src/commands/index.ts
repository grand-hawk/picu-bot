import type { Awaitable } from '@/utils/awaitable';
import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface Command<
  I extends
    CommandInteraction<'cached'> = ChatInputCommandInteraction<'cached'>,
> {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | ContextMenuCommandBuilder;
  handleCommand(
    interaction: I,
    commands: Map<string, Command<CommandInteraction<'cached'>>>,
    options: Record<string, unknown>,
  ): Awaitable<unknown>;
}

export type Commands = Map<string, Command<CommandInteraction<'cached'>>>;

export function createCommand<
  I extends
    CommandInteraction<'cached'> = ChatInputCommandInteraction<'cached'>,
>(command: Command<I>): Command<I> {
  return command;
}

export interface CommandModule {
  command: Command<CommandInteraction<'cached'>>;
}
