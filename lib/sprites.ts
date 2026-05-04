import { fileURLToPath } from "node:url";
import { emojis as emojisData } from "./data.js";
import { meta } from "./meta.js";
import {
  TONE_CODES,
  type Emoji,
  type Provider,
  type SpriteFormat,
  type SpriteSheet,
  type TilePosition,
} from "./types.js";

const SHEET_BASENAMES: Record<SpriteSheet, string> = {
  base: "base_sprites",
  "skin/1": "skin_tone_1",
  "skin/2": "skin_tone_2",
  "skin/3": "skin_tone_3",
  "skin/4": "skin_tone_4",
  "skin/5": "skin_tone_5",
  "skin/6": "skin_tone_6",
};

const PACKAGE_ROOT = new URL("../", import.meta.url);

/**
 * Resolve a sprite sheet to a URL string suitable for use in CSS
 * `background-image`, `<img src>`, or anywhere else a URL is accepted.
 *
 * In Node this returns a `file://` URL; in bundlers (Vite, webpack 5,
 * Rollup, Bun) it resolves to whatever asset URL the bundler produces
 * for the underlying image.
 *
 * Each sheet ships as both PNG (lossless, broadly compatible) and WebP
 * (lossless, ~30–50 % smaller). Pass `format: "webp"` to opt into the
 * smaller variant.
 *
 * @param provider - Which provider's art to use
 * @param sheet - Which sheet within the provider
 * @param format - Output format, `"png"` (default) or `"webp"`
 * @returns A URL string pointing at the sprite image
 *
 * @example
 * ```ts
 * import { spriteUrl } from "emoji-sprites";
 * const png  = spriteUrl("twemoji", "base");
 * const webp = spriteUrl("twemoji", "base", "webp");
 * ```
 */
export const spriteUrl = (
  provider: Provider,
  sheet: SpriteSheet,
  format: SpriteFormat = "png",
): string => {
  const base = SHEET_BASENAMES[sheet];
  if (!base) {
    throw new Error(`Unknown sprite sheet: ${sheet}`);
  }
  if (format !== "png" && format !== "webp") {
    throw new Error(`Unknown sprite format: ${format}`);
  }
  return new URL(`sprites/${provider}/${base}.${format}`, PACKAGE_ROOT).href;
};

/**
 * Resolve a sprite sheet to an absolute filesystem path. **Node only** —
 * uses `node:url`'s `fileURLToPath`. Use {@link spriteUrl} for browser
 * code.
 *
 * @param provider - Which provider's art to use
 * @param sheet - Which sheet within the provider
 * @param format - Output format, `"png"` (default) or `"webp"`
 * @returns An absolute path to the sprite image on disk
 *
 * @example
 * ```ts
 * import { spritePath } from "emoji-sprites";
 * const file = spritePath("noto-emoji", "skin/3", "webp");
 * ```
 */
export const spritePath = (
  provider: Provider,
  sheet: SpriteSheet,
  format: SpriteFormat = "png",
): string => {
  return fileURLToPath(spriteUrl(provider, sheet, format));
};

let parentByChild: Map<Emoji, Emoji> | null = null;

const ensureParentLookup = (): Map<Emoji, Emoji> => {
  if (parentByChild) {
    return parentByChild;
  }

  const map = new Map<Emoji, Emoji>();
  for (const parent of emojisData.emojis) {
    if (!parent.hasDiversity || !parent.diversityChildren) {
      continue;
    }
    for (const idx of parent.diversityChildren) {
      const child = emojisData.emojis[idx];
      if (child) {
        map.set(child, parent);
      }
    }
  }

  parentByChild = map;
  return map;
};

/**
 * Compute the sprite-sheet position of an emoji.
 *
 * Handles both base emoji and skin-tone children: pass any {@link Emoji}
 * (parent or variant) and you'll get back the sheet identifier and pixel
 * offset to render it.
 *
 * Returns `null` for entries that aren't laid out on the sheets — in
 * particular multi-person multi-skin combinations
 * (`hasMultiDiversity` / `hasMultiDiversityParent`), and any emoji
 * missing a `spriteIndex`.
 *
 * @param emoji - The emoji to position
 * @returns The tile location, or `null` if the emoji isn't on a sheet
 *
 * @example
 * ```ts
 * import { findEmoji, tilePosition, spriteUrl } from "emoji-sprites";
 *
 * const emoji = findEmoji("👋");
 * const tile = tilePosition(emoji);
 * if (tile) {
 *   const url = spriteUrl("twemoji", tile.sheet);
 *   // CSS:
 *   //   background-image: url(${url});
 *   //   background-position: -${tile.x}px -${tile.y}px;
 *   //   width: ${tile.size}px; height: ${tile.size}px;
 * }
 * ```
 */
export const tilePosition = (emoji: Emoji): TilePosition | null => {
  if (emoji.hasMultiDiversity || emoji.hasMultiDiversityParent) {
    return null;
  }

  const cell = meta.cell;

  if (emoji.hasDiversityParent) {
    const parent = ensureParentLookup().get(emoji);
    if (!parent || parent.spriteIndex === undefined) {
      return null;
    }

    const tone = emoji.diversity?.[0] ?? "";
    const toneIdx = (TONE_CODES as readonly string[]).indexOf(tone);
    if (toneIdx <= 0) {
      return null;
    }

    return {
      sheet: `skin/${toneIdx + 1}` as SpriteSheet,
      x: (parent.spriteIndex % meta.skin.cols) * cell,
      y: Math.floor(parent.spriteIndex / meta.skin.cols) * cell,
      size: cell,
    };
  }

  if (emoji.spriteIndex === undefined) {
    return null;
  }

  if (emoji.hasDiversity) {
    return {
      sheet: "skin/1",
      x: (emoji.spriteIndex % meta.skin.cols) * cell,
      y: Math.floor(emoji.spriteIndex / meta.skin.cols) * cell,
      size: cell,
    };
  }

  return {
    sheet: "base",
    x: (emoji.spriteIndex % meta.base.cols) * cell,
    y: Math.floor(emoji.spriteIndex / meta.base.cols) * cell,
    size: cell,
  };
};
