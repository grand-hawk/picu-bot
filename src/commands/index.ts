/* eslint-disable @typescript-eslint/no-empty-object-type */

import { z } from 'zod';

import type { Awaitable } from '@/utils/awaitable';
import type { Message } from 'discord.js';
import type minimist from 'minimist';
import type { ZodTupleWithOptional } from 'zod-tuple-with-optional';

export const defaultArgsSchema = z.object({});

export type DefaultShape = Record<Exclude<string, '_'>, z.ZodTypeAny> & {
  _?: ZodTupleWithOptional | z.ZodTuple;
};

export interface MessageCommand<T extends z.ZodRawShape = DefaultShape> {
  command: string;
  aliases?: string[];
  description?: string;
  args?: {
    schema: z.ZodObject<T>;
    alias?: minimist.Opts['alias'];
  };
  handleCommand(
    message: Message<true>,
    args: z.infer<z.ZodObject<T>>,
    commands: Map<string, MessageCommand>,
    options: Record<string, unknown>,
  ): Awaitable<unknown>;
}

export function createCommand<T extends z.ZodRawShape = DefaultShape>(
  command: MessageCommand<T>,
): MessageCommand<T> {
  return command;
}

export interface CommandModule {
  command: MessageCommand;
}
