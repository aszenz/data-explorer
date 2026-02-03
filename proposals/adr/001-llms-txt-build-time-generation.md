# ADR 001: Build-Time Generation for llms.txt and Future Static Routes

## Status

Accepted

## Context

The Malloy Data Explorer needs to generate an `llms.txt` file that describes the schema of all Malloy models for LLM consumption. We evaluated two approaches:

1. **Build-time generation** - Generate static files during the build process
2. **Runtime generation** - Generate content dynamically in the browser

### Key Technical Constraint: Malloy Requires Database Connection for Schema Resolution

**Critical Discovery**: Malloy's compilation process is not just syntax parsing. It requires an active database connection to:

- Resolve table schemas from the underlying database
- Infer field types from actual data structures
- Validate source definitions against real tables
- Build the complete semantic model with type information

This means:

```typescript
// This is NOT possible without a database:
const model = await runtime.loadModel(modelUrl); // Needs DB connection
const explores = model.exportedExplores; // Contains resolved schema

// The model compilation process queries the database:
// "DESCRIBE table_name" or equivalent to get field information
```

**You cannot extract accurate schema information from Malloy models without database access.**

### Why Build-Time Makes Sense

Since we must connect to a database anyway, we have two options:

1. **Node.js DuckDB at build time** (current approach)
   - Fast native DuckDB
   - All data available locally
   - One-time compilation cost

2. **Browser WASM DuckDB at runtime**
   - Slower WASM performance
   - Must load data into browser
   - Compilation cost on every page load
   - SEO challenges

## Decision

**We will generate llms.txt (and future static content) at build time.**

### Primary Reasons

#### 1. **SEO & Standards Compliance**

- LLM crawlers expect `/llms.txt` as a static, plain-text file at the root
- Standard practice across the industry (like `robots.txt`, `sitemap.xml`)
- Immediate availability without JavaScript execution
- Some crawlers may not execute JavaScript or wait for async operations

#### 2. **Performance**

- Zero runtime overhead for serving llms.txt
- No browser-side model compilation required
- Instant response with static file serving
- No DuckDB WASM initialization cost

#### 3. **Database Requirement**

- Malloy compilation requires database connection regardless
- Node.js DuckDB is faster than WASM DuckDB
- Data files are available locally during build
- Single compilation vs. compilation on every user visit

#### 4. **Build-Time Data Availability**

- All models are known at build time (in `models/` directory)
- All data files are available locally (in `models/data/`)
- Schema is static - doesn't change per user or per request
- Perfect use case for static site generation

## Consequences

### Positive

✅ **Fast serving** - Static files are served instantly
✅ **SEO-friendly** - Standard file location and format
✅ **No runtime cost** - Zero JavaScript execution needed
✅ **Reliable** - Works even if browser has issues
✅ **Standards-compliant** - Follows web best practices
✅ **Efficient** - Compile once, serve many times

### Negative

❌ **Build complexity** - Requires Node.js DuckDB and async build process
❌ **Build time** - Adds time to the build (currently acceptable)
❌ **Stale data** - If models change, must rebuild (acceptable for static data)

### Neutral

⚪ **Code duplication** - Some schema extraction logic differs from runtime
⚪ **Two environments** - Must handle both Node.js and browser contexts

## Future Direction: Static Site Generation (SSG)

This decision establishes a pattern for future optimization:

### Long-Term Goal: Pre-render Most Routes at Build Time

Since we have all the data at build time, we should generate static HTML for:

```
/                           → Home page (list of models)
/model/{modelName}          → Model schema page
/model/{modelName}/preview/{sourceName}  → Preview pages
/model/{modelName}/query/{queryName}     → Named query results
```

### Benefits of Full SSG

1. **Instant page loads** - No client-side data fetching or compilation
2. **Progressive enhancement** - Pages work without JavaScript, enhanced with it
3. **SEO** - All content crawlable and indexable
4. **Performance** - Compile models once at build, not per-user
5. **Caching** - Static HTML caches perfectly on CDNs
6. **Resilience** - Site works even if DuckDB WASM fails to load

### SSG Implementation Path

```typescript
// vite.config.ts - Future enhancement
export default {
  plugins: [
    llmsTxtPlugin(),
    // Future: Static route generation
    ssgPlugin({
      routes: async () => {
        const models = await loadAllModels();
        return [
          "/",
          ...models.flatMap((model) => [
            `/model/${model.name}`,
            ...model.sources.map(
              (s) => `/model/${model.name}/preview/${s.name}`,
            ),
            ...model.queries.map((q) => `/model/${model.name}/query/${q.name}`),
          ]),
        ];
      },
    }),
  ],
};
```

### Hybrid Approach (Best of Both Worlds)

```
Static (build-time):
- /llms.txt ✅
- / (home page)
- /model/{name} (schema view)
- /model/{name}/preview/{source} (data preview)
- /model/{name}/query/{namedQuery} (pre-defined queries)

Dynamic (runtime):
- /model/{name}/explorer/{source}?query=... (custom queries)
- Any user interaction/filtering
```

This gives us:

- Fast initial loads
- SEO for all content
- Interactivity where needed
- Best performance characteristics

## Technical Implementation

### Current: llms.txt Generation

```typescript
// plugins/vite-plugin-llms-txt.ts
async closeBundle() {
  // 1. Create Node.js DuckDB connection
  const connection = new DuckDBConnection({
    name: "llms-txt-build",
    workingDirectory: modelsDir,
  });

  // 2. Create Malloy runtime with database connection
  const runtime = new SingleConnectionRuntime({ connection, urlReader });

  // 3. Compile models (requires DB to resolve schemas)
  const models = await Promise.all(
    malloyFiles.map(async (file) => {
      const model = await runtime.loadModel(fileUrl);  // DB access here
      return extractFromModel(model);
    })
  );

  // 4. Generate static content
  const content = generateLlmsTxtContent({ models, dataFiles });
  await fs.writeFile('dist/llms.txt', content);
}
```

### Why Runtime Generation Doesn't Work

```typescript
// ❌ This LOOKS simpler but doesn't work:
function LlmsTxtRoute() {
  // Problem 1: Must load ALL models (slow)
  // Problem 2: Must compile ALL models with DuckDB WASM (slow)
  // Problem 3: /llms.txt needs to be at root, not /#/llms.txt
  // Problem 4: Requires JavaScript execution
  // Problem 5: Not standard - crawlers expect static file

  const models = await loadAllModels(); // Slow
  const compiled = await compileAll(models); // Very slow
  return generateLlmsTxt(compiled);
}
```

### Alternative Considered: Service Worker

```typescript
// ❌ Also problematic:
self.addEventListener("fetch", (event) => {
  if (event.request.url.endsWith("/llms.txt")) {
    // Still requires compiling models in browser
    // Still needs DuckDB WASM
    // Adds service worker complexity
    // Delays first response
  }
});
```

## Monitoring & Success Metrics

- Build time for llms.txt generation (current: ~500ms, acceptable)
- llms.txt file size (current: ~5KB, excellent)
- Time to first byte for /llms.txt (should be <50ms)
- LLM crawler success rate (monitor logs)

## References

- [llms.txt Standard](https://llmstxt.org/)
- Malloy compilation architecture (requires DB connection)
- Vite SSG plugins: `vite-plugin-ssr`, `vite-ssg`
- [Schema.tsx](../src/Schema.tsx) - Runtime schema rendering (different use case)
- [schema-extractor.ts](../src/llms-txt/schema-extractor.ts) - Build-time extraction

## Alternatives Considered

### 1. Runtime Generation (Rejected)

- **Why rejected**: SEO issues, performance overhead, non-standard location
- **When to reconsider**: If schema becomes user-specific or dynamic

### 2. Mixed: Parse at build, compile at runtime (Rejected)

- **Why rejected**: Malloy requires DB connection to parse accurately
- **Misconception**: You can't just parse the `.malloy` syntax file to get schema
- **Reality**: Field types, table schemas come from the database, not the model file

### 3. External Service (Rejected)

- **Why rejected**: Adds infrastructure complexity, latency
- **When to consider**: If build times become problematic (>5 seconds)

## Notes

- Dev mode uses dynamic generation for hot-reloading (acceptable trade-off)
- Both dev and prod use the same generation logic, just triggered differently
- This pattern should extend to other routes as we implement full SSG
- The goal is to serve the entire site as static HTML with progressive enhancement

## Decision Date

2026-02-01

## Decision Makers

- Development team
- Architecture review

## Supersedes

N/A (First ADR)

## Superseded By

N/A (Current decision)
