import Fuse from "fuse.js";
import { emojis as emojisData, secondary } from "./data.js";
import type { Emoji } from "./types.js";

interface IndexedEmoji {
  emoji: Emoji;
  names: string[];
  keywords: string[];
}

let cachedFuse: Fuse<IndexedEmoji> | null = null;
let cachedThreshold: number | null = null;

const DEFAULT_THRESHOLD = 0.3;

const buildEntries = (): IndexedEmoji[] => {
  const list: IndexedEmoji[] = [];

  for (const emoji of emojisData.emojis) {
    if (emoji.hasDiversityParent || emoji.hasMultiDiversityParent) {
      continue;
    }

    const keywords: string[] = [];
    const seen = new Set<string>();
    for (const name of emoji.names) {
      const kws = secondary[name];
      if (!kws) {
        continue;
      }
      for (const kw of kws) {
        if (!seen.has(kw)) {
          seen.add(kw);
          keywords.push(kw);
        }
      }
    }

    list.push({ emoji, names: emoji.names, keywords });
  }

  return list;
};

const buildFuse = (threshold: number): Fuse<IndexedEmoji> => {
  return new Fuse(buildEntries(), {
    keys: [
      { name: "names", weight: 2 },
      { name: "keywords", weight: 1 },
    ],
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 2,
    useExtendedSearch: true,
    includeScore: false,
    shouldSort: true,
  });
};

const SPLIT = /\s+/;

const buildPattern = (query: string): string => {
  const tokens: string[] = [];
  for (const t of query.split(SPLIT)) {
    if (t.length > 0) {
      tokens.push(t);
    }
  }
  if (tokens.length <= 1) {
    return tokens[0] ?? "";
  }
  return tokens.map(t => `'${t}`).join(" ");
};

const ensureFuse = (threshold: number): Fuse<IndexedEmoji> => {
  if (!cachedFuse || cachedThreshold !== threshold) {
    cachedFuse = buildFuse(threshold);
    cachedThreshold = threshold;
  }
  return cachedFuse;
};

/**
 * Options for {@link search}.
 */
export interface SearchOptions {
  /**
   * Maximum number of results to return, sorted by descending relevance.
   *
   * @defaultValue 25
   */
  limit?: number;
  /**
   * Fuzziness threshold passed to Fuse.js. `0` requires a perfect match,
   * `1` matches anything; lower values are stricter.
   *
   * Changing this between calls rebuilds the underlying index, so prefer
   * a single value across an app.
   *
   * @defaultValue 0.3
   */
  threshold?: number;
}

/**
 * Fuzzy-search emoji by name and keyword.
 *
 * Backed by [Fuse.js](https://www.fusejs.io/) over a lazily-built index of
 * `data/emojis.json` (primary names, weight 2) and `data/secondary.json`
 * (keyword synonyms, weight 1). Results tolerate typos (`"smily"` →
 * `"smiley"`), partial matches, and rank exact / starts-with hits higher
 * than substring hits.
 *
 * Skin-tone variants (diversity children) are excluded — pass the parent
 * to {@link tilePosition} and pick a tone separately if you need a
 * specific skin tone.
 *
 * The first call instantiates the index (~3–5 ms for ~1900 entries).
 * Subsequent calls reuse the cached index unless `threshold` changes.
 *
 * @param query - Free-form search text. Empty / whitespace returns `[]`.
 * @param options - Optional behavior overrides
 * @returns Matching emoji sorted by descending relevance
 *
 * @example
 * ```ts
 * import { search } from "emoji-sprites";
 *
 * search("smiling face");      // 😊 😄 😃 ...
 * search("smily");             // 😃 (typo-tolerant)
 * search("flag france");       // 🇫🇷
 * search("party", { limit: 5 });
 * ```
 */
export const search = (query: string, options?: SearchOptions): Emoji[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const limit = options?.limit ?? 25;
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

  const fuse = ensureFuse(threshold);
  const pattern = buildPattern(trimmed);
  if (pattern.length === 0) {
    return [];
  }
  const results = fuse.search(pattern, { limit });

  const out: Emoji[] = new Array(results.length);
  for (let i = 0; i < results.length; i++) {
    out[i] = results[i]!.item.emoji;
  }
  return out;
};

/**
 * Eagerly build the search index. Subsequent {@link search} calls skip
 * the one-time setup cost.
 *
 * Useful in environments where the first interaction needs to feel
 * instant (e.g. an emoji picker that opens in response to a keystroke).
 *
 * @param threshold - Optional threshold to pre-warm with; defaults to the
 *   same as {@link search}'s default. Pre-warming with a different
 *   threshold than you later pass to `search` will rebuild the index.
 *
 * @example
 * ```ts
 * import { warmSearchIndex } from "emoji-sprites";
 * warmSearchIndex(); // pay the ~5 ms setup now
 * ```
 */
export const warmSearchIndex = (threshold = DEFAULT_THRESHOLD): void => {
  ensureFuse(threshold);
};
