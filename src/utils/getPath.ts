import path from 'node:path';

import { env } from '@/env';

export function getPath(uuid: string) {
  return path.join(env.MEDIA_SAVE_PATH, uuid);
}
