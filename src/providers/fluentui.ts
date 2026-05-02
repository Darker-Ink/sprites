import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { normalizeKey, stringToCodepoints } from "../codepoints.ts";
import type { CodepointMap } from "../types.ts";

const TONE_FOLDERS: Record<string, string> = {
  "1f3fb": "Light",
  "1f3fc": "Medium-Light",
  "1f3fd": "Medium",
  "1f3fe": "Medium-Dark",
  "1f3ff": "Dark",
};

interface FluentMetadata {
  glyph?: string;
  unicodeSkintones?: string[];
}

const findColorSvg = async (dir: string): Promise<string | null> => {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const svg = files.find(f => f.toLowerCase().endsWith(".svg"));
  return svg ? join(dir, svg) : null;
};

const parseUnicodeString = (s: string): string[] => {
  return s
    .trim()
    .split(/\s+/)
    .map(c => c.toLowerCase().replace(/^u\+/, ""))
    .filter(Boolean);
};

const detectSkinTone = (codepoints: string[]): string | null => {
  for (const cp of codepoints) {
    if (TONE_FOLDERS[cp]) {
      return cp;
    }
  }
  return null;
};

const processAsset = async (
  assetsDir: string,
  asset: string,
  map: CodepointMap,
): Promise<void> => {
  const metaPath = join(assetsDir, asset, "metadata.json");

  let meta: FluentMetadata;
  try {
    const text = await Bun.file(metaPath).text();
    meta = JSON.parse(text);
  } catch {
    return;
  }

  if (!meta.glyph) {
    return;
  }

  if (meta.unicodeSkintones && meta.unicodeSkintones.length > 0) {
    for (const variant of meta.unicodeSkintones) {
      const cps = parseUnicodeString(variant);
      if (cps.length === 0) {
        continue;
      }

      const tone = detectSkinTone(cps);
      const folder = tone ? TONE_FOLDERS[tone]! : "Default";
      const svg = await findColorSvg(join(assetsDir, asset, folder, "Color"));
      if (!svg) {
        continue;
      }

      const key = normalizeKey(cps);
      if (!map.has(key)) {
        map.set(key, svg);
      }
    }
    return;
  }

  const cps = stringToCodepoints(meta.glyph);
  const svg =
    (await findColorSvg(join(assetsDir, asset, "Color"))) ??
    (await findColorSvg(join(assetsDir, asset, "Default", "Color")));

  if (!svg) {
    return;
  }

  const key = normalizeKey(cps);
  if (!map.has(key)) {
    map.set(key, svg);
  }
};

export const buildFluentUIIndex = async (root: string): Promise<CodepointMap> => {
  const map: CodepointMap = new Map();
  const assetsDir = join(root, "assets");

  let assets: string[];
  try {
    assets = await readdir(assetsDir);
  } catch {
    return map;
  }

  await Promise.all(assets.map(a => processAsset(assetsDir, a, map)));
  return map;
};
