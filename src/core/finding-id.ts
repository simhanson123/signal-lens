export function stableFindingId(
  prefix: string,
  title: string,
  file: string,
  snippet?: string
): string {
  const input = `${title}\0${file}\0${snippet ?? ""}`;
  return `${prefix}-${hash(input)}`;
}

function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
