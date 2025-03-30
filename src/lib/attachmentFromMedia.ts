import { createReadStream } from 'node:fs';

import { AttachmentBuilder } from 'discord.js';
import mime from 'mime-types';

import { getPath } from '@/utils/getPath';
import { safeStat } from '@/utils/safeStat';

import type { Media } from '@prisma/client';

export async function attachmentFromMedia(media: Media) {
  if (!media.downloaded) return null;

  const mediaPath = getPath(media.uuid);
  if (!(await safeStat(mediaPath))) return null;

  const readStream = createReadStream(mediaPath, { flags: 'r' });
  return new AttachmentBuilder(readStream).setName(
    `${media.name.replace(/[^a-zA-Z0-9]/g, '_')}.${mime.extension(media.contentType)}`,
  );
}
