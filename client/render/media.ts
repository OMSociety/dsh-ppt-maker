/** Canvas media is served from the active project's media/ directory. */
export function canvasMediaUrl(ref: unknown, resolve?: (path: string) => string): string {
  if (typeof ref !== 'string') return ''
  const relative = ref.replaceAll('\\', '/')
  const parts = relative.split('/')
  if (parts.length < 2 || parts[0] !== 'media' || relative.includes(':') || parts.some(p => !p || p === '.' || p === '..')) return ''
  return resolve ? resolve(relative) : parts.map(encodeURIComponent).join('/')
}
