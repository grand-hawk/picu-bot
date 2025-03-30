import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

import ky from 'ky';

import { env } from '@/env';
import { log } from '@/pino';
import { prisma } from '@/services/database';
import { safeStat } from '@/utils//safeStat';
import { formatIndex } from '@/utils/formatIndex';
import { getPath } from '@/utils/getPath';

export async function saveMedia(
  name: string,
  creatorId: string,
  downloadUrl: string,
) {
  const response = await ky.get(downloadUrl, {
    throwHttpErrors: false,
  });

  if (!response.ok)
    throw new Error(
      `Failed to download media: ${response.statusText} (${response.status})`,
    );
  if (!response.body) throw new Error('No response stream to save');

  const contentType = response.headers.get('content-type');
  if (!contentType) throw new Error('Response returned no content type header');

  const media = await prisma.media.create({
    data: {
      name,
      contentType,
      createdBy: creatorId,
    },
  });

  if (!(await safeStat(env.MEDIA_SAVE_PATH))) {
    log.warn("Media save path doesn't exist, creating");
    await mkdir(env.MEDIA_SAVE_PATH, { recursive: true });
  }

  try {
    const writeStream = createWriteStream(getPath(media.uuid), { flags: 'wx' });
    const downloadPipe = Readable.fromWeb(response.body).pipe(writeStream);
    await finished(downloadPipe);

    const updatedMedia = await prisma.media.update({
      where: {
        uuid: media.uuid,
      },
      data: {
        downloaded: true,
      },
    });

    log.info(
      `Saved media "${media.name}"${formatIndex(media.index)} (${media.uuid}) from ${creatorId}`,
    );

    return updatedMedia;
  } catch (err) {
    log.error(
      err,
      `Failed to save media "${media.name}"${formatIndex(media.index)} (${media.uuid})`,
    );

    await prisma.media.delete({
      where: {
        uuid: media.uuid,
      },
    });

    return null;
  }
}
