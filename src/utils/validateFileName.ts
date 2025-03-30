export function validateFileName(fileName: string) {
  return /^[a-zA-Z0-9_]+$/.test(fileName);
}
