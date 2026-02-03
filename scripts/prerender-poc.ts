/**
 * Pre-rendering Proof of Concept Script
 *
 * This script demonstrates how to pre-render query results from Malloy models.
 * It uses Node.js with native DuckDB to execute queries server-side.
 *
 * REQUIREMENTS:
 * 1. Native DuckDB (not WASM) - install with: npm install duckdb
 * 2. JSDOM for DOM simulation - install with: npm install jsdom
 *
 * USAGE:
 * npx tsx scripts/prerender-poc.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const OUTPUT_DIR = join(ROOT_DIR, "prerender-output", "generated");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Configuration for routes to pre-render
 */
interface PrerenderConfig {
  model: string;
  queries: string[];
  previews: string[];
}

const PRERENDER_CONFIG: PrerenderConfig[] = [
  {
    model: "invoices",
    queries: ["by_status", "invoice_summary", "status_breakdown"],
    previews: ["invoices"],
  },
  {
    model: "ecommerce_orders",
    queries: ["orders_by_status"],
    previews: ["orders"],
  },
];

/**
 * Template for pre-rendered HTML pages
 */
function generateHTML(config: {
  title: string;
  subtitle: string;
  content: string;
  styles?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - Data Explorer</title>
  <link rel="stylesheet" href="/assets/malloy-render.css">
  <style>
    :root {
      --malloy-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --malloy-border-color: #e2e8f0;
      --malloy-header-bg: #f8fafc;
      --malloy-text-primary: #1e293b;
      --malloy-text-secondary: #64748b;
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--malloy-font-family);
      margin: 0;
      padding: 0;
      background: #fff;
      color: var(--malloy-text-primary);
    }
    .result-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    .result-header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--malloy-border-color);
      padding-bottom: 16px;
    }
    .result-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }
    .result-subtitle {
      font-size: 14px;
      color: var(--malloy-text-secondary);
      margin: 0;
    }
    .result-content {
      overflow-x: auto;
    }
    ${config.styles || ""}
  </style>
</head>
<body>
  <div class="result-page">
    <div class="result-header">
      <h1 class="result-title">${config.title}</h1>
      <p class="result-subtitle">${config.subtitle}</p>
    </div>
    <div class="result-content">
      ${config.content}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Demonstration of what the pre-render process would do
 *
 * In a full implementation, this would:
 * 1. Initialize Malloy runtime with native DuckDB
 * 2. Load the model file
 * 3. Execute the query
 * 4. Use MalloyViz.getHTML() to get static HTML
 *
 * Since we can't run native DuckDB in this environment,
 * this demonstrates the structure and outputs placeholder HTML.
 */
async function prerenderQuery(
  modelName: string,
  queryName: string,
): Promise<string> {
  console.log(`  Pre-rendering: ${modelName}/${queryName}`);

  // In production, this would be:
  //
  // import { SingleConnectionRuntime } from '@malloydata/malloy';
  // import { DuckDBConnection } from '@malloydata/db-duckdb';
  // import { JSDOM } from 'jsdom';
  // import { MalloyRenderer } from '@malloydata/render';
  //
  // const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  // global.document = dom.window.document;
  //
  // const connection = new DuckDBConnection('duckdb');
  // const runtime = new SingleConnectionRuntime(connection);
  //
  // const modelFile = readFileSync(`models/${modelName}.malloy`, 'utf-8');
  // const model = await runtime.loadModel(modelFile);
  // const result = await model.query(queryName);
  //
  // const renderer = new MalloyRenderer();
  // const viz = renderer.createViz({
  //   tableConfig: { disableVirtualization: true }
  // });
  // viz.setResult(result);
  //
  // const container = document.createElement('div');
  // viz.render(container);
  // const html = await viz.getHTML();

  // Placeholder content (would be replaced by actual query results)
  const placeholderContent = `
    <div class="prerender-placeholder">
      <p><strong>Query:</strong> ${modelName} -> ${queryName}</p>
      <p>This content would be replaced by actual pre-rendered results.</p>
      <table class="malloy-table">
        <thead>
          <tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>
        </thead>
        <tbody>
          <tr><td>Data 1</td><td>Data 2</td><td>Data 3</td></tr>
          <tr><td>Data 4</td><td>Data 5</td><td>Data 6</td></tr>
        </tbody>
      </table>
    </div>
  `;

  return generateHTML({
    title: queryName,
    subtitle: `Named Query from ${modelName}.malloy`,
    content: placeholderContent,
    styles: `
      .prerender-placeholder {
        background: #f1f5f9;
        padding: 20px;
        border-radius: 8px;
        border: 2px dashed #cbd5e1;
      }
      .malloy-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }
      .malloy-table th, .malloy-table td {
        border: 1px solid #e2e8f0;
        padding: 8px 12px;
        text-align: left;
      }
      .malloy-table th {
        background: #f8fafc;
        font-weight: 600;
      }
    `,
  });
}

/**
 * Main pre-rendering function
 */
async function main(): Promise<void> {
  console.log("Pre-rendering Proof of Concept\n");
  console.log("Output directory:", OUTPUT_DIR);
  console.log("");

  for (const config of PRERENDER_CONFIG) {
    console.log(`\nProcessing model: ${config.model}`);

    // Pre-render queries
    for (const queryName of config.queries) {
      const html = await prerenderQuery(config.model, queryName);
      const outputPath = join(
        OUTPUT_DIR,
        "model",
        config.model,
        "query",
        `${queryName}.html`,
      );

      // Ensure directory exists
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(outputPath, html, "utf-8");
      console.log(`    Wrote: ${outputPath}`);
    }

    // Pre-render previews
    for (const sourceName of config.previews) {
      const html = await prerenderQuery(config.model, `${sourceName} preview`);
      const outputPath = join(
        OUTPUT_DIR,
        "model",
        config.model,
        "preview",
        `${sourceName}.html`,
      );

      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(outputPath, html, "utf-8");
      console.log(`    Wrote: ${outputPath}`);
    }
  }

  // Generate manifest
  const manifest = {
    generated: new Date().toISOString(),
    routes: PRERENDER_CONFIG.flatMap((config) => [
      ...config.queries.map((q) => ({
        type: "query",
        model: config.model,
        name: q,
        path: `/model/${config.model}/query/${q}.html`,
      })),
      ...config.previews.map((p) => ({
        type: "preview",
        model: config.model,
        name: p,
        path: `/model/${config.model}/preview/${p}.html`,
      })),
    ]),
  };

  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  console.log(`\nWrote manifest: ${join(OUTPUT_DIR, "manifest.json")}`);

  console.log("\nPre-rendering complete!");
  console.log("\nNOTE: This is a proof-of-concept. For production use:");
  console.log("1. Install native DuckDB: npm install duckdb");
  console.log("2. Install JSDOM: npm install jsdom");
  console.log("3. Update this script to use actual Malloy query execution");
}

main().catch(console.error);
