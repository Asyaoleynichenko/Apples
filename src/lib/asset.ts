/** Public files, prefixed with Vite `base` so GitHub Pages subpaths resolve. */
export function asset(file: string) {
  const name = file.replace(/^\/?(assets\/)?/, '');
  return `${import.meta.env.BASE_URL}assets/${name}`;
}
