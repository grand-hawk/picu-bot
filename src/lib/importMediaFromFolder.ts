import { copyFile } from 'node:fs/promises';
import path from 'node:path';

import klaw from 'klaw';
import { detectFileMime } from 'mime-detect';

import { log } from '@/pino';
import { prisma } from '@/services/database';
import { formatIndex } from '@/utils/formatIndex';
import { getPath } from '@/utils/getPath';

import type { Media } from '@prisma/client';

export async function importMediaFromFolder(folderPath: string) {
  const targetPath = path.resolve(folderPath);
  const importedMedia: Media[] = [];

  for await (const file of klaw(targetPath)) {
    if (file.path === targetPath) continue;

    const name = path.parse(file.path).name.replace(/[^a-zA-Z0-9]/g, '_');

    const mime = await detectFileMime(file.path).catch(() => null);
    if (!mime) {
      log.warn(`Could not detect mime type for "${file.path}"`);
      continue;
    }

    const media = await prisma.media.create({
      data: {
        name,
        contentType: mime,
        downloaded: true,
      },
    });

    await copyFile(file.path, getPath(media.uuid));

    const allWithSameName = await prisma.media.findMany({
      where: {
        name: media.name,
      },
    });

    log.info(
      `Imported "${file.path}" as "${media.name}"${formatIndex(allWithSameName.length, true)} (${media.uuid})`,
    );

    importedMedia.push(media);
  }

  return importedMedia;
}
