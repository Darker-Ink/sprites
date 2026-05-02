import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { normalizeKey } from "../codepoints.ts";
import type { CodepointMap } from "../types.ts";

export const buildTwemojiIndex = async (root: string): Promise<CodepointMap> => {
  const map: CodepointMap = new Map();
  const dir = join(root, "assets", "svg");

  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return map;
  }

  for (const f of files) {
    if (!f.endsWith(".svg")) {
      continue;
    }

    const stem = f.slice(0, -4);
    const key = normalizeKey(stem.split("-"));
    if (!map.has(key)) {
      map.set(key, join(dir, f));
    }
  }

  return map;
};
