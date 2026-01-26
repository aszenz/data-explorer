import { build as viteBuild, createLogger, type InlineConfig } from "vite";
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
  // Write config to a temporary JSON file that vite.config.ts will read
  const configPath = join(packageRoot, ".data-explorer-config.json");

  writeFileSync(
    configPath,
    JSON.stringify(
      {
        inputPath: config.inputPath,
        outputPath: config.outputPath,
        title: config.title,
        description: config.description,
        basePath: config.basePath,
      },
      null,
      2
    )
  );

  try {
    // Set environment variable for vite.config.ts to find the config
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
    // Clean up config file and env variable
    if (existsSync(configPath)) {
      rmSync(configPath);
    }
    delete process.env["DATA_EXPLORER_CONFIG_PATH"];
  }
}
