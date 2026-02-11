/**
 * LLMs.txt content generator
 *
 * Generates the llms.txt file content from extracted model schema
 */

import type { ExtractedModel } from "./types";

export interface GeneratorOptions {
  siteTitle: string;
  siteUrl: string;
  models: ExtractedModel[];
  dataFiles: string[];
  notebooks: string[];
}

export function generateLlmsTxtContent(options: GeneratorOptions): string {
  const { siteTitle, siteUrl, models, dataFiles, notebooks } = options;

  const sections = [
    generateHeader(siteTitle, siteUrl),
    generateOverview(siteTitle, siteUrl, models, dataFiles, notebooks),
    generateModelsSection(models, siteUrl),
    generateQueryParametersSection(),
    generateMalloyQueryGuide(),
  ];

  return sections.join("\n\n");
}

function generateHeader(siteTitle: string, siteUrl: string): string {
  const fullUrl = `${siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl}/`;
  return `# ${siteTitle}

> Malloy Data Explorer - Static web app for exploring semantic data models
> All queries run in-browser using DuckDB WASM

**Site URL:** \`${fullUrl}\``;
}

function generateOverview(
  _siteTitle: string,
  siteUrl: string,
  models: ExtractedModel[],
  dataFiles: string[],
  notebooks: string[],
): string {
  const fullBase = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

  // Content summary
  const contentItems = [
    `${String(models.length)} model${models.length !== 1 ? "s" : ""}`,
    `${String(dataFiles.length)} data file${dataFiles.length !== 1 ? "s" : ""}`,
    ...(notebooks.length > 0
      ? [
          `${String(notebooks.length)} notebook${notebooks.length !== 1 ? "s" : ""}`,
        ]
      : []),
  ];

  // Pick first model with data for examples
  const exampleModel = models.find((m) => m.sources.length > 0 && m.sources[0]);
  let examples = "";
  if (exampleModel?.sources[0]) {
    const modelName = encodeURIComponent(exampleModel.name);
    const source = exampleModel.sources[0];
    const sourceName = encodeURIComponent(source.name);

    const examplesList = [];

    // Named query example
    if (exampleModel.queries.length > 0 && exampleModel.queries[0]) {
      const queryName = encodeURIComponent(exampleModel.queries[0].name);
      examplesList.push(
        `\`${fullBase}/#/model/${modelName}/query/${queryName}\` - Named query`,
      );
    }

    // View example
    if (source.views.length > 0 && source.views[0]) {
      const viewQuery = encodeURIComponent(
        `run: ${source.name} -> ${source.views[0].name}`,
      );
      examplesList.push(
        `\`${fullBase}/#/model/${modelName}/explorer/${sourceName}?query=${viewQuery}&run=true\` - Run view`,
      );
    }

    // Custom query example (structured builder)
    const customQuery = encodeURIComponent(
      `run: ${source.name} -> { select: * limit: 10 }`,
    );
    examplesList.push(
      `\`${fullBase}/#/model/${modelName}/explorer/${sourceName}?query=${customQuery}&run=true\` - Custom query`,
    );

    // Code editor mode example (custom aggregate)
    const codeQuery = encodeURIComponent(
      `run: ${source.name} -> { aggregate: row_count is count() }`,
    );
    examplesList.push(
      `\`${fullBase}/#/model/${modelName}/explorer/${sourceName}?query=${codeQuery}&run=true&mode=code\` - Code editor query (custom aggregate)`,
    );

    if (examplesList.length > 0) {
      examples = `\n\n**Example URLs:**\n${examplesList.join("\n")}`;
    }
  }

  return `## Overview

**Content:** ${contentItems.join(" • ")}${examples}

## URL Patterns

| Pattern | Description |
|---------|-------------|
| \`/#/\` | Home - list all models |
| \`/#/model/{model}\` | Model schema |
| \`/#/model/{model}/preview/{source}\` | Preview data (50 rows) |
| \`/#/model/{model}/explorer/{source}\` | Interactive query builder |
| \`/#/model/{model}/explorer/{source}?query={malloy}&run=true\` | Execute query (structured builder) |
| \`/#/model/{model}/explorer/{source}?query={malloy}&run=true&mode=code\` | Execute query (code editor — for custom aggregates) |
| \`/#/model/{model}/query/{queryName}\` | Run named query |
| \`/#/notebook/{notebook}\` | View notebook |
| \`/downloads/models/{model}.malloy\` | Download model file |
| \`/downloads/data/{file}\` | Download data file |`;
}

function generateModelsSection(
  models: ExtractedModel[],
  siteUrl: string,
): string {
  if (models.length === 0) {
    return "## Models\n\nNo models available.";
  }

  const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

  const modelSections = models.map((model) => {
    const sourceSections = model.sources
      .map((source) => {
        // Group fields by type
        const groupByType = (fields: { name: string; type: string }[]) => {
          const grouped = new Map<string, string[]>();
          for (const field of fields) {
            const existing = grouped.get(field.type) ?? [];
            existing.push(`\`${field.name}\``);
            grouped.set(field.type, existing);
          }
          return grouped;
        };

        const dimsByType = groupByType(source.dimensions);
        const measuresByType = groupByType(source.measures);

        const dims =
          dimsByType.size > 0
            ? Array.from(dimsByType.entries())
                .map(([type, names]) => `${type}: ${names.join(", ")}`)
                .join(" • ")
            : "none";

        const measures =
          measuresByType.size > 0
            ? Array.from(measuresByType.entries())
                .map(([type, names]) => `${type}: ${names.join(", ")}`)
                .join(" • ")
            : "none";

        const views =
          source.views.length > 0
            ? source.views.map((v) => `\`${v.name}\``).join(", ")
            : "none";

        const tableInfo = source.tablePath
          ? ` | Table: \`${source.tablePath}\``
          : "";

        return `**${source.name}**${tableInfo}
- Dims: ${dims}
- Measures: ${measures}
- Views: ${views}`;
      })
      .join("\n\n");

    const queriesInfo =
      model.queries.length > 0
        ? `\n**Named Queries:** ${model.queries.map((q) => `\`${q.name}\``).join(", ")}`
        : "";

    const urls = `[Browse](${base}/#/model/${encodeURIComponent(model.name)}) | [Download](${base}/downloads/models/${encodeURIComponent(model.name)}.malloy)`;

    return `### ${model.name}
${urls}${queriesInfo}

**Sources:**
${sourceSections}`;
  });

  return `## Models

${modelSections.join("\n\n---\n\n")}`;
}

function generateQueryParametersSection(): string {
  return `## URL Query Parameters

Control UI behavior with these query parameters:

**Explorer (\`/model/{model}/explorer/{source}\`):**
- \`query\` - Malloy query string (URL-encoded)
- \`run=true\` - Auto-execute the query
- \`mode=code\` - Use code editor instead of structured query builder (see "Query Modes" below). Auto-inferred for queries with custom expressions, but can be set explicitly to always use the code editor.
- \`includeTopValues=true\` - Load field top values
- \`showQueryPanel=true\` - Expand query panel
- \`showSourcePanel=true\` - Expand source/schema panel

**Model Schema (\`/model/{model}\`):**
- \`tab\` - Active tab name
- \`expanded\` - Comma-separated list of expanded explores

**Notebook (\`/notebook/{notebook}\`):**
- \`cell-expanded\` - Index of fullscreen cell

**Note:** Malloy queries must be URL-encoded. Space becomes \`%20\`, \`:\` becomes \`%3A\`, etc.`;
}

function generateMalloyQueryGuide(): string {
  return `## Query Modes

There are two ways to run queries in the explorer:

### Structured Query Builder (default)

The default mode uses a visual query builder UI. Queries that only reference **existing** dimensions, measures, and views defined in the source model are parsed into the structured builder automatically.

**What the structured builder supports:**
- \`group_by:\` using source dimensions
- \`aggregate:\` using source measures (by name only)
- \`where:\` / \`having:\` filters
- \`order_by:\` with asc/desc
- \`limit:\`
- \`nest:\` for nested sub-queries
- Running existing views: \`source -> view_name\`

**Structured builder URL (no \`mode\` param needed):**
\`\`\`
/#/model/{model}/explorer/{source}?query={url_encoded_malloy}&run=true
\`\`\`

**Example structured queries:**
\`\`\`malloy
run: flights -> by_carrier

run: flights -> {
  group_by: carrier
  aggregate: flight_count
  where: distance > 500
  order_by: flight_count desc
  limit: 20
}

run: orders -> {
  group_by: status
  aggregate: order_count, total_revenue
  nest: by_month is {
    group_by: created_date.month
    aggregate: order_count
  }
}
\`\`\`

### Code Editor Mode (\`mode=code\`)

For queries that go beyond referencing existing fields — such as defining **custom aggregate expressions**, **ad-hoc calculated fields**, or **arithmetic on measures** — use code editor mode by adding \`mode=code\` to the URL. This opens a Monaco code editor instead of the structured query builder.

**Code editor URL (requires \`mode=code\`):**
\`\`\`
/#/model/{model}/explorer/{source}?query={url_encoded_malloy}&run=true&mode=code
\`\`\`

**What code editor mode enables (not possible in structured builder):**
- Custom aggregate expressions with inline definitions (\`is\` keyword)
- Arithmetic on aggregates (e.g., \`count() * 2\`, \`sum(x) / count()\`)
- Ad-hoc measures not defined in the source model
- Pipelining: chain multiple query stages with \`->\`
- Any valid Malloy query syntax

**Example code editor queries:**
\`\`\`malloy
# Custom aggregate: define a new measure inline
run: orders -> {
  group_by: status
  aggregate: double_count is count() * 2
}

# Arithmetic on aggregates
run: flights -> {
  group_by: carrier
  aggregate:
    total_flights is count()
    avg_distance is sum(distance) / count()
}

# Ad-hoc calculated fields with complex expressions
run: orders -> {
  group_by: category
  aggregate:
    order_count is count()
    total_revenue is sum(amount)
    avg_order_value is sum(amount) / count()
  order_by: avg_order_value desc
  limit: 10
}

# Combining filters with custom aggregates
run: invoices -> {
  where: status = 'paid'
  group_by: region
  aggregate:
    paid_count is count()
    total_paid is sum(amount)
    pct_of_total is sum(amount) / all(sum(amount)) * 100
}

# Pipelining: chain query stages to transform results
run: orders -> {
  group_by: category
  aggregate: total_revenue is sum(amount)
} -> {
  select: *
  where: total_revenue > 1000
  order_by: total_revenue desc
}
\`\`\`

## Malloy Query Syntax Reference

**Basic Structure:**
\`\`\`malloy
run: source_name -> {
  group_by: field1, field2
  aggregate: measure1, measure2
  where: condition
  order_by: field desc
  limit: 100
}
\`\`\`

**Operations:**
- Select all: \`source -> { select: * }\`
- Group: \`source -> { group_by: field }\`
- Aggregate existing measure: \`source -> { aggregate: measure_name }\`
- Custom aggregate: \`source -> { aggregate: my_agg is count() * 2 }\`
- Filter: \`source -> { where: field > value }\`
- Sort: \`source -> { order_by: field desc }\`
- Limit: \`source -> { limit: 10 }\`
- Run view: \`source -> view_name\`
- Nest: \`{ nest: name is { group_by: field; aggregate: measure } }\`
- Pipeline: \`source -> { aggregate: ... } -> { select: * where: ... }\`

**Time Granularity:** \`.year\`, \`.quarter\`, \`.month\`, \`.week\`, \`.day\` (e.g., \`order_date.month\`)`;
}
