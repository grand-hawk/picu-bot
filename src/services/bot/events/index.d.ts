import type { ClientEvents } from 'discord.js';

export interface EventModule {
  event: keyof ClientEvents;
  handleEvent: (...args: unknown[]) => unknown;
}
