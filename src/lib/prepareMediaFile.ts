import { createReadStream } from 'node:fs';

import { AttachmentBuilder } from 'discord.js';

import { extensionFromMimeType } from '@/utils/extensionFromMimeType';
import { getPath } from '@/utils/getPath';
import { safeStat } from '@/utils/safeStat';

import type { Media } from '@prisma/client';

export async function prepareMediaFile(media: Media) {
  if (!media.downloaded) return null;

  const mediaPath = getPath(media.uuid);
  const stat = await safeStat(mediaPath);
  if (!stat) return null;

  const readStream = createReadStream(mediaPath, { flags: 'r' });
  return {
    attachment: new AttachmentBuilder(readStream).setName(
      `${media.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extensionFromMimeType(media.contentType)}`,
    ),
    stat,
  };
}
