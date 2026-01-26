import {
  build as viteBuild,
  preview as vitePreview,
  createLogger,
  type InlineConfig,
  type PreviewServer,
} from "vite";
import { writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DataExplorerConfig } from "./types.js";

/**
 * Build the data-explorer static site using Vite's API
 */
export async function build(
  config: DataExplorerConfig,
  packageRoot: string
): Promise<void> {
  const configPath = join(packageRoot, ".data-explorer-config.json");

  writeFileSync(configPath, JSON.stringify(config, null, 2));

  try {
    process.env["DATA_EXPLORER_CONFIG_PATH"] = configPath;

    const viteConfig: InlineConfig = {
      root: packageRoot,
      configFile: join(packageRoot, "vite.config.ts"),
      build: {
        outDir: config.outputPath,
        emptyOutDir: true,
      },
      logLevel: "info",
      customLogger: createLogger("info", { prefix: "[data-explorer]" }),
    };

    await viteBuild(viteConfig);

    console.log("");
    console.log("Build completed successfully!");
    console.log(`Output: ${config.outputPath}`);
  } finally {
    if (existsSync(configPath)) {
      rmSync(configPath);
    }
    delete process.env["DATA_EXPLORER_CONFIG_PATH"];
  }
}

/**
 * Preview the built site using Vite's preview server
 */
export async function preview(
  outputPath: string,
  port: number = 3000
): Promise<PreviewServer> {
  const viteConfig: InlineConfig = {
    preview: {
      port,
      open: true,
    },
    build: {
      outDir: outputPath,
    },
  };

  const server = await vitePreview(viteConfig);

  console.log("");
  console.log(`Preview server running at:`);
  server.printUrls();

  return server;
}
