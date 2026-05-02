import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  isFlag,
  isStandaloneRegionalIndicator,
  normalizeKey,
  stemOf,
  surrogateToCodepoints,
} from "./codepoints.ts";
import type {
  CodepointMap,
  Config,
  Emoji,
  Provider,
} from "./types.ts";

export interface ResolverContext {
  config: Config;
  providerIndex: Map<Provider, CodepointMap>;
  fallbackIndex: Map<Provider, CodepointMap>;
  notoLetterByCp: Map<string, string>;
}

export const buildFallbackIndex = async (
  base: string | null,
  provider: Provider,
): Promise<CodepointMap> => {
  const map: CodepointMap = new Map();
  if (!base) {
    return map;
  }

  const dir = join(base, provider);

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
    map.set(key, join(dir, f));
  }

  return map;
};

export const buildNotoLetterMap = (
  notoIndex: CodepointMap,
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const [key, file] of notoIndex) {
    const parts = key.split("-");
    if (parts.length !== 2) {
      continue;
    }

    const [a, b] = parts;
    if (!a || !b || !a.startsWith("1f1") || !b.startsWith("1f1")) {
      continue;
    }

    if (!map.has(a)) {
      map.set(a, file);
    }
  }

  return map;
};

const resolveFallback = (
  ctx: ResolverContext,
  provider: Provider,
  emoji: Emoji,
): string | null => {
  const stem = stemOf(emoji);

  const own = ctx.fallbackIndex.get(provider)?.get(stem);
  if (own) {
    return own;
  }

  if (provider !== "twemoji" && ctx.config.crossFallback.includes(provider)) {
    const tw = ctx.fallbackIndex.get("twemoji")?.get(stem);
    if (tw) {
      return tw;
    }

    const twUpstream = ctx.providerIndex.get("twemoji")?.get(stem);
    if (twUpstream) {
      return twUpstream;
    }
  }

  return null;
};

export const resolveSvg = (
  ctx: ResolverContext,
  provider: Provider,
  emoji: Emoji,
): string | null => {
  if (isStandaloneRegionalIndicator(emoji)) {
    if (provider === "noto-emoji") {
      const cp = surrogateToCodepoints(emoji.surrogates)[0]!.toLowerCase();
      const file = ctx.notoLetterByCp.get(cp);
      if (file) {
        return file;
      }
    }

    return resolveFallback(ctx, provider, emoji);
  }

  if (isFlag(emoji)) {
    return resolveFallback(ctx, provider, emoji);
  }

  const stem = stemOf(emoji);
  const found = ctx.providerIndex.get(provider)?.get(stem);
  if (found) {
    return found;
  }

  return resolveFallback(ctx, provider, emoji);
};
