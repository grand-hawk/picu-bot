import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import ffmpeg from 'fluent-ffmpeg';

import { log } from '@/pino';
import { safeStat } from '@/utils/safeStat';

if (!(await safeStat('.tmp/gif'))) await mkdir('.tmp/gif', { recursive: true });

export function ffprobeFrames(inputGif: string) {
  return new Promise<number | null>((resolve, reject) => {
    ffmpeg.ffprobe(inputGif, (err, metadata) => {
      if (err) return reject(err);

      const firstStream = metadata.streams[0];
      if (!firstStream) return reject(new Error('No streams found'));

      resolve(
        Number(firstStream.nb_frames || firstStream.nb_read_frames) || null,
      );
    });
  });
}

export async function getUniqueFrameCount(inputGif: string) {
  const readFrames = await ffprobeFrames(inputGif).catch((err) => {
    log.warn(err, 'Failed to probe frames from gif');
    return null;
  });
  if (!readFrames) return null;
  if (readFrames > 2) return readFrames;

  // check frame mdsums to look for duplicates
  return new Promise<number>((resolve, reject) => {
    ffmpeg(inputGif)
      .output(`.tmp/gif/${path.basename(inputGif)}_%03d.png`)
      .on('end', async () => {
        const files = (await readdir(`.tmp/gif`)).filter((v) =>
          v.startsWith(path.basename(inputGif)),
        );

        try {
          const frameSums = files.map((fileName) => {
            const relativePath = path.join('.tmp/gif', fileName);
            const result = spawnSync('md5sum', [relativePath]);

            if (result.error) throw result.error;

            const stdout = result.stdout.toString();
            return stdout.split(' ')[0];
          });
          const uniqueFrameSums = [...new Set(frameSums)];

          resolve(uniqueFrameSums.length);
        } finally {
          for (const file of files) await rm(path.join('.tmp/gif', file));
        }
      })
      .on('error', reject)
      .run();
  });
}

export function extractFrame(inputGif: string, outputPng: string) {
  return new Promise<true>((resolve, reject) => {
    ffmpeg(inputGif)
      .videoFilters("select='eq(n,0)'")
      .frames(1)
      .output(outputPng)
      .on('end', () => resolve(true))
      .on('error', reject)
      .run();
  });
}
