export function formatIndex(index: number, force: boolean = false) {
  if (index === 1 && !force) return '';
  return ` #${index}`;
}
