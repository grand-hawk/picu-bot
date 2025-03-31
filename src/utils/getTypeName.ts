/* eslint-disable no-underscore-dangle */

import type { ZodTypeAny } from 'zod';

export function getTypeName(schema: ZodTypeAny): string {
  if (schema._def.typeName === 'ZodOptional')
    return schema._def.innerType._def.typeName;
  return schema._def.typeName;
}
