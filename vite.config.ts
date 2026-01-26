/// <reference types="vitest/config" />
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

interface DataExplorerConfig {
  inputPath: string;
  outputPath: string;
  title: string;
  description: string;
  basePath: string;
}

// Load config from file if it exists (when running via CLI)
function loadConfig(): DataExplorerConfig | null {
  const configPath =
    process.env["DATA_EXPLORER_CONFIG_PATH"] ??
    join(process.cwd(), ".data-explorer-config.json");

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as DataExplorerConfig;
  }
  return null;
}

const cliConfig = loadConfig();

// Default values for development (uses examples/sample-data)
const siteConfig = {
  title: cliConfig?.title ?? "Data Explorer",
  description:
    cliConfig?.description ??
    "Explore and analyze your Malloy models and notebooks",
  basePath: cliConfig?.basePath ?? process.env["BASE_PUBLIC_PATH"] ?? "/",
  modelsPath:
    cliConfig?.inputPath ?? resolve(process.cwd(), "examples/sample-data"),
};

// https://vite.dev/config/
const config: UserConfig = defineConfig({
  // NOTE: THIS PATH MUST END WITH A TRAILING SLASH
  base: siteConfig.basePath.endsWith("/")
    ? siteConfig.basePath
    : siteConfig.basePath + "/",
  plugins: [react(), svgr()],
  define: {
    "process.env": {},
    __DATA_EXPLORER_CONFIG__: JSON.stringify({
      title: siteConfig.title,
      description: siteConfig.description,
    }),
  },
  resolve: {
    alias: {
      "/models": siteConfig.modelsPath,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
export default config;
