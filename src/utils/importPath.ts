import { platform } from 'node:os';

// https://nodejs.org/api/errors.html#err_unsupported_esm_url_scheme
export function importPath(path: string) {
  if (path.startsWith('file://')) return path;
  return platform() === 'win32' ? `file://${path}` : path;
}
