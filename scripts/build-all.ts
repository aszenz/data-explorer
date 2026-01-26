#!/usr/bin/env npx tsx

/**
 * Builds all example sites and assembles them with the landing page.
 *
 * Environment variables:
 *   BASE_PATH - Base path for deployment (e.g., "/data-explorer/" for GitHub Pages)
 *
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
  readFileSync,
  writeFileSync,
} from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// Get base path from environment, default to "/"
const BASE_PATH = process.env["BASE_PATH"] || "/";
const normalizedBasePath = BASE_PATH.endsWith("/") ? BASE_PATH : BASE_PATH + "/";

interface Example {
  name: string;
  inputPath: string;
  title: string;
  description: string;
  tag: string;
  tagLabel: string;
}

const EXAMPLES: Example[] = [
  {
    name: "ecommerce",
    inputPath: "examples/ecommerce",
    title: "E-commerce Analytics",
    description: "Orders, products, and customer analysis with multi-table joins and visualizations.",
    tag: "Local CSV",
    tagLabel: "local",
  },
  {
    name: "huggingface",
    inputPath: "examples/huggingface",
    title: "Hugging Face Datasets",
    description: "GitHub Events, IMDB Movies, and NYC Taxi data from remote Hugging Face datasets.",
    tag: "Remote Data",
    tagLabel: "remote",
  },
  {
    name: "sample-data",
    inputPath: "examples/sample-data",
    title: "Sample Data Collection",
    description: "Various local data formats including CSV, Parquet, JSON, and Excel files.",
    tag: "Mixed Formats",
    tagLabel: "mixed",
  },
];

async function buildExample(example: Example, outputBase: string): Promise<void> {
  const { build } = await import("../src/cli/build.js");

  // Combine base path with example name
  const exampleBasePath = `${normalizedBasePath}${example.name}/`;

  const config = {
    inputPath: resolve(PROJECT_ROOT, example.inputPath),
    outputPath: resolve(outputBase, example.name),
    title: example.title,
    description: example.description,
    basePath: exampleBasePath,
  };

  console.log(`\nBuilding: ${example.name}`);
  console.log(`  Input:     ${config.inputPath}`);
  console.log(`  Output:    ${config.outputPath}`);
  console.log(`  Base Path: ${config.basePath}`);

  await build(config, PROJECT_ROOT);
}

function generateLandingPage(): string {
  const exampleCards = EXAMPLES.map(
    (ex) => `
        <a href="./${ex.name}/" class="example-card">
          <h3>${ex.title}</h3>
          <p>${ex.description}</p>
          <span class="tag">${ex.tag}</span>
        </a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Data Explorer - Malloy Static Site Generator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      --color-text-primary: #111111;
      --color-text-secondary: #4b5563;
      --color-text-tertiary: #6b7280;
      --color-border: #e5e7eb;
      --color-background: #ffffff;
      --color-background-secondary: #f9fafb;
      --color-background-hover: #f3f4f6;
      --color-accent: #60a5fa;
      --color-accent-hover: #3b82f6;
      --spacing-sm: 0.5rem;
      --spacing-md: 1rem;
      --spacing-lg: 1.5rem;
      --spacing-xl: 2rem;
      --spacing-2xl: 3rem;
      --radius-sm: 4px;
      --radius-md: 8px;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    body { background-color: var(--color-background-secondary); color: var(--color-text-primary); min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; padding: var(--spacing-xl); }
    .header { text-align: center; margin-bottom: var(--spacing-2xl); padding: var(--spacing-2xl) 0; }
    .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-sm); }
    .header p { font-size: 1.125rem; color: var(--color-text-secondary); }
    .header a { color: var(--color-accent); text-decoration: none; }
    .header a:hover { color: var(--color-accent-hover); text-decoration: underline; }
    .section { margin-bottom: var(--spacing-2xl); }
    .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: var(--spacing-lg); }
    .examples-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--spacing-md); }
    .example-card { display: block; background-color: var(--color-background); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-lg); text-decoration: none; transition: all 0.2s; }
    .example-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-sm); }
    .example-card h3 { font-size: 1rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--spacing-sm); }
    .example-card p { font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: var(--spacing-md); }
    .example-card .tag { display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; background-color: var(--color-background-secondary); color: var(--color-text-tertiary); border-radius: var(--radius-sm); }
    .install-section { background-color: var(--color-background); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-lg); }
    .install-section h2 { font-size: 1rem; font-weight: 600; margin-bottom: var(--spacing-md); }
    .code-block { background-color: var(--color-background-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--spacing-md); font-family: "SF Mono", "Fira Code", "Consolas", monospace; font-size: 0.875rem; overflow-x: auto; }
    .code-block code { color: var(--color-text-primary); }
    .code-block .comment { color: var(--color-text-tertiary); }
    .footer { text-align: center; padding: var(--spacing-xl) 0; color: var(--color-text-tertiary); font-size: 0.875rem; }
    .footer a { color: var(--color-accent); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Data Explorer</h1>
      <p>Static site generator for <a href="https://www.malloydata.dev/" target="_blank">Malloy</a> data models and notebooks</p>
    </header>
    <section class="section">
      <h2 class="section-title">Example Sites</h2>
      <div class="examples-grid">${exampleCards}
      </div>
    </section>
    <section class="section">
      <div class="install-section">
        <h2>Quick Start</h2>
        <div class="code-block">
          <code><span class="comment"># Build a site from your Malloy models</span><br>
npx @aszenz/data-explorer build ./models -o ./dist<br><br>
<span class="comment"># Preview the built site</span><br>
npx @aszenz/data-explorer preview ./dist<br><br>
<span class="comment"># Customize title and description</span><br>
npx @aszenz/data-explorer build ./models \\<br>
&nbsp;&nbsp;--title "My Analytics" \\<br>
&nbsp;&nbsp;--description "Explore data" \\<br>
&nbsp;&nbsp;--output ./dist</code>
        </div>
      </div>
    </section>
    <footer class="footer">
      <p>Built with <a href="https://www.malloydata.dev/" target="_blank">Malloy</a> and <a href="https://duckdb.org/" target="_blank">DuckDB</a></p>
    </footer>
  </div>
</body>
</html>`;
}

async function main(): Promise<void> {
  const outputDir = resolve(PROJECT_ROOT, "dist");

  console.log("Building all examples...");
  console.log(`Output directory: ${outputDir}`);
  console.log(`Base path: ${normalizedBasePath}`);

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

  // Generate and write landing page
  console.log("\nGenerating landing page...");
  const landingPageHtml = generateLandingPage();
  writeFileSync(resolve(outputDir, "index.html"), landingPageHtml);

  // Copy favicon to root
  const faviconSrc = resolve(PROJECT_ROOT, "public/favicon.svg");
  if (existsSync(faviconSrc)) {
    cpSync(faviconSrc, resolve(outputDir, "favicon.svg"));
  }

  // Create .nojekyll file for GitHub Pages
  writeFileSync(resolve(outputDir, ".nojekyll"), "");

  console.log("\n" + "=".repeat(50));
  console.log("Build complete!");
  console.log(`Output: ${outputDir}`);
  console.log(`Base path: ${normalizedBasePath}`);
  console.log("\nStructure:");
  console.log("  dist/");
  console.log("    index.html (landing page)");
  console.log("    .nojekyll");
  for (const example of EXAMPLES) {
    console.log(`    ${example.name}/`);
  }
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
