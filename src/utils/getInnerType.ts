/* eslint-disable no-underscore-dangle */

import type { ZodTypeAny } from 'zod';

export function getInnerType(type: ZodTypeAny) {
  let currentType = type;

  while (
    currentType._def.typeName === 'ZodOptional' ||
    currentType._def.typeName === 'ZodDefault' ||
    currentType._def.typeName === 'ZodNullable'
  ) {
    currentType = currentType._def.innerType;
  }

  return currentType;
}
