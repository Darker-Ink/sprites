import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { normalizeKey } from "../codepoints.ts";
import type { CodepointMap } from "../types.ts";

export const buildNotoIndex = async (root: string): Promise<CodepointMap> => {
  const map: CodepointMap = new Map();
  const dir = join(root, "svg");

  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return map;
  }

  for (const f of files) {
    if (!f.endsWith(".svg") || !f.startsWith("emoji_u")) {
      continue;
    }

    const stem = f.slice("emoji_u".length, -4);
    const key = normalizeKey(stem.split("_"));
    if (!map.has(key)) {
      map.set(key, join(dir, f));
    }
  }

  return map;
};
