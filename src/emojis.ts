import type { EmojisJson } from "./types.ts";

export const loadEmojis = async (path: string): Promise<EmojisJson> => {
  const text = await Bun.file(path).text();
  const parsed = JSON.parse(text) as EmojisJson;

  if (!Array.isArray(parsed.emojis)) {
    throw new Error(`Invalid emojis.json at ${path}: missing 'emojis' array`);
  }

  return parsed;
};
