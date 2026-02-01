# Pre-rendering Analysis for Data Explorer

## Executive Summary

This document analyzes the feasibility of pre-rendering query, preview, and notebook routes in the data-explorer application. These routes utilize fixed queries on static local data, making them candidates for pre-rendering.

## Architecture Overview

### Current Rendering Pipeline

```
┌──────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│   React Router   │ → │  Malloy Runtime      │ → │  @malloydata/render  │
│   (Route Loader) │    │  (DuckDB WASM)      │    │  (Solid.js + Vega)   │
└──────────────────┘    └─────────────────────┘    └──────────────────────┘
         │                        │                          │
         ▼                        ▼                          ▼
    Load .malloy           Execute Query              Render to DOM
    model files            in browser                 (Tables/Charts)
```

### Key Technologies

| Component | Technology | Pre-render Implications |
|-----------|------------|------------------------|
| UI Framework | React 19 | Can use SSR with limitations |
| Rendering | Solid.js (in @malloydata/render) | Client-side only, no SSR |
| Tables | @tanstack/solid-virtual | Virtual scroll needs JS |
| Charts | Vega/Vega-Lite | Can export to static SVG |
| Database | DuckDB WASM | Browser-only execution |

## Routes Analysis

### 1. Preview Route (`/model/:model/preview/:source`)

**Purpose:** Shows first 50 rows of a data source.

**Pre-render Feasibility:** HIGH for small datasets

**HTML Structure:**
```html
<div class="result-page">
  <div class="result-header">
    <h1 class="result-title">{source}</h1>
    <p class="result-subtitle">Preview</p>
  </div>
  <div class="result-content">
    <!-- MalloyRenderer output (Solid.js) -->
    <table>
      <thead>...</thead>
      <tbody>...</tbody>
    </table>
  </div>
</div>
```

**JS Requirements:**
- ✗ Virtual scrolling (if > ~20 visible rows)
- ✓ Static display works for small tables
- ✓ Column widths can be pre-calculated

### 2. Query Route (`/model/:model/query/:query`)

**Purpose:** Executes a named query from a Malloy model.

**Pre-render Feasibility:** MEDIUM to HIGH (depends on visualization type)

**Visualization Types:**
| Type | Pre-render Support |
|------|-------------------|
| Table (no virtual scroll) | ✅ Full |
| Table (with virtual scroll) | ⚠️ Partial - needs JS for scroll |
| Bar Chart | ✅ Full (via SVG export) |
| Line Chart | ✅ Full (via SVG export) |
| Dashboard | ⚠️ Partial - layout needs JS |
| Big Value (KPI) | ✅ Full |

### 3. Notebook Route (`/notebook/:notebook`)

**Purpose:** Renders a Malloy notebook with multiple cells.

**Pre-render Feasibility:** MEDIUM

**Cell Types:**
| Cell Type | Pre-render Support |
|-----------|-------------------|
| Markdown | ✅ Full |
| Query (table) | ⚠️ Depends on size |
| Query (chart) | ✅ Full via SVG |
| Code display | ✅ Full (syntax highlighting can be static) |

**Interactive Features Requiring JS:**
- Cell expand/collapse popover
- Code visibility toggle
- URL state management for expanded cells

## Malloy Render Deep Dive

### Key Discovery: `getHTML()` Method

The `@malloydata/render` package provides a `getHTML()` method on `MalloyViz` class:

```typescript
// From node_modules/@malloydata/render/dist/module/api/malloy-viz.d.ts
export declare class MalloyViz {
    getHTML(): Promise<string>;  // ← Key method for pre-rendering
    copyToHTML(): Promise<void>;
    // ...
}
```

### How `getHTML()` Works (from source analysis)

```javascript
async getHTML() {
  // Creates off-screen container
  const r = document.createElement("div");
  r.style.position = "absolute";
  r.style.left = "-9999px";

  // CRITICAL: Disables virtualization for static export
  const options = {
    tableConfig: { disableVirtualization: true },
    dashboardConfig: { disableVirtualization: true }
  };

  // Renders with disabled virtualization
  // For Vega charts: uses view.toSVG()
  // Returns innerHTML
}
```

### Virtual Scrolling Control

```typescript
// From table.d.ts
declare const MalloyTable: Component<{
    data: RecordOrRepeatedRecordCell;
    disableVirtualization?: boolean;  // ← Key option
    // ...
}>;
```

**Implication:** Tables can be rendered without virtual scrolling by setting `disableVirtualization: true`.

### Vega Chart Export

Vega visualizations use `view.toSVG()` for static export:

```javascript
// Found in index.mjs
return o.innerHTML = await s.toSVG(), o;
```

**Implication:** All Vega-based charts (bar, line, etc.) can be exported as static SVG.

## Pre-rendering Strategy

### Approach 1: Build-time Pre-rendering (Recommended)

```
Build Phase:
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Parse .malloy│ → │ Execute in   │ → │ Generate Static │
│ models      │    │ Node.js      │    │ HTML pages      │
└─────────────┘    └──────────────┘    └─────────────────┘
                         │
                   DuckDB (native)
                   + Malloy Runtime
```

**Requirements:**
1. Run Malloy queries server-side using `@malloydata/db-duckdb` with native DuckDB
2. Use `MalloyViz.getHTML()` with JSDOM or similar
3. Generate static HTML files for each route

### Approach 2: Hybrid Pre-rendering

Pre-render structural HTML, hydrate with data:

```html
<!-- Pre-rendered shell -->
<div class="result-page" data-prerender="true">
  <div class="result-header">
    <h1 class="result-title">by_status</h1>
  </div>
  <div class="result-content" data-query-result>
    <!-- Pre-rendered table/SVG -->
    <table>...</table>
    <!-- JS hydrates for interactivity -->
  </div>
</div>
```

### Approach 3: Static Asset Generation

For charts, generate static images/SVGs at build time:

```
Query Result → Vega Spec → SVG/PNG file → Reference in HTML
```

## Specific Component Analysis

### Tables Without Virtual Scroll

For tables with ≤50 rows (typical preview), full pre-rendering works:

```html
<table class="malloy-table">
  <thead>
    <tr>
      <th>invoice_id</th>
      <th>status</th>
      <th>amount</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>INV001</td><td>Paid</td><td>$1,234.56</td></tr>
    <!-- All rows rendered -->
  </tbody>
</table>
```

**Required CSS:** Must include Malloy's table styles.

### Tables With Virtual Scroll

For large tables (>100 rows), options:

1. **Pagination:** Pre-render first page, JS for navigation
2. **Partial render:** Pre-render visible rows + loading indicator
3. **Full render:** Accept larger HTML size, disable virtualization

### Vega Charts (Bar/Line)

Pre-rendered as SVG:

```html
<div class="malloy-chart">
  <svg viewBox="0 0 400 300" class="marks">
    <!-- Vega-generated SVG content -->
    <g class="mark-group">
      <rect x="10" y="20" width="80" height="100" fill="#4c78a8"/>
      <!-- ... more chart elements -->
    </g>
  </svg>
</div>
```

**Interactivity Lost:**
- Hover tooltips
- Click handlers
- Brush/zoom selection

### Dashboard Layout

Dashboards combine multiple visualizations:

```html
<div class="malloy-dashboard">
  <div class="dashboard-section kpi">
    <span class="big-value">1,234</span>
    <span class="label">Total Invoices</span>
  </div>
  <div class="dashboard-section chart">
    <svg><!-- bar chart --></svg>
  </div>
</div>
```

**Challenge:** Dashboard layout uses CSS Grid/Flexbox that may depend on viewport size.

## Implementation Recommendations

### Phase 1: Query Route Pre-rendering

1. Create Node.js script to execute queries at build time
2. Use native DuckDB for server-side execution
3. Generate static HTML for each named query
4. Output: `dist/prerender/model/{model}/query/{query}.html`

### Phase 2: Preview Route Pre-rendering

1. Pre-render source previews (first 50 rows)
2. Always disable virtualization (50 rows is manageable)
3. Output: `dist/prerender/model/{model}/preview/{source}.html`

### Phase 3: Notebook Pre-rendering

1. Pre-render markdown cells (simple transformation)
2. Pre-render query results for each Malloy cell
3. Keep popover/expand functionality as progressive enhancement
4. Output: `dist/prerender/notebook/{notebook}.html`

### Recommended Output Structure

```
dist/
├── index.html (SPA shell for JS-enabled)
├── prerender/
│   ├── model/
│   │   └── invoices/
│   │       ├── preview/
│   │       │   └── invoices.html
│   │       └── query/
│   │           ├── by_status.html
│   │           └── invoice_summary.html
│   └── notebook/
│       ├── Invoices.html
│       └── SuperStore.html
└── assets/
    └── (JS/CSS bundles)
```

## Testing Verification

The Playwright test file `e2e-tests/prerender-analysis.spec.ts` captures:

1. **Preview route HTML** - Full page structure
2. **Query route HTML** - Result table/chart
3. **Notebook HTML** - All cells with results
4. **Element analysis** - Tag counts, SVG presence, virtual scroll detection
5. **JS-disabled behavior** - What renders without JavaScript

## Queries Suitable for Pre-rendering

Based on analysis of the models:

| Model | Query | Type | Pre-render |
|-------|-------|------|------------|
| invoices | by_status | Table (small) | ✅ |
| invoices | invoice_summary | Table (1 row) | ✅ |
| invoices | overview | Dashboard | ⚠️ |
| ecommerce_orders | orders_by_status | Table | ✅ |
| superstore | segment_analysis | Table | ✅ |
| superstore | overview | Dashboard + charts | ⚠️ |

## Conclusion

Pre-rendering is feasible for most query and preview routes with these conditions:

1. **Tables:** Full pre-rendering for datasets ≤100 rows
2. **Charts:** Full pre-rendering via SVG export (lose interactivity)
3. **Dashboards:** Partial pre-rendering (layout may need JS)
4. **Notebooks:** Hybrid approach recommended

The key enabler is the existing `MalloyViz.getHTML()` method with `disableVirtualization: true`, combined with Vega's SVG export capability.

## Next Steps

1. Verify findings with Playwright tests (when browser available)
2. Create proof-of-concept pre-render script
3. Measure HTML size vs. bundle size trade-offs
4. Evaluate progressive enhancement strategy
