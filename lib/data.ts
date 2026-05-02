import emojisRaw from "../data/emojis.json" with { type: "json" };
import secondaryRaw from "../data/secondary.json" with { type: "json" };
import emoticonsRaw from "../data/emoticon_mappings.json" with { type: "json" };
import type { EmojisJson, EmoticonMap, SecondaryMap } from "./types.js";

/**
 * The full curated emoji catalog. Roughly 3,800 entries including ~1,900
 * primary emoji and their skin-tone variants.
 *
 * Diversity children live alongside their parents in `emojis.emojis` and
 * are flagged via `hasDiversityParent` / `hasMultiDiversityParent`. Use
 * {@link tilePosition} to handle that mapping rather than walking the
 * relationships by hand.
 *
 * @example
 * ```ts
 * import { emojis } from "emoji-sprites";
 * console.log(emojis.emojis.length);
 * ```
 */
export const emojis = emojisRaw as unknown as EmojisJson;

/**
 * Map of primary emoji name → keyword synonyms (e.g. `"smile"` →
 * `["eye", "face", "grinning face with smiling eyes", ...]`).
 *
 * Used by {@link search} to broaden term matching beyond the primary
 * name list. Roughly 40 % of emoji have entries here.
 */
export const secondary = secondaryRaw as unknown as SecondaryMap;

/**
 * Map of textual emoticon → emoji name (e.g. `"<3"` → `"heart"`,
 * `":)"` → `"slight_smile"`). Used by {@link findByEmoticon}.
 */
export const emoticons = emoticonsRaw as unknown as EmoticonMap;
