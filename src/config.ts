import { resolve } from "node:path";
import { PROVIDERS, type Config, type Provider } from "./types.ts";

export const defaults = (): Config => ({
  output: resolve("sprites"),
  vendor: resolve("vendor"),
  fallbacks: resolve("fallbacks"),
  data: resolve("data/emojis.json"),
  providers: [...PROVIDERS],
  cell: 80,
  base: { cols: 42, rows: 39 },
  skin: { cols: 10, rows: 31 },
  concurrency: 64,
  crossFallback: ["fluentui-emoji", "noto-emoji"],
  quiet: false,
});

export const isProvider = (s: string): s is Provider => {
  return (PROVIDERS as readonly string[]).includes(s);
};

export const parseProviderList = (s: string): Provider[] => {
  const items = s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  for (const item of items) {
    if (!isProvider(item)) {
      throw new Error(
        `Unknown provider "${item}". Valid: ${PROVIDERS.join(", ")}`,
      );
    }
  }

  return items as Provider[];
};
