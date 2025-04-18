import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

import ky from 'ky';

import { env } from '@/env';
import { extractFrame, getUniqueFrameCount } from '@/lib/saveMedia/gifFrames';
import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';
import { getPath } from '@/utils/getPath';
import { safeStat } from '@/utils/safeStat';

export async function saveMedia(
  name: string,
  creatorId: string,
  downloadURL: string,
  maxSize: number = 1e7,
) {
  const response = await ky.get(downloadURL, {
    throwHttpErrors: false,
  });

  if (!response.ok)
    throw new Error(
      `Failed to download media: ${response.statusText} (${response.status})`,
    );
  if (!response.body) throw new Error('No response stream to save');

  const contentTypeHeader = response.headers.get('content-type');
  if (!contentTypeHeader)
    throw new Error('Response returned no content type header');
  if (
    !(
      contentTypeHeader.startsWith('image/') ||
      contentTypeHeader.startsWith('video/')
    )
  )
    throw new Error('Content type is not an image or video');

  const contentLengthHeader = response.headers.get('content-length');
  if (!contentLengthHeader)
    throw new Error('Response returned no content length header');

  const contentLength = parseInt(contentLengthHeader, 10);
  if (Number.isNaN(contentLength))
    throw new Error('Response returned invalid content length header');
  if (contentLength > maxSize)
    throw new Error(`Response is larger than ${maxSize} bytes`);

  const media = await prisma.media.create({
    data: {
      name,
      contentType: contentTypeHeader,
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

    if (contentTypeHeader === 'image/gif') {
      const uniqueFramesCount = await getUniqueFrameCount(
        getPath(media.uuid),
      ).catch((err) => {
        log.warn(err, 'Failed to get unique frame count from gif');
        return null;
      });

      if (uniqueFramesCount === 1) {
        const framePath = `${getPath(media.uuid)}.png`;
        const success = await extractFrame(
          getPath(media.uuid),
          framePath,
        ).catch(() => false);

        if (success) {
          await rm(getPath(media.uuid));
          await rename(framePath, getPath(media.uuid));

          await prisma.media.update({
            where: {
              uuid: media.uuid,
            },
            data: {
              contentType: 'image/png',
            },
          });
        }
      }
    }

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
