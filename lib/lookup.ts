import { emojis as emojisData, emoticons as emoticonsData } from "./data.js";
import type { Emoji } from "./types.js";

let surrogateMap: Map<string, Emoji> | null = null;
let nameMap: Map<string, Emoji> | null = null;

const buildSurrogateMap = (): Map<string, Emoji> => {
  const map = new Map<string, Emoji>();
  for (const emoji of emojisData.emojis) {
    map.set(emoji.surrogates, emoji);
  }
  return map;
};

const buildNameMap = (): Map<string, Emoji> => {
  const map = new Map<string, Emoji>();
  for (const emoji of emojisData.emojis) {
    for (const name of emoji.names) {
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, emoji);
      }
    }
  }
  return map;
};

const ensureSurrogateMap = (): Map<string, Emoji> => {
  if (!surrogateMap) {
    surrogateMap = buildSurrogateMap();
  }
  return surrogateMap;
};

const ensureNameMap = (): Map<string, Emoji> => {
  if (!nameMap) {
    nameMap = buildNameMap();
  }
  return nameMap;
};

/**
 * Look up an emoji by its rendered glyph (the `surrogates` string).
 *
 * @param surrogate - The emoji glyph (e.g. `"👋"`)
 * @returns The matching emoji, or `undefined` if not in the catalog
 *
 * @example
 * ```ts
 * findBySurrogate("👋"); // waving hand
 * ```
 */
export const findBySurrogate = (surrogate: string): Emoji | undefined => {
  return ensureSurrogateMap().get(surrogate);
};

/**
 * Look up an emoji by one of its names. Case-insensitive; surrounding
 * colons (`":wave:"`) are stripped automatically. The first emoji
 * registered under a given name wins (i.e. parents beat skin-tone
 * variants for shared names).
 *
 * @param name - The emoji name, optionally wrapped in colons
 * @returns The matching emoji, or `undefined` if no name matches
 *
 * @example
 * ```ts
 * findByName("grinning");   // 😀
 * findByName(":wave:");     // 👋
 * findByName("WAVE");       // 👋
 * ```
 */
export const findByName = (name: string): Emoji | undefined => {
  const stripped = name.replace(/^:|:$/g, "");
  return ensureNameMap().get(stripped.toLowerCase());
};

/**
 * Look up an emoji by a textual emoticon (e.g. `":)"`, `"<3"`,
 * `":-D"`). The emoticon is resolved through `data/emoticon_mappings.json`
 * to a name and then through {@link findByName}.
 *
 * @param emoticon - The textual emoticon
 * @returns The matching emoji, or `undefined` if the emoticon is unknown
 *
 * @example
 * ```ts
 * findByEmoticon("<3"); // ❤️
 * findByEmoticon(":)"); // 🙂
 * ```
 */
export const findByEmoticon = (emoticon: string): Emoji | undefined => {
  const name = emoticonsData[emoticon];
  return name ? findByName(name) : undefined;
};

/**
 * Try {@link findBySurrogate}, {@link findByName}, then
 * {@link findByEmoticon} in order, returning the first hit.
 *
 * Convenient when you don't know which form the input takes — for
 * example, parsing user-submitted text where `:wave:`, `👋`, and `:)`
 * are all valid.
 *
 * For multi-token / typo-tolerant matching, use {@link search} instead.
 *
 * @param input - A glyph, name (with or without colons), or emoticon
 * @returns The matching emoji, or `undefined` if nothing resolves
 *
 * @example
 * ```ts
 * findEmoji("👋");       // by glyph
 * findEmoji(":wave:");   // by name
 * findEmoji("<3");       // by emoticon
 * ```
 */
export const findEmoji = (input: string): Emoji | undefined => {
  return (
    findBySurrogate(input) ?? findByName(input) ?? findByEmoticon(input)
  );
};
