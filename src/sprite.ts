import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveSvg, type ResolverContext } from "./resolve.ts";
import {
  TONE_CODES,
  type Composite,
  type Emoji,
  type EmojisJson,
  type PendingTile,
  type Provider,
} from "./types.ts";

const rasterize = (svgPath: string, cell: number): Promise<Buffer> => {
  return sharp(svgPath, { density: 384 })
    .resize(cell, cell, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
};

const findDiversityChild = (
  data: EmojisJson,
  parent: Emoji,
  toneCode: string,
): Emoji | null => {
  const children = parent.diversityChildren ?? [];

  for (const idx of children) {
    const child = data.emojis[idx];
    if (!child) {
      continue;
    }
    if (child.hasDiversityParent !== true) {
      continue;
    }
    if ((child.diversity?.[0] ?? "") !== toneCode) {
      continue;
    }
    return child;
  }

  return null;
};

type Logger = (msg: string) => void;

const drainQueue = async (
  queue: PendingTile[],
  cell: number,
  concurrency: number,
  onTile: () => void,
): Promise<void> => {
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const i = cursor++;
      const tile = queue[i]!;
      const buf = await rasterize(tile.svg, cell);
      tile.target.push({ input: buf, left: tile.left, top: tile.top });
      onTile();
    }
  };

  const workers = Math.max(1, Math.min(concurrency, queue.length));
  await Promise.all(Array.from({ length: workers }, worker));
};

export const buildProvider = async (
  provider: Provider,
  data: EmojisJson,
  ctx: ResolverContext,
  log: Logger,
): Promise<{ processed: number; missing: number }> => {
  const { config } = ctx;
  const outDir = join(config.output, provider);
  await mkdir(outDir, { recursive: true });

  const cell = config.cell;
  const baseTiles: Composite[] = [];
  const skinTiles: Composite[][] = Array.from({ length: 6 }, () => []);
  const pending: PendingTile[] = [];
  let missing = 0;

  const basePos = (i: number) => ({
    left: (i % config.base.cols) * cell,
    top: Math.floor(i / config.base.cols) * cell,
  });

  const skinPos = (i: number) => ({
    left: (i % config.skin.cols) * cell,
    top: Math.floor(i / config.skin.cols) * cell,
  });

  const enqueue = (
    emoji: Emoji,
    target: Composite[],
    pos: { left: number; top: number },
  ) => {
    const svg = resolveSvg(ctx, provider, emoji);
    if (!svg) {
      log(`[${provider}] missing ${emoji.surrogates}`);
      missing++;
      return;
    }
    pending.push({ svg, target, left: pos.left, top: pos.top });
  };

  for (const emoji of data.emojis) {
    if (emoji.hasDiversityParent || emoji.hasMultiDiversityParent) {
      continue;
    }
    if (emoji.spriteIndex === undefined) {
      continue;
    }

    if (emoji.hasDiversity === true) {
      const pos = skinPos(emoji.spriteIndex);
      enqueue(emoji, skinTiles[0]!, pos);

      for (let i = 1; i < TONE_CODES.length; i++) {
        const child = findDiversityChild(data, emoji, TONE_CODES[i]!);
        if (!child) {
          continue;
        }
        enqueue(child, skinTiles[i]!, pos);
      }
    } else {
      const pos = basePos(emoji.spriteIndex);
      enqueue(emoji, baseTiles, pos);
    }
  }

  let processed = 0;
  await drainQueue(pending, cell, config.concurrency, () => processed++);

  log(`[${provider}] compositing base_sprites.png (${baseTiles.length} tiles)`);
  await sharp({
    create: {
      width: config.base.cols * cell,
      height: config.base.rows * cell,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(baseTiles)
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, "base_sprites.png"));

  await Promise.all(
    skinTiles.map(async (tiles, i) => {
      const file = join(outDir, `skin_tone_${i + 1}.png`);
      log(
        `[${provider}] compositing skin_tone_${i + 1}.png (${tiles.length} tiles)`,
      );

      await sharp({
        create: {
          width: config.skin.cols * cell,
          height: config.skin.rows * cell,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(tiles)
        .png({ compressionLevel: 9 })
        .toFile(file);
    }),
  );

  log(`[${provider}] done — ${processed} placed, ${missing} missing`);
  return { processed, missing };
};
