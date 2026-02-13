import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "prerender-output");

// Ensure output directory exists
test.beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
});

/**
 * Helper to capture and save HTML from rendered page
 */
async function captureRenderedHTML(
  page: Page,
  selector: string,
  filename: string,
): Promise<{ html: string; analysis: ElementAnalysis }> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: "attached", timeout: 30000 });

  const html = await element.innerHTML();
  const fullPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(fullPath, html, "utf-8");

  // Analyze the HTML structure
  const analysis = await analyzeElement(page, selector);

  return { html, analysis };
}

interface ElementAnalysis {
  tagCounts: Record<string, number>;
  hasCanvas: boolean;
  hasSvg: boolean;
  hasVegaEmbed: boolean;
  hasSolidMarkers: boolean;
  hasVirtualScroll: boolean;
  hasTables: boolean;
  interactiveElements: number;
  totalElements: number;
  customDataAttributes: string[];
  inlineStyles: number;
}

/**
 * Analyze HTML element structure for pre-rendering assessment
 */
async function analyzeElement(
  page: Page,
  selector: string,
): Promise<ElementAnalysis> {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) {
      return {
        tagCounts: {},
        hasCanvas: false,
        hasSvg: false,
        hasVegaEmbed: false,
        hasSolidMarkers: false,
        hasVirtualScroll: false,
        hasTables: false,
        interactiveElements: 0,
        totalElements: 0,
        customDataAttributes: [],
        inlineStyles: 0,
      };
    }

    const allElements = el.querySelectorAll("*");
    const tagCounts: Record<string, number> = {};
    let interactiveElements = 0;
    let inlineStyles = 0;
    const customDataAttributes = new Set<string>();

    allElements.forEach((elem) => {
      const tag = elem.tagName.toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;

      // Check for interactive elements
      if (
        ["button", "input", "select", "a"].includes(tag) ||
        elem.hasAttribute("onclick") ||
        elem.hasAttribute("tabindex")
      ) {
        interactiveElements++;
      }

      // Check for inline styles
      if (elem.hasAttribute("style")) {
        inlineStyles++;
      }

      // Collect custom data attributes
      Array.from(elem.attributes)
        .filter((attr) => attr.name.startsWith("data-"))
        .forEach((attr) => customDataAttributes.add(attr.name));
    });

    return {
      tagCounts,
      hasCanvas: el.querySelectorAll("canvas").length > 0,
      hasSvg: el.querySelectorAll("svg").length > 0,
      hasVegaEmbed:
        el.querySelectorAll('[class*="vega"]').length > 0 ||
        el.innerHTML.includes("vega"),
      hasSolidMarkers:
        el.innerHTML.includes("_$") ||
        el.querySelectorAll("[data-solid]").length > 0,
      hasVirtualScroll:
        el.querySelectorAll('[style*="transform: translateY"]').length > 0 ||
        el.querySelectorAll('[class*="virtual"]').length > 0 ||
        el.innerHTML.includes("translateY"),
      hasTables: el.querySelectorAll("table").length > 0,
      interactiveElements,
      totalElements: allElements.length,
      customDataAttributes: Array.from(customDataAttributes),
      inlineStyles,
    };
  }, selector);
}

/**
 * Save full page HTML with styles
 */
async function saveFullPageHTML(page: Page, filename: string): Promise<void> {
  const html = await page.content();
  const fullPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(fullPath, html, "utf-8");
}

/**
 * Create standalone HTML with extracted styles
 */
async function createStandaloneHTML(
  page: Page,
  contentSelector: string,
  filename: string,
): Promise<void> {
  const result = await page.evaluate((sel) => {
    const content = document.querySelector(sel);
    if (!content) return { content: "", styles: "" };

    // Collect all stylesheets
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          // Cross-origin stylesheets can't be read
          return "";
        }
      })
      .join("\n");

    return {
      content: content.outerHTML,
      styles,
    };
  }, contentSelector);

  const standaloneHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pre-rendered Content - ${filename}</title>
  <style>
${result.styles}
  </style>
</head>
<body>
  ${result.content}
</body>
</html>`;

  const fullPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(fullPath, standaloneHTML, "utf-8");
}

test.describe("Pre-render Analysis - Query Routes", () => {
  test("Capture Preview route HTML structure", async ({ page }) => {
    await page.goto("./#/model/invoices/preview/invoices");

    // Wait for result to render
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    // Find the Malloy render container
    const { html, analysis } = await captureRenderedHTML(
      page,
      "[data-testid='preview-result'], .preview-result, #root",
      "preview-render-container.html",
    );

    // Save analysis
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "preview-analysis.json"),
      JSON.stringify(analysis, null, 2),
    );

    console.log("Preview Route Analysis:");
    console.log(`  Total elements: ${analysis.totalElements}`);
    console.log(`  Has tables: ${analysis.hasTables}`);
    console.log(`  Has SVG: ${analysis.hasSvg}`);
    console.log(`  Has Canvas: ${analysis.hasCanvas}`);
    console.log(`  Has Vega: ${analysis.hasVegaEmbed}`);
    console.log(`  Has virtual scroll: ${analysis.hasVirtualScroll}`);
    console.log(`  Interactive elements: ${analysis.interactiveElements}`);
    console.log(`  Data attributes: ${analysis.customDataAttributes.join(", ")}`);

    // Save standalone HTML
    await createStandaloneHTML(page, "#root", "preview-standalone.html");
    await saveFullPageHTML(page, "preview-full-page.html");

    expect(html).toBeTruthy();
  });

  test("Capture Named Query route HTML structure", async ({ page }) => {
    await page.goto("./#/model/invoices/query/by_status");

    // Wait for query results
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("link", { name: "Download CSV" })).toBeVisible({
      timeout: 30000,
    });

    const { html, analysis } = await captureRenderedHTML(
      page,
      "#root",
      "query-render-container.html",
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "query-analysis.json"),
      JSON.stringify(analysis, null, 2),
    );

    console.log("Query Route Analysis:");
    console.log(`  Total elements: ${analysis.totalElements}`);
    console.log(`  Has tables: ${analysis.hasTables}`);
    console.log(`  Has SVG: ${analysis.hasSvg}`);
    console.log(`  Has Canvas: ${analysis.hasCanvas}`);
    console.log(`  Has Vega: ${analysis.hasVegaEmbed}`);
    console.log(`  Has virtual scroll: ${analysis.hasVirtualScroll}`);
    console.log(`  Interactive elements: ${analysis.interactiveElements}`);

    await createStandaloneHTML(page, "#root", "query-standalone.html");
    await saveFullPageHTML(page, "query-full-page.html");

    expect(html).toBeTruthy();
  });

  test("Capture Explorer with query results", async ({ page }) => {
    // Load explorer with a pre-defined query
    await page.goto(
      "./#/model/invoices/explorer/invoices?query=run:invoices->by_status&run=true",
    );

    // Wait for results to load
    await page
      .getByTestId("loader")
      .waitFor({ state: "hidden", timeout: 30000 })
      .catch(() => {});

    // Wait for table data
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 });

    const { html, analysis } = await captureRenderedHTML(
      page,
      "#root",
      "explorer-render-container.html",
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "explorer-analysis.json"),
      JSON.stringify(analysis, null, 2),
    );

    console.log("Explorer Route Analysis:");
    console.log(`  Total elements: ${analysis.totalElements}`);
    console.log(`  Has tables: ${analysis.hasTables}`);
    console.log(`  Has SVG: ${analysis.hasSvg}`);
    console.log(`  Has Canvas: ${analysis.hasCanvas}`);
    console.log(`  Has Vega: ${analysis.hasVegaEmbed}`);
    console.log(`  Has virtual scroll: ${analysis.hasVirtualScroll}`);
    console.log(`  Interactive elements: ${analysis.interactiveElements}`);

    await createStandaloneHTML(page, "#root", "explorer-standalone.html");
    await saveFullPageHTML(page, "explorer-full-page.html");

    expect(html).toBeTruthy();
  });
});

test.describe("Pre-render Analysis - Notebook Routes", () => {
  test("Capture Notebook HTML structure", async ({ page }) => {
    await page.goto("./#/notebook/Invoices");

    // Wait for notebook to fully load
    await expect(
      page.getByRole("heading", { name: "Invoice Analysis" }),
    ).toBeVisible({ timeout: 30000 });

    // Wait for query cells to render
    await expect(
      page.getByRole("heading", { name: "1. Data Preview" }),
    ).toBeVisible();

    // Give extra time for all cells to render
    await page.waitForTimeout(3000);

    const { html, analysis } = await captureRenderedHTML(
      page,
      "#root",
      "notebook-render-container.html",
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "notebook-analysis.json"),
      JSON.stringify(analysis, null, 2),
    );

    console.log("Notebook Route Analysis:");
    console.log(`  Total elements: ${analysis.totalElements}`);
    console.log(`  Has tables: ${analysis.hasTables}`);
    console.log(`  Has SVG: ${analysis.hasSvg}`);
    console.log(`  Has Canvas: ${analysis.hasCanvas}`);
    console.log(`  Has Vega: ${analysis.hasVegaEmbed}`);
    console.log(`  Has virtual scroll: ${analysis.hasVirtualScroll}`);
    console.log(`  Interactive elements: ${analysis.interactiveElements}`);
    console.log(`  Inline styles: ${analysis.inlineStyles}`);

    await createStandaloneHTML(page, "#root", "notebook-standalone.html");
    await saveFullPageHTML(page, "notebook-full-page.html");

    expect(html).toBeTruthy();
  });

  test("Capture Notebook expanded cell", async ({ page }) => {
    await page.goto("./#/notebook/Invoices?cell-expanded=3");

    await expect(page.getByTestId("notebook-cell-popover-3")).toBeVisible({
      timeout: 30000,
    });

    const { html, analysis } = await captureRenderedHTML(
      page,
      "[data-testid='notebook-cell-popover-3']",
      "notebook-cell-expanded.html",
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "notebook-cell-analysis.json"),
      JSON.stringify(analysis, null, 2),
    );

    console.log("Notebook Cell Analysis:");
    console.log(`  Total elements: ${analysis.totalElements}`);
    console.log(`  Has tables: ${analysis.hasTables}`);
    console.log(`  Has SVG: ${analysis.hasSvg}`);
    console.log(`  Has virtual scroll: ${analysis.hasVirtualScroll}`);

    await createStandaloneHTML(page, "#root", "notebook-cell-standalone.html");

    expect(html).toBeTruthy();
  });
});

test.describe("Malloy Render Deep Analysis", () => {
  test("Analyze table rendering structure", async ({ page }) => {
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    // Deep analysis of table structure
    const tableAnalysis = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const results: Array<{
        rowCount: number;
        cellCount: number;
        hasVirtualScroll: boolean;
        containerStyles: string;
        rowHeights: number[];
        visibleRows: number;
        totalRowsAttr: string | null;
      }> = [];

      tables.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        const cells = table.querySelectorAll("td, th");
        const container = table.closest("[style*='overflow']");

        // Check for virtual scroll indicators
        const hasVirtualScroll =
          table.closest("[style*='translateY']") !== null ||
          document.querySelector('[data-testid*="virtual"]') !== null;

        // Get row heights
        const rowHeights = Array.from(rows)
          .slice(0, 5)
          .map((row) => row.getBoundingClientRect().height);

        results.push({
          rowCount: rows.length,
          cellCount: cells.length,
          hasVirtualScroll,
          containerStyles: container
            ? (container as HTMLElement).style.cssText
            : "",
          rowHeights,
          visibleRows: rows.length,
          totalRowsAttr: table.getAttribute("data-total-rows"),
        });
      });

      return results;
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "table-deep-analysis.json"),
      JSON.stringify(tableAnalysis, null, 2),
    );

    console.log("Table Structure Analysis:");
    tableAnalysis.forEach((t, i) => {
      console.log(`  Table ${i + 1}:`);
      console.log(`    Rows: ${t.rowCount}`);
      console.log(`    Cells: ${t.cellCount}`);
      console.log(`    Virtual scroll: ${t.hasVirtualScroll}`);
      console.log(`    Row heights: ${t.rowHeights.join(", ")}`);
    });
  });

  test("Analyze Vega/SVG visualization structure", async ({ page }) => {
    // Look for a model with charts/visualizations
    await page.goto("./#/notebook/Invoices");
    await expect(
      page.getByRole("heading", { name: "Invoice Analysis" }),
    ).toBeVisible({ timeout: 30000 });

    // Wait for visualizations to render
    await page.waitForTimeout(3000);

    const svgAnalysis = await page.evaluate(() => {
      const svgs = document.querySelectorAll("svg");
      const canvases = document.querySelectorAll("canvas");

      return {
        svgCount: svgs.length,
        canvasCount: canvases.length,
        svgDetails: Array.from(svgs).map((svg) => ({
          width: svg.getAttribute("width"),
          height: svg.getAttribute("height"),
          viewBox: svg.getAttribute("viewBox"),
          childElements: svg.querySelectorAll("*").length,
          hasVegaClass:
            svg.classList.contains("marks") ||
            svg.closest(".vega-embed") !== null,
          parentClass: svg.parentElement?.className || "",
        })),
        vegaEmbed: document.querySelectorAll(".vega-embed").length,
        vegaContainer: document.querySelectorAll("[class*='vega']").length,
      };
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "svg-vega-analysis.json"),
      JSON.stringify(svgAnalysis, null, 2),
    );

    console.log("SVG/Vega Analysis:");
    console.log(`  SVG count: ${svgAnalysis.svgCount}`);
    console.log(`  Canvas count: ${svgAnalysis.canvasCount}`);
    console.log(`  Vega embeds: ${svgAnalysis.vegaEmbed}`);
    svgAnalysis.svgDetails.forEach((s, i) => {
      console.log(`  SVG ${i + 1}: ${s.childElements} elements, Vega: ${s.hasVegaClass}`);
    });
  });

  test("Extract Solid.js rendering markers", async ({ page }) => {
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    const solidAnalysis = await page.evaluate(() => {
      const html = document.body.innerHTML;

      // Look for Solid.js markers
      const solidMarkers = {
        hasDataHk: html.includes("data-hk"),
        hasDataSolid: document.querySelectorAll("[data-solid]").length > 0,
        hasInternalMarkers: html.includes("_$") || html.includes("$PROXY"),
        commentNodes: (() => {
          const comments: string[] = [];
          const iterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_COMMENT,
          );
          let node;
          while ((node = iterator.nextNode())) {
            if (node.textContent && node.textContent.length < 100) {
              comments.push(node.textContent);
            }
          }
          return comments.slice(0, 20);
        })(),
      };

      // Look for event listeners attached to elements
      const elementsWithListeners: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const attrs = Array.from(el.attributes).map((a) => a.name);
        const eventAttrs = attrs.filter(
          (a) => a.startsWith("on") || a.startsWith("data-on"),
        );
        if (eventAttrs.length > 0) {
          elementsWithListeners.push(
            `${el.tagName}: ${eventAttrs.join(", ")}`,
          );
        }
      });

      return {
        ...solidMarkers,
        elementsWithListeners: elementsWithListeners.slice(0, 20),
      };
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "solid-markers-analysis.json"),
      JSON.stringify(solidAnalysis, null, 2),
    );

    console.log("Solid.js Markers Analysis:");
    console.log(`  Has data-hk: ${solidAnalysis.hasDataHk}`);
    console.log(`  Has data-solid: ${solidAnalysis.hasDataSolid}`);
    console.log(`  Has internal markers: ${solidAnalysis.hasInternalMarkers}`);
    console.log(`  Comment nodes: ${solidAnalysis.commentNodes.length}`);
    console.log(`  Elements with listeners: ${solidAnalysis.elementsWithListeners.length}`);
  });
});

test.describe("JavaScript Disabled Behavior", () => {
  test.use({ javaScriptEnabled: false });

  test("Page behavior without JavaScript", async ({ page }) => {
    // This tests what users see if JS doesn't load
    await page.goto("./");

    // Capture the no-JS state
    const content = await page.content();
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "no-javascript-home.html"),
      content,
    );

    // Check what's visible
    const bodyText = await page.locator("body").textContent();
    console.log("No-JS Content:", bodyText?.substring(0, 200));

    // The page should show something (even if just loading indicator)
    expect(content).toContain("root");
  });
});

test.describe("Pre-render Feasibility Tests", () => {
  test("Test static HTML extraction from query results", async ({ page }) => {
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Extract just the result container's HTML
    const resultHTML = await page.evaluate(() => {
      // Find the Malloy render result container
      const containers = document.querySelectorAll("table");
      if (containers.length === 0) return null;

      // Get the closest meaningful container
      const mainTable = containers[0];
      if (!mainTable) return null;
      const wrapper = mainTable.closest("div");

      return {
        tableHTML: mainTable.outerHTML,
        wrapperHTML: wrapper?.outerHTML ?? null,
        computedStyles: (() => {
          const styles: Record<string, string> = {};
          const computed = window.getComputedStyle(mainTable);
          ["fontFamily", "fontSize", "color", "backgroundColor"].forEach(
            (prop) => {
              styles[prop] = computed.getPropertyValue(
                prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
              );
            },
          );
          return styles;
        })(),
      };
    });

    if (resultHTML) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "extracted-table.html"),
        resultHTML.tableHTML,
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "extracted-wrapper.html"),
        resultHTML.wrapperHTML || "",
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, "table-computed-styles.json"),
        JSON.stringify(resultHTML.computedStyles, null, 2),
      );
    }

    expect(resultHTML).toBeTruthy();
  });

  test("Test scroll behavior requirements", async ({ page }) => {
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    // Test if scrolling loads more content (virtual scroll detection)
    const scrollAnalysis = await page.evaluate(() => {
      const container = document.querySelector(
        '[style*="overflow"], .overflow-auto, [class*="scroll"]',
      );
      if (!container) return { hasScrollContainer: false };

      const beforeScroll = {
        rowCount: document.querySelectorAll("tr").length,
        innerHTML: document.body.innerHTML.length,
      };

      // Try to scroll
      container.scrollTop = 500;

      return {
        hasScrollContainer: true,
        containerHeight: (container as HTMLElement).offsetHeight,
        scrollHeight: container.scrollHeight,
        beforeRowCount: beforeScroll.rowCount,
        requiresJsForScroll: container.scrollHeight > (container as HTMLElement).offsetHeight,
      };
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "scroll-analysis.json"),
      JSON.stringify(scrollAnalysis, null, 2),
    );

    console.log("Scroll Analysis:");
    console.log(`  Has scroll container: ${scrollAnalysis.hasScrollContainer}`);
    console.log(`  Requires JS for scroll: ${scrollAnalysis.requiresJsForScroll}`);
  });

  test("Create minimal pre-rendered example", async ({ page }) => {
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Create a minimal standalone HTML that shows the rendered data
    const minimalHTML = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const firstTable = tables[0];
      if (!firstTable) return "";

      // Get all relevant styles
      const styleSheets = Array.from(document.styleSheets);
      let css = "";
      styleSheets.forEach((sheet) => {
        try {
          Array.from(sheet.cssRules).forEach((rule) => {
            // Only include rules that might affect tables
            if (
              rule.cssText.includes("table") ||
              rule.cssText.includes("tr") ||
              rule.cssText.includes("td") ||
              rule.cssText.includes("th") ||
              rule.cssText.includes("cell") ||
              rule.cssText.includes("row")
            ) {
              css += rule.cssText + "\n";
            }
          });
        } catch {
          // Cross-origin
        }
      });

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pre-rendered Query Result</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    ${css}
  </style>
</head>
<body>
  <h1>Pre-rendered Query: by_status</h1>
  <div class="result-container">
    ${firstTable.outerHTML}
  </div>
  <script>
    // Minimal JS for scrolling if needed
    console.log('Pre-rendered content loaded');
  </script>
</body>
</html>`;
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "minimal-prerender-example.html"),
      minimalHTML,
    );
  });
});

test.describe("Generate Pre-render Summary Report", () => {
  test("Generate comprehensive analysis report", async ({ page }) => {
    // Navigate through all route types and collect data
    const report: {
      routes: Array<{
        name: string;
        url: string;
        analysis: ElementAnalysis | null;
        prerenderFeasibility: string;
        jsRequirements: string[];
      }>;
      recommendations: string[];
    } = {
      routes: [],
      recommendations: [],
    };

    // Test Preview Route
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });
    const previewAnalysis = await analyzeElement(page, "#root");
    report.routes.push({
      name: "Preview Route",
      url: "/model/:model/preview/:source",
      analysis: previewAnalysis,
      prerenderFeasibility: previewAnalysis.hasVirtualScroll ? "Partial" : "High",
      jsRequirements: previewAnalysis.hasVirtualScroll
        ? ["Virtual scrolling", "Table interactions"]
        : ["None for display"],
    });

    // Test Query Route
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });
    const queryAnalysis = await analyzeElement(page, "#root");
    report.routes.push({
      name: "Query Route",
      url: "/model/:model/query/:query",
      analysis: queryAnalysis,
      prerenderFeasibility: queryAnalysis.hasVirtualScroll ? "Partial" : "High",
      jsRequirements: [
        "Tab navigation",
        "CSV download (can be static link)",
        queryAnalysis.hasVirtualScroll ? "Virtual scrolling" : "",
      ].filter(Boolean),
    });

    // Test Notebook Route
    await page.goto("./#/notebook/Invoices");
    await expect(
      page.getByRole("heading", { name: "Invoice Analysis" }),
    ).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);
    const notebookAnalysis = await analyzeElement(page, "#root");
    report.routes.push({
      name: "Notebook Route",
      url: "/notebook/:notebook",
      analysis: notebookAnalysis,
      prerenderFeasibility: "Partial",
      jsRequirements: [
        "Cell expand/collapse",
        "Code syntax highlighting (can be pre-rendered)",
        notebookAnalysis.hasVirtualScroll ? "Virtual scrolling in cells" : "",
        "Interactive visualizations (Vega)",
      ].filter(Boolean),
    });

    // Generate recommendations
    report.recommendations = [
      "Tables without virtual scroll can be fully pre-rendered as static HTML",
      "SVG visualizations (Vega) can be pre-rendered but lose interactivity",
      "Virtual scroll tables require JS for scrolling - consider pagination for static version",
      "Markdown cells in notebooks can be fully pre-rendered",
      "Query results with small datasets (<100 rows) are good candidates for full pre-rendering",
      "Consider hybrid approach: pre-render HTML structure, hydrate with JS for interactivity",
    ];

    // Save the report
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "prerender-feasibility-report.json"),
      JSON.stringify(report, null, 2),
    );

    // Create readable markdown report
    const mdReport = `# Pre-rendering Feasibility Report

## Route Analysis

${report.routes
  .map(
    (r) => `### ${r.name}
- **URL Pattern**: \`${r.url}\`
- **Pre-render Feasibility**: ${r.prerenderFeasibility}
- **Total Elements**: ${r.analysis?.totalElements || "N/A"}
- **Has Tables**: ${r.analysis?.hasTables || false}
- **Has SVG**: ${r.analysis?.hasSvg || false}
- **Has Virtual Scroll**: ${r.analysis?.hasVirtualScroll || false}
- **Interactive Elements**: ${r.analysis?.interactiveElements || 0}
- **JS Requirements**: ${r.jsRequirements.join(", ") || "None"}
`,
  )
  .join("\n")}

## Recommendations

${report.recommendations.map((r) => `- ${r}`).join("\n")}

## Files Generated

- \`preview-standalone.html\` - Full preview page pre-rendered
- \`query-standalone.html\` - Full query page pre-rendered
- \`notebook-standalone.html\` - Full notebook page pre-rendered
- \`minimal-prerender-example.html\` - Minimal table extraction example
- \`*-analysis.json\` - Detailed analysis for each route type
`;

    fs.writeFileSync(path.join(OUTPUT_DIR, "REPORT.md"), mdReport);

    console.log("\n" + mdReport);
  });
});
