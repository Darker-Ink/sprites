export const PROVIDERS = [
  "twemoji",
  "fluentui-emoji",
  "noto-emoji",
] as const;

export type Provider = (typeof PROVIDERS)[number];

export const TONE_CODES = [
  "",
  "1f3fb",
  "1f3fc",
  "1f3fd",
  "1f3fe",
  "1f3ff",
] as const;

export type ToneCode = (typeof TONE_CODES)[number];

export interface Emoji {
  names: string[];
  surrogates: string;
  unicodeVersion: number;
  spriteIndex?: number;
  hasDiversity?: boolean;
  hasMultiDiversity?: boolean;
  hasDiversityParent?: boolean;
  hasMultiDiversityParent?: boolean;
  diversity?: string[];
  diversityChildren?: number[];
}

export interface EmojisJson {
  emojis: Emoji[];
  numDiversitySprites: number;
  numNonDiversitySprites: number;
}

export interface Composite {
  input: Buffer;
  left: number;
  top: number;
}

export interface PendingTile {
  svg: string;
  target: Composite[];
  left: number;
  top: number;
}

export interface GridDims {
  cols: number;
  rows: number;
}

export interface Config {
  output: string;
  vendor: string;
  fallbacks: string | null;
  data: string;
  providers: Provider[];
  cell: number;
  base: GridDims;
  skin: GridDims;
  concurrency: number;
  crossFallback: Provider[];
  quiet: boolean;
}

export type CodepointMap = Map<string, string>;
