/**
 * LLMs.txt content generator
 *
 * Generates the llms.txt file content from extracted model schema
 */

import type { ExtractedModel } from "./types";

export interface GeneratorOptions {
  siteTitle: string;
  basePath: string;
  models: ExtractedModel[];
  dataFiles: string[];
  notebooks: string[];
}

export function generateLlmsTxtContent(options: GeneratorOptions): string {
  const { siteTitle, basePath, models, dataFiles, notebooks } = options;

  const sections = [
    generateHeader(siteTitle, basePath),
    generateOverview(siteTitle, basePath, models, dataFiles, notebooks),
    generateModelsSection(models, basePath),
    generateMalloyQueryGuide(),
  ];

  return sections.join("\n\n");
}

function generateHeader(siteTitle: string, basePath: string): string {
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return `# ${siteTitle}

> Malloy Data Explorer - Static web app for exploring semantic data models
> All queries run in-browser using DuckDB WASM

**Site URL:** \`${base}/\``;
}

function generateOverview(
  _siteTitle: string,
  basePath: string,
  models: ExtractedModel[],
  dataFiles: string[],
  notebooks: string[],
): string {
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  // Content summary
  const contentItems = [
    `${String(models.length)} Malloy model${models.length !== 1 ? "s" : ""}`,
    `${String(dataFiles.length)} data file${dataFiles.length !== 1 ? "s" : ""}`,
    ...(notebooks.length > 0
      ? [
          `${String(notebooks.length)} notebook${notebooks.length !== 1 ? "s" : ""}`,
        ]
      : []),
  ];

  // Data files list (compact)
  const dataFilesList =
    dataFiles.length > 0 ? `\n\n**Data Files:** ${dataFiles.join(", ")}` : "";

  // Notebooks list (compact - just names)
  const notebooksList =
    notebooks.length > 0 ? `\n\n**Notebooks:** ${notebooks.join(", ")}` : "";

  return `## Overview

**Content:** ${contentItems.join(" • ")}
**Capabilities:** Browse schemas • Preview data • Build queries • Download results (CSV/JSON)${dataFilesList}${notebooksList}

## URL Patterns

All URLs with \`/#/\` prefix return HTML pages. \`/downloads/\` URLs return raw files.

| Pattern | Returns | Description |
|---------|---------|-------------|
| \`${base}/#/\` | HTML | Home - list all models |
| \`${base}/#/model/{model}\` | HTML | Model schema browser |
| \`${base}/#/model/{model}/preview/{source}\` | HTML | Preview source data (50 rows) |
| \`${base}/#/model/{model}/explorer/{source}\` | HTML | Interactive query builder |
| \`${base}/#/model/{model}/explorer/{source}?query={malloy}&run=true\` | HTML | Execute query, show results |
| \`${base}/#/model/{model}/query/{queryName}\` | HTML | Run named query, show results |
| \`${base}/#/notebook/{notebook}\` | HTML | View notebook with queries/visualizations |
| \`${base}/downloads/models/{model}.malloy\` | Text | Download model source file |
| \`${base}/downloads/notebooks/{notebook}.malloynb\` | Text | Download notebook file |
| \`${base}/downloads/data/{file}\` | File | Download data file (CSV/Parquet/JSON/Excel) |`;
}

function generateModelsSection(
  models: ExtractedModel[],
  basePath: string,
): string {
  if (models.length === 0) {
    return "## Models\n\nNo models available.";
  }

  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

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

function generateMalloyQueryGuide(): string {
  return `## Malloy Query Syntax

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

**Common Operations:**
- Select all: \`source -> { select: * }\`
- Group: \`source -> { group_by: field }\`
- Aggregate: \`source -> { aggregate: measure }\`
- Filter: \`source -> { where: field > value }\`
- Sort: \`source -> { order_by: field desc }\`
- Limit: \`source -> { limit: 10 }\`
- Run view: \`source -> view_name\`
- Nest: \`{ nest: name is { group_by: field; aggregate: measure } }\`

**Time Granularity:** \`.year\`, \`.quarter\`, \`.month\`, \`.week\`, \`.day\` (e.g., \`order_date.month\`)

**Example Query:**
\`\`\`malloy
run: orders -> {
  group_by: category
  aggregate: order_count, total_revenue
  where: status = 'Delivered'
  order_by: total_revenue desc
  limit: 10
}
\`\`\``;
}
