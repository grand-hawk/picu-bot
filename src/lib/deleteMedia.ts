import { rm } from 'node:fs/promises';

import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';
import { getPath } from '@/utils/getPath';

import type { Media } from '@prisma/client';

export async function deleteMedia(media: Media) {
  await prisma.media.update({
    where: {
      uuid: media.uuid,
    },
    data: {
      downloaded: false,
    },
  });

  try {
    await rm(getPath(media.uuid));

    await prisma.media.delete({
      where: {
        uuid: media.uuid,
      },
    });

    log.info(
      `Deleted media "${media.name}"${formatIndex(media.index)} (${media.uuid})`,
    );

    return true;
  } catch (err) {
    log.error(err, `Failed to delete media "${media.uuid}"`);

    return false;
  }
}
