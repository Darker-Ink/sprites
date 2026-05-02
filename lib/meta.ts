import { PROVIDERS, type SpriteMeta } from "./types.js";

/**
 * Sprite-sheet layout constants. Read these instead of hard-coding cell
 * size or grid dimensions in your CSS / canvas code so you don't drift
 * out of sync with the published sheets.
 *
 * @example
 * ```ts
 * import { meta } from "emoji-sprites";
 * // CSS:
 * //   width: ${meta.cell}px; height: ${meta.cell}px;
 * ```
 */
export const meta: SpriteMeta = {
  cell: 80,
  base: { cols: 42, rows: 39 },
  skin: { cols: 10, rows: 31 },
  providers: PROVIDERS,
};
