# Pre-rendered Examples

This directory contains example pre-rendered HTML files demonstrating what can be statically generated from the data-explorer routes.

## Files

### Analysis Document

- **PRERENDER-ANALYSIS.md** - Comprehensive analysis of pre-rendering feasibility

### Example HTML Files

| File | Description | Pre-render Feasibility |
|------|-------------|----------------------|
| `example-query-table.html` | Table query result (by_status) | ✅ Full |
| `example-query-chart.html` | Bar chart with SVG export | ✅ Full (no interactivity) |
| `example-notebook.html` | Complete notebook with multiple cells | ⚠️ Partial |

### Scripts

- `../scripts/prerender-poc.ts` - Proof of concept pre-rendering script

## Quick Summary of Findings

### What CAN Be Pre-rendered

1. **Tables (small datasets)**
   - Up to ~100 rows without virtual scrolling
   - Full styling preserved
   - Data can be pre-formatted (currency, dates)

2. **Charts/Visualizations**
   - Vega exports to SVG via `view.toSVG()`
   - Bar charts, line charts, area charts
   - Styling fully preserved

3. **KPI/Big Value displays**
   - Simple numeric displays
   - Dashboard summary cards

4. **Markdown cells in notebooks**
   - Full markdown rendering
   - Code syntax highlighting

### What REQUIRES JavaScript

1. **Virtual Scroll**
   - Tables with >100 rows use @tanstack/solid-virtual
   - Option: `disableVirtualization: true` renders all rows

2. **Chart Interactivity**
   - Hover tooltips
   - Click/drill-down handlers
   - Zoom and brush selection

3. **Notebook Features**
   - Cell expand/collapse popovers
   - URL-based cell state management

4. **Dynamic Data Loading**
   - DuckDB WASM query execution
   - Data file loading (CSV, Parquet)

## Key Technical Discovery

The `@malloydata/render` package has a built-in `getHTML()` method:

```typescript
const viz = renderer.createViz({
  tableConfig: { disableVirtualization: true }
});
viz.setResult(queryResult);
viz.render(container);

const staticHTML = await viz.getHTML();
```

This method:
1. Disables virtualization automatically
2. Converts Vega charts to SVG
3. Returns complete static HTML

## Viewing the Examples

Open the HTML files directly in a browser:

```bash
# From project root
open prerender-output/example-query-table.html
open prerender-output/example-query-chart.html
open prerender-output/example-notebook.html
```

Or serve them:

```bash
npx serve prerender-output
```

## Implementation Path

To implement pre-rendering in production:

1. **Install dependencies**
   ```bash
   npm install duckdb jsdom
   ```

2. **Create build-time script**
   - Load Malloy models
   - Execute queries with native DuckDB
   - Use MalloyViz.getHTML() with JSDOM
   - Output static HTML files

3. **Integrate with build**
   ```json
   {
     "scripts": {
       "prerender": "tsx scripts/prerender.ts",
       "build": "npm run prerender && vite build"
     }
   }
   ```

4. **Serve pre-rendered pages**
   - Detect routes matching pre-rendered content
   - Return static HTML for supported routes
   - Fall back to SPA for unsupported routes

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Full SPA (current) | Interactive, flexible | Slow initial load, requires JS |
| Full Pre-render | Fast, no JS needed | Large HTML, no interactivity |
| Hybrid | Best of both | Complex setup, dual maintenance |

## Recommendation

For query and preview routes:
1. Pre-render tables with <100 rows
2. Pre-render charts as SVG (accept lost interactivity)
3. Progressive enhancement: hydrate with JS for full interactivity

For notebook routes:
1. Pre-render markdown cells fully
2. Pre-render query cells as static content
3. JS hydration for expand/collapse functionality
