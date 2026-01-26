#!/usr/bin/env node

import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import { build } from "./build.js";
import { DEFAULT_CONFIG, type DataExplorerConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HELP_TEXT = `
data-explorer - Static site generator for Malloy data models and notebooks

Usage:
  data-explorer build <input-path> [options]

Commands:
  build    Build the static site from Malloy files

Options:
  -o, --output <path>       Output directory for the built site (default: ./dist)
  -t, --title <title>       Site title (default: "Data Explorer")
  -d, --description <desc>  Home page description
  -b, --base-path <path>    Base public path for deployment (default: "/")
  -h, --help                Show this help message
  -v, --version             Show version number

Examples:
  data-explorer build ./models
  data-explorer build ./models -o ./dist -t "My Data Site"
  data-explorer build ./models --title "Sales Analytics" --description "Explore sales data"
`;

function showHelp(): void {
  console.log(HELP_TEXT);
  process.exit(0);
}

function showVersion(): void {
  console.log("data-explorer v0.0.1");
  process.exit(0);
}

function validateInputPath(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) {
    console.error(`Error: Input path does not exist: ${resolved}`);
    process.exit(1);
  }
  if (!statSync(resolved).isDirectory()) {
    console.error(`Error: Input path is not a directory: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      title: { type: "string", short: "t" },
      description: { type: "string", short: "d" },
      "base-path": { type: "string", short: "b" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.help) {
    showHelp();
  }

  if (values.version) {
    showVersion();
  }

  const command = positionals[0];

  if (!command) {
    console.error("Error: No command specified. Use --help for usage information.");
    process.exit(1);
  }

  if (command === "build") {
    const inputPath = positionals[1];
    if (!inputPath) {
      console.error("Error: No input path specified for build command.");
      console.error("Usage: data-explorer build <input-path> [options]");
      process.exit(1);
    }

    const config: DataExplorerConfig = {
      inputPath: validateInputPath(inputPath),
      outputPath: values.output ? resolve(values.output) : resolve("./dist"),
      title: values.title ?? DEFAULT_CONFIG.title,
      description: values.description ?? DEFAULT_CONFIG.description,
      basePath: values["base-path"] ?? DEFAULT_CONFIG.basePath,
    };

    // Get the package root (where vite.config.ts lives)
    const packageRoot = resolve(__dirname, "../..");

    console.log("Building data-explorer site...");
    console.log(`  Input:       ${config.inputPath}`);
    console.log(`  Output:      ${config.outputPath}`);
    console.log(`  Title:       ${config.title}`);
    console.log(`  Description: ${config.description}`);
    console.log(`  Base Path:   ${config.basePath}`);
    console.log("");

    await build(config, packageRoot);
  } else {
    console.error(`Error: Unknown command "${command}". Use --help for usage information.`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Build failed:", error);
  process.exit(1);
});
