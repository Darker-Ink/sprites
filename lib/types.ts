/**
 * Emoji providers shipped in this package, in fallback-priority order.
 */
export const PROVIDERS = [
  "twemoji",
  "fluentui-emoji",
  "noto-emoji",
] as const;

/**
 * Identifier for one of the three sprite providers.
 */
export type Provider = (typeof PROVIDERS)[number];

/**
 * Skin-tone codepoints in sprite-sheet order. Index 0 is the default (no
 * tone applied); indexes 1–5 correspond to the Fitzpatrick scale codes
 * `1F3FB`–`1F3FF`.
 */
export const TONE_CODES = [
  "",
  "1f3fb",
  "1f3fc",
  "1f3fd",
  "1f3fe",
  "1f3ff",
] as const;

/**
 * One of the six skin-tone codes (or `""` for "no tone applied").
 */
export type ToneCode = (typeof TONE_CODES)[number];

/**
 * Identifier for a sprite sheet within a provider's folder.
 *
 * - `"base"` — non-skinned emoji (42 × 39 grid)
 * - `"skin/1"` … `"skin/6"` — skin-tone variants (10 × 31 grid each),
 *   tones 1 → 6 = default, light, medium-light, medium, medium-dark, dark
 */
export type SpriteSheet =
  | "base"
  | "skin/1"
  | "skin/2"
  | "skin/3"
  | "skin/4"
  | "skin/5"
  | "skin/6";

/**
 * A single entry in `emojis.json`.
 *
 * Note: skin-tone variants live as separate entries with
 * `hasDiversityParent: true` and a `diversity` array containing the tone
 * codepoint. Use {@link tilePosition} to map an emoji (parent or child)
 * to its location on the sprite sheets without dealing with that
 * relationship manually.
 */
export interface Emoji {
  /** Aliases for this emoji (e.g. `["grinning", "grinning_face"]`). */
  names: string[];
  /** The emoji glyph as it would be rendered (e.g. `"👋"`). */
  surrogates: string;
  /** Unicode version this emoji was introduced in. */
  unicodeVersion: number;
  /**
   * Index of this emoji's tile within its sprite sheet (row-major).
   * Undefined for emoji that aren't laid out on a sheet (e.g. multi-skin
   * variants).
   */
  spriteIndex?: number;
  /** `true` if this emoji has skin-tone variants. */
  hasDiversity?: boolean;
  /** `true` if this emoji has multi-person skin-tone variants. */
  hasMultiDiversity?: boolean;
  /** `true` if this emoji is itself a skin-tone variant. */
  hasDiversityParent?: boolean;
  /** `true` if this emoji is itself a multi-skin variant. */
  hasMultiDiversityParent?: boolean;
  /** Tone codes applied to this variant (e.g. `["1f3fd"]`). */
  diversity?: string[];
  /** Indexes (into `emojis.emojis`) of this emoji's diversity variants. */
  diversityChildren?: number[];
}

/**
 * Top-level shape of `data/emojis.json`.
 */
export interface EmojisJson {
  /** All emoji entries, parents and variants intermixed. */
  emojis: Emoji[];
  /** Number of tiles in all skin-tone sheets combined. */
  numDiversitySprites: number;
  /** Number of tiles in the base sheet. */
  numNonDiversitySprites: number;
}

/**
 * Map of `emoji.name` → keyword synonyms. Sourced from
 * `data/secondary.json`. Roughly 40 % of emoji have entries here; the
 * rest fall through to their primary name.
 */
export type SecondaryMap = Record<string, string[]>;

/**
 * Map of textual emoticon → emoji name. Sourced from
 * `data/emoticon_mappings.json` (e.g. `"<3"` → `"heart"`).
 */
export type EmoticonMap = Record<string, string>;

/**
 * The result of resolving an {@link Emoji} to its sprite-sheet position.
 */
export interface TilePosition {
  /** Which sheet the tile lives on. */
  sheet: SpriteSheet;
  /** Pixel offset from the left edge of `sheet`. */
  x: number;
  /** Pixel offset from the top edge of `sheet`. */
  y: number;
  /** Width / height of the tile in pixels (always equals {@link SpriteMeta.cell}). */
  size: number;
}

/**
 * Constants describing the sprite-sheet layout this package was built
 * with. Useful for computing CSS rules without hard-coding numbers.
 */
export interface SpriteMeta {
  /** Cell size in pixels (square). */
  cell: number;
  /** Base sheet grid dimensions, in tiles. */
  base: { cols: number; rows: number };
  /** Skin-tone sheet grid dimensions, in tiles. */
  skin: { cols: number; rows: number };
  /** Provider list, in fallback-priority order. */
  providers: readonly Provider[];
}
