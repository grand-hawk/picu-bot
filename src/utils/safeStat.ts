import fs from 'node:fs/promises';

export async function safeStat(path: string) {
  return fs.stat(path).catch(() => null);
}
