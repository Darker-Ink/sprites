import type { Emoji } from "./types.ts";

const padCodepoint = (cp: string): string => {
  return cp.length < 4 ? cp.padStart(4, "0") : cp;
};

export const surrogateToCodepoints = (s: string): string[] => {
  return Array.from(s).map(c => padCodepoint(c.codePointAt(0)!.toString(16)));
};

export const stringToCodepoints = surrogateToCodepoints;

export const normalizeKey = (codepoints: string[]): string => {
  return codepoints
    .map(c => padCodepoint(c.toLowerCase()))
    .filter(c => c !== "fe0f")
    .join("-");
};

export const stemOf = (emoji: Emoji): string => {
  return normalizeKey(surrogateToCodepoints(emoji.surrogates));
};

export const keyFromFilename = (filename: string): string => {
  const stem = filename.replace(/\.svg$/i, "");
  return normalizeKey(stem.split("-"));
};

export const isFlag = (emoji: Emoji): boolean => {
  const cps = surrogateToCodepoints(emoji.surrogates).map(c => parseInt(c, 16));

  if (cps.every(c => c >= 0x1f1e6 && c <= 0x1f1ff)) {
    return true;
  }

  if (cps[0] === 0x1f3f4 && cps.some(c => c >= 0xe0020 && c <= 0xe007f)) {
    return true;
  }

  return false;
};

export const isStandaloneRegionalIndicator = (emoji: Emoji): boolean => {
  const cps = surrogateToCodepoints(emoji.surrogates).filter(c => c !== "fe0f");

  if (cps.length !== 1) {
    return false;
  }

  const cp = parseInt(cps[0]!, 16);
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
};
