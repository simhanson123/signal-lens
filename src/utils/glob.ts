/** Simple glob matcher for ignore paths (supports `**` and `*`). */
export function matchesGlob(path: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "§§")
        .replace(/\*/g, "[^/]*")
        .replace(/§§/g, ".*") +
      "$"
  );
  return regex.test(path);
}

export function isIgnored(path: string, patterns: string[]): boolean {
  return patterns.some((p) => matchesGlob(path, p));
}