/* eslint-disable no-underscore-dangle */

import { getInnerType } from '@/utils/getInnerType';

import type { ZodTypeAny } from 'zod';

export function getTypeName(type: ZodTypeAny): string {
  return getInnerType(type)._def.typeName;
}
