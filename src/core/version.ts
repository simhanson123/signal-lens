import { createRequire } from "node:module";

const requireFromHere = createRequire(import.meta.url);
const pkg = requireFromHere("../../package.json") as { version: string };

export const VERSION: string = pkg.version;
