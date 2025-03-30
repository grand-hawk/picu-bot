import mime from 'mime-types';

export function extensionFromMimeType(mimeType: string) {
  let extension = mime.extension(mimeType);

  if (extension) {
    extension = extension.replace(/^qt$/, 'mov');
  }

  return extension;
}
