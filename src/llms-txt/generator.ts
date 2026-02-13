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

# Time truncation in group_by: output column is named "dep_time", not "dep_time.month"
run: flights -> {
  group_by: dep_time.month
  aggregate: flight_count
  order_by: dep_time
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
- \`pick\` expressions (Malloy's CASE equivalent)
- Filtered aggregates: \`count() { where: condition }\`
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

# Conditional grouping with pick (requires else)
run: orders -> {
  group_by: size_bucket is
    pick 'small' when amount < 100
    pick 'medium' when amount < 500
    else 'large'
  aggregate: order_count is count()
}

# Filtered aggregates: different filters per measure
run: flights -> {
  group_by: carrier
  aggregate:
    total_flights is count()
    long_flights is count() { where: distance > 1000 }
    short_flights is count() { where: distance <= 1000 }
}

# Percent of total with ungrouped aggregates
run: invoices -> {
  group_by: region
  aggregate:
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
- Filter (pre-aggregation): \`{ where: field > value }\`
- Filter (post-aggregation): \`{ having: measure_name > 100 }\`
- Sort: \`{ order_by: field desc }\` (must be an output field name)
- Limit: \`{ limit: 10 }\`
- Run view: \`source -> view_name\`
- Nest: \`{ nest: name is { group_by: field; aggregate: measure } }\`
- Pipeline: \`source -> { aggregate: ... } -> { select: * where: ... }\`
- Window: \`{ calculate: prev is lag(field) }\`

## \`order_by\` Rules

\`order_by\` must reference an **output field name** — a field produced by \`group_by\`, \`aggregate\`, or \`select\`. Expressions are not allowed.

**With time truncation:** \`group_by: order_date.month\` produces an output column named \`order_date\` (the base field name), so use \`order_by: order_date\`, NOT \`order_by: order_date.month\`.

\`\`\`malloy
# CORRECT
run: flights -> {
  group_by: dep_time.quarter
  aggregate: flight_count
  order_by: dep_time         # base field name
}

# WRONG — will not compile
run: flights -> {
  group_by: dep_time.quarter
  aggregate: flight_count
  order_by: dep_time.quarter  # expression, not an output field name
}
\`\`\`

**Implicit defaults** (when no \`order_by\` is specified):
- If a time dimension is present → sorted newest first
- If a measure is present but no time → sorted by first measure, largest first

## \`pick\` Expressions (Malloy's CASE)

\`pick\` replaces SQL's CASE statement. **An \`else\` clause is required** unless using the data-cleaning pattern.

\`\`\`malloy
# Basic pick (else is required)
group_by: tier is
  pick 'low' when value < 10
  pick 'medium' when value < 50
  else 'high'

# With apply operator (cleaner for single-field conditions)
group_by: tier is value ?
  pick 'low' when < 10
  pick 'medium' when < 50
  else 'high'
\`\`\`

## Operators

**Comparison:** \`=\` (equality, not \`==\`), \`!=\`, \`>\`, \`<\`, \`>=\`, \`<=\`
**Boolean:** \`and\`, \`or\`, \`not\`
**Null:** \`is null\`, \`is not null\`, \`??\` (null coalesce: \`name ?? 'Unknown'\`)
**Apply:** \`field ? condition\` — pattern matching operator
**Alternation:** \`|\` (OR), \`&\` (AND) — used with \`?\` for multi-value checks
**Pattern match:** \`~\` (LIKE/regex), \`!~\` (NOT LIKE/NOT regex)
**Type cast:** \`::\` (cast), \`:::\` (safe cast, returns null on error)
**Range:** \`a to b\` — half-open interval [a, b) (inclusive start, exclusive end)

\`\`\`malloy
# Apply + alternation: equals one of multiple values
where: state ? 'CA' | 'NY' | 'TX'

# Apply + range: between two values
where: amount ? 100 to 500

# LIKE pattern matching (% is wildcard)
where: name ~ 'M%'

# Regex matching
where: code ~ r'^[A-Z]{3}$'

# Null coalescing
group_by: display_name is name ?? '(Unknown)'

# Type casting
aggregate: label is count()::string
\`\`\`

## Identifiers

Fields with spaces or reserved words must use backticks:
\`\`\`malloy
group_by: \\\`Customer Name\\\`, \\\`Sub-Category\\\`
where: \\\`Ship Mode\\\` = 'First Class'
\`\`\`

## Aggregate Expressions

**Functions:** \`count()\`, \`count(expr)\` (distinct), \`sum(expr)\`, \`avg(expr)\`, \`min(expr)\`, \`max(expr)\`, \`stddev(expr)\`

**Filtered aggregates** — apply a filter to a single measure without affecting others:
\`\`\`malloy
aggregate:
  total is count()
  ca_only is count() { where: state = 'CA' }
  expensive is sum(amount) { where: amount > 1000 }
\`\`\`

**Ungrouped aggregates** — compute across all groups for ratios/percentages:
- \`all(expr)\` — ignores all grouping (grand total)
- \`all(expr, dim)\` — preserves grouping by specific dimensions only
- \`exclude(expr, dim)\` — removes specific dimensions from grouping

\`\`\`malloy
aggregate:
  total_sales is sum(sales)
  pct_of_grand_total is sum(sales) / all(sum(sales)) * 100
  pct_within_region is sum(sales) / all(sum(sales), region) * 100
\`\`\`

## \`where:\` vs \`having:\`

- \`where:\` filters rows **before** aggregation (like SQL WHERE)
- \`having:\` filters results **after** aggregation (like SQL HAVING)

\`\`\`malloy
run: orders -> {
  group_by: category
  aggregate: total is sum(amount)
  where: status = 'shipped'       # pre-aggregation: only shipped orders
  having: total > 10000           # post-aggregation: only categories above threshold
}
\`\`\`

## Time Truncation & Extraction

**Truncation** (returns a date, used in \`group_by\`): \`.year\`, \`.quarter\`, \`.month\`, \`.week\`, \`.day\`, \`.hour\`, \`.minute\`

**Extraction** (returns an integer): \`year(date)\`, \`quarter(date)\`, \`month(date)\`, \`week(date)\`, \`day(date)\`, \`day_of_year(date)\`, \`day_of_week(date)\`, \`hour(ts)\`, \`minute(ts)\`, \`second(ts)\`

**Time literals** (act as ranges): \`@2021\` = entire year, \`@2021-Q2\` = Q2 2021, \`@2021-03\` = March 2021, \`@2021-03-15\` = single day

**Interval measurement:** \`days(start to end)\`, \`hours(start to end)\`, \`minutes(start to end)\`, \`seconds(start to end)\`

\`\`\`malloy
# Truncation: group by quarter, order by base field name
group_by: order_date.quarter
order_by: order_date

# Extraction: get integer month number
group_by: order_month is month(order_date)

# Time filter using literal range
where: order_date ? @2023

# Interval: days between two dates
aggregate: avg_ship_days is avg(days(order_date to ship_date))
\`\`\`

## Window Functions (\`calculate:\`)

Window functions use the \`calculate:\` keyword and operate on the query's output:

\`\`\`malloy
run: flights -> {
  group_by: dep_time.month
  aggregate: flight_count
  calculate:
    prev_month is lag(flight_count)
    change is flight_count - lag(flight_count)
    running_total is sum(flight_count)
    row_num is row_number()
}
\`\`\`

Optional \`partition_by\` and per-calculation \`order_by\`:
\`\`\`malloy
calculate: rank_in_category is row_number() {
  partition_by: category
  order_by: total_sales desc
}
\`\`\`

## Common Functions

**String:** \`concat(a, b, ...)\`, \`lower(s)\`, \`upper(s)\`, \`length(s)\`, \`substr(s, start, len)\`, \`trim(s)\`, \`replace(s, old, new)\`, \`starts_with(s, prefix)\`, \`ends_with(s, suffix)\`, \`regexp_extract(s, pattern)\`

**Numeric:** \`round(n, precision)\`, \`floor(n)\`, \`ceil(n)\`, \`abs(n)\`, \`sqrt(n)\`, \`pow(base, exp)\`, \`div(a, b)\`

**Utility:** \`coalesce(a, b, ...)\`, \`greatest(a, b, ...)\`, \`least(a, b, ...)\`, \`nullif(a, b)\`

**Raw DuckDB SQL functions** — escape hatch for DB functions not built into Malloy:
\`\`\`malloy
# Call any database function: function_name!(args)
aggregate: approx is approx_count_distinct!(user_id)

# With explicit return type: function_name!return_type(args)
group_by: ts is timestamp_seconds!timestamp(epoch_col)
\`\`\`

## Key Differences from SQL

- Equality is \`=\` not \`==\`; no \`LIKE\` keyword (use \`~\` operator); no \`CASE\` (use \`pick\`)
- NULL comparisons always return true/false, never NULL: \`x != NULL\` → \`true\`, \`NOT NULL\` → \`true\`
- \`order_by\` only accepts output field names, never expressions
- Filter multiple values with apply: \`field ? 'a' | 'b'\` not \`field = 'a' or field = 'b'\`
- Ranges are half-open: \`10 to 20\` means [10, 20) — includes 10, excludes 20
- Time truncation in \`group_by\` produces base field name: \`group_by: d.month\` → output column is \`d\`
- Fields with spaces or reserved words use backticks: \\\`Customer Name\\\``;
}
