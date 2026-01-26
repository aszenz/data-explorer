#!/usr/bin/env npx tsx

/**
 * Builds all example sites and assembles them with the landing page.
 * Output structure:
 *   dist/
 *     index.html       (landing page)
 *     favicon.svg
 *     ecommerce/       (ecommerce example site)
 *     huggingface/     (huggingface example site)
 *     sample-data/     (sample-data example site)
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
} from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

interface Example {
  name: string;
  inputPath: string;
  title: string;
  description: string;
}

const EXAMPLES: Example[] = [
  {
    name: "ecommerce",
    inputPath: "examples/ecommerce",
    title: "E-commerce Analytics",
    description: "Explore orders, products, and customer data",
  },
  {
    name: "huggingface",
    inputPath: "examples/huggingface",
    title: "Hugging Face Datasets",
    description: "GitHub Events, IMDB Movies, and NYC Taxi data",
  },
  {
    name: "sample-data",
    inputPath: "examples/sample-data",
    title: "Sample Data Collection",
    description: "Various local data formats and models",
  },
];

async function buildExample(example: Example, outputBase: string): Promise<void> {
  const { build } = await import("../src/cli/build.js");

  const config = {
    inputPath: resolve(PROJECT_ROOT, example.inputPath),
    outputPath: resolve(outputBase, example.name),
    title: example.title,
    description: example.description,
    basePath: `/${example.name}/`,
  };

  console.log(`\nBuilding: ${example.name}`);
  console.log(`  Input:  ${config.inputPath}`);
  console.log(`  Output: ${config.outputPath}`);

  await build(config, PROJECT_ROOT);
}

async function main(): Promise<void> {
  const outputDir = resolve(PROJECT_ROOT, "dist");

  console.log("Building all examples...");
  console.log(`Output directory: ${outputDir}`);

  // Clean output directory
  if (existsSync(outputDir)) {
    console.log("\nCleaning previous build...");
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });

  // Build each example
  for (const example of EXAMPLES) {
    try {
      await buildExample(example, outputDir);
    } catch (error) {
      console.error(`Failed to build ${example.name}:`, error);
      process.exit(1);
    }
  }

  // Copy landing page
  console.log("\nCopying landing page...");
  const landingDir = resolve(PROJECT_ROOT, "landing");
  if (existsSync(landingDir)) {
    for (const file of readdirSync(landingDir)) {
      cpSync(resolve(landingDir, file), resolve(outputDir, file), {
        recursive: true,
      });
    }
  }

  // Copy favicon to root
  const faviconSrc = resolve(PROJECT_ROOT, "public/favicon.svg");
  if (existsSync(faviconSrc)) {
    cpSync(faviconSrc, resolve(outputDir, "favicon.svg"));
  }

  console.log("\n" + "=".repeat(50));
  console.log("Build complete!");
  console.log(`Output: ${outputDir}`);
  console.log("\nStructure:");
  console.log("  dist/");
  console.log("    index.html");
  for (const example of EXAMPLES) {
    console.log(`    ${example.name}/`);
  }
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
