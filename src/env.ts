import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const stringArray = z
  .string()
  .default('')
  .transform((v) => v.trim().split(','));

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    PORT: z
      .string()
      .default('3000')
      .transform((v) => parseInt(v, 10)),
    DISCORD_TOKEN: z.string(),

    DATABASE_URL: z.string().url(),
    MEDIA_SAVE_PATH: z.string().default('/picu-media'),
    COMMAND_PREFIX: z.string().default('?'),
    SAVE_ROLES: stringArray,
    DELETE_ROLES: stringArray,
    ADMIN_USERS: stringArray,
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
