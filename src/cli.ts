import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { defaults, parseProviderList } from "./config.ts";
import { loadEmojis } from "./emojis.ts";
import { buildFluentUIIndex } from "./providers/fluentui.ts";
import { buildNotoIndex } from "./providers/noto.ts";
import { buildTwemojiIndex } from "./providers/twemoji.ts";
import {
  buildFallbackIndex,
  buildNotoLetterMap,
  type ResolverContext,
} from "./resolve.ts";
import { buildProvider } from "./sprite.ts";
import {
  PROVIDERS,
  type CodepointMap,
  type Config,
  type Provider,
} from "./types.ts";

const HELP = `\
sprite generate — emoji sprite-sheet generator

Usage:
  bun generate [options]

Output
  -o, --output <dir>           sprite output dir              [./sprites]
  -p, --providers <list>       comma list of providers        [${PROVIDERS.join(",")}]

Sources
      --vendor <dir>           submodule root                 [./vendor]
      --data <file>            emojis.json path               [./data/emojis.json]

Fallbacks
      --fallbacks <dir>        custom fallback art root       [./fallbacks]
      --no-fallbacks           ignore custom fallback art
      --cross-fallback <list>  providers that get Twemoji
                               backfill                       [fluentui-emoji,noto-emoji]
      --no-cross-fallback      disable cross-provider Twemoji backfill

Sprite layout
      --cell <px>              cell size                      [80]
      --base-cols <n>          base grid columns              [42]
      --base-rows <n>          base grid rows                 [39]
      --skin-cols <n>          skin-tone grid columns         [10]
      --skin-rows <n>          skin-tone grid rows            [31]

Misc
      --concurrency <n>        max parallel rasterization     [64]
      --quiet                  suppress per-tile progress
  -h, --help                   show this help
`;

const num = (s: string | undefined, name: string): number | undefined => {
  if (s === undefined) {
    return undefined;
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`--${name} must be a positive number, got "${s}"`);
  }

  return n;
};

const buildConfig = (
  values: Record<string, string | boolean | undefined>,
): Config => {
  const config = defaults();

  if (typeof values.output === "string") {
    config.output = resolve(values.output);
  }
  if (typeof values.vendor === "string") {
    config.vendor = resolve(values.vendor);
  }
  if (typeof values.data === "string") {
    config.data = resolve(values.data);
  }
  if (typeof values.providers === "string") {
    config.providers = parseProviderList(values.providers);
  }

  if (values["no-fallbacks"]) {
    config.fallbacks = null;
  } else if (typeof values.fallbacks === "string") {
    config.fallbacks = resolve(values.fallbacks);
  }

  if (values["no-cross-fallback"]) {
    config.crossFallback = [];
  } else if (typeof values["cross-fallback"] === "string") {
    config.crossFallback = parseProviderList(values["cross-fallback"]);
  }

  const cell = num(values.cell as string | undefined, "cell");
  if (cell !== undefined) config.cell = cell;

  const bc = num(values["base-cols"] as string | undefined, "base-cols");
  if (bc !== undefined) config.base.cols = bc;

  const br = num(values["base-rows"] as string | undefined, "base-rows");
  if (br !== undefined) config.base.rows = br;

  const sc = num(values["skin-cols"] as string | undefined, "skin-cols");
  if (sc !== undefined) config.skin.cols = sc;

  const sr = num(values["skin-rows"] as string | undefined, "skin-rows");
  if (sr !== undefined) config.skin.rows = sr;

  const co = num(values.concurrency as string | undefined, "concurrency");
  if (co !== undefined) config.concurrency = co;

  if (values.quiet) {
    config.quiet = true;
  }

  return config;
};

const indexBuilders: Record<
  Provider,
  (root: string) => Promise<CodepointMap>
> = {
  twemoji: buildTwemojiIndex,
  "fluentui-emoji": buildFluentUIIndex,
  "noto-emoji": buildNotoIndex,
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: "string", short: "o" },
      providers: { type: "string", short: "p" },
      vendor: { type: "string" },
      data: { type: "string" },
      fallbacks: { type: "string" },
      "no-fallbacks": { type: "boolean" },
      "cross-fallback": { type: "string" },
      "no-cross-fallback": { type: "boolean" },
      cell: { type: "string" },
      "base-cols": { type: "string" },
      "base-rows": { type: "string" },
      "skin-cols": { type: "string" },
      "skin-rows": { type: "string" },
      concurrency: { type: "string" },
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const config = buildConfig(values);
  const log = config.quiet ? () => {} : (msg: string) => console.log(msg);

  const data = await loadEmojis(config.data);
  log(
    `loaded ${data.emojis.length} emoji entries (${data.numNonDiversitySprites} base + ${data.numDiversitySprites} diversity)`,
  );

  const providerIndex = new Map<Provider, CodepointMap>();
  await Promise.all(
    PROVIDERS.map(async p => {
      const map = await indexBuilders[p](resolve(config.vendor, p));
      providerIndex.set(p, map);
      log(`[${p}] indexed ${map.size} emoji from vendor`);
    }),
  );

  const fallbackIndex = new Map<Provider, CodepointMap>();
  await Promise.all(
    PROVIDERS.map(async p => {
      const map = await buildFallbackIndex(config.fallbacks, p);
      fallbackIndex.set(p, map);
      if (map.size > 0) {
        log(`[${p}] custom fallbacks: ${map.size}`);
      }
    }),
  );

  const notoLetterByCp = buildNotoLetterMap(providerIndex.get("noto-emoji")!);

  const ctx: ResolverContext = {
    config,
    providerIndex,
    fallbackIndex,
    notoLetterByCp,
  };

  log(`generating sprites for ${config.providers.join(", ")}`);

  const results = await Promise.all(
    config.providers.map(p => buildProvider(p, data, ctx, log)),
  );

  const totalMissing = results.reduce((sum, r) => sum + r.missing, 0);
  if (totalMissing > 0 && !config.quiet) {
    console.log(`\ndone with ${totalMissing} missing tiles total`);
  }
};

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`error: ${msg}`);
  process.exit(1);
});
