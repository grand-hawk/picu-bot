import type { Message } from 'discord.js';

export async function getRepliedToMessage(message: Message<true>) {
  if (!message.reference) return null;
  return message.fetchReference();
}
