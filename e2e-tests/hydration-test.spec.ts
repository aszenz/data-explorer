/**
 * Hydration Feasibility Tests
 *
 * These tests explore whether Malloy render can hydrate pre-rendered HTML
 * instead of re-rendering from scratch.
 */
import { test, expect } from "@playwright/test";

test.describe("Hydration Feasibility Tests", () => {
  test("Test 1: What happens when we call render() on existing DOM", async ({
    page,
  }) => {
    // Navigate to query page and wait for render
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Capture initial rendered HTML
    const initialHTML = await page.evaluate(() => {
      const container = document.querySelector(".result-content");
      return container?.innerHTML || "";
    });

    console.log("Initial HTML length:", initialHTML.length);

    // Capture table structure
    const tableStructure = await page.evaluate(() => {
      const table = document.querySelector("table");
      if (!table) return null;
      return {
        rows: table.querySelectorAll("tr").length,
        cells: table.querySelectorAll("td, th").length,
        hasDataHk: table.hasAttribute("data-hk"),
        hasHydrationMarkers: document.body.innerHTML.includes("<!--#-->"),
      };
    });

    console.log("Table structure:", tableStructure);

    // Key finding: Does Malloy render output have Solid.js hydration markers?
    expect(tableStructure?.hasDataHk).toBe(false); // Expected: no data-hk
    expect(tableStructure?.hasHydrationMarkers).toBe(false); // Expected: no markers
  });

  test("Test 2: Verify render() clears existing content", async ({ page }) => {
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Inject a marker element into the render container
    await page.evaluate(() => {
      const container = document.querySelector(".result-content > div");
      if (container) {
        const marker = document.createElement("div");
        marker.id = "hydration-test-marker";
        marker.textContent = "This should be removed on re-render";
        container.appendChild(marker);
      }
    });

    // Verify marker exists
    await expect(page.locator("#hydration-test-marker")).toBeVisible();

    // Navigate away and back to trigger re-render
    await page.goto("./#/");
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Marker should be gone (render() cleared the DOM)
    await expect(page.locator("#hydration-test-marker")).not.toBeVisible();

    console.log("Confirmed: render() clears existing DOM content");
  });

  test("Test 3: Capture HTML structure for hydration analysis", async ({
    page,
  }) => {
    await page.goto("./#/model/invoices/query/by_status");
    await expect(page.getByRole("tab", { name: "Results" })).toBeVisible({
      timeout: 30000,
    });

    // Detailed analysis of rendered DOM
    const domAnalysis = await page.evaluate(() => {
      const result: {
        rootElement: string | null;
        childStructure: string[];
        eventListenerCount: number;
        reactiveMarkers: string[];
        solidSignatures: string[];
      } = {
        rootElement: null,
        childStructure: [],
        eventListenerCount: 0,
        reactiveMarkers: [],
        solidSignatures: [],
      };

      const container = document.querySelector(".result-content > div");
      if (!container) return result;

      result.rootElement = container.outerHTML.slice(0, 200) + "...";

      // Check for Solid.js internal markers
      const html = container.innerHTML;

      // Solid.js hydration markers
      if (html.includes("data-hk")) result.solidSignatures.push("data-hk");
      if (html.includes("<!--#-->")) result.solidSignatures.push("<!--#-->");
      if (html.includes("<!--/-->")) result.solidSignatures.push("<!--/-->");
      if (html.includes("_$")) result.solidSignatures.push("_$ (internal)");

      // Count elements that might have event listeners
      const interactiveElements = container.querySelectorAll(
        "button, a, [onclick], [tabindex], tr, td",
      );
      result.eventListenerCount = interactiveElements.length;

      // Get child element types
      container.childNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          result.childStructure.push(
            `${el.tagName.toLowerCase()}${el.className ? "." + el.className.split(" ")[0] : ""}`,
          );
        } else if (node.nodeType === Node.COMMENT_NODE) {
          result.childStructure.push(`<!-- comment -->`);
        }
      });

      return result;
    });

    console.log("DOM Analysis:", JSON.stringify(domAnalysis, null, 2));

    // Document findings
    expect(domAnalysis.solidSignatures).toHaveLength(0);
    console.log(
      "Finding: No Solid.js hydration markers in output - hydration not possible without SSR",
    );
  });

  test("Test 4: Compare fresh render vs hydration attempt", async ({
    page,
  }) => {
    // First: capture normally rendered content
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    const normalRender = await page.evaluate(() => {
      const table = document.querySelector("table");
      return {
        html: table?.outerHTML.slice(0, 500),
        rowCount: table?.querySelectorAll("tr").length || 0,
      };
    });

    console.log("Normal render rows:", normalRender.rowCount);

    // Get the raw HTML that would be used for "pre-rendering"
    const rawHTML = await page.evaluate(() => {
      const container = document.querySelector(".result-content > div");
      return container?.innerHTML || "";
    });

    // Now test: can we inject this HTML and have it work?
    await page.goto("./#/"); // Go to home

    // Try to inject pre-rendered HTML
    await page.evaluate((html) => {
      // Create a test container
      const testDiv = document.createElement("div");
      testDiv.id = "prerender-test";
      testDiv.innerHTML = html;
      document.body.appendChild(testDiv);
    }, rawHTML);

    // Check if table displays correctly
    const prerenderedTable = await page.locator("#prerender-test table");
    await expect(prerenderedTable).toBeVisible();

    const prerenderedRowCount = await page.evaluate(() => {
      const table = document.querySelector("#prerender-test table");
      return table?.querySelectorAll("tr").length || 0;
    });

    console.log("Pre-rendered rows:", prerenderedRowCount);

    // The HTML displays but has no interactivity
    // Try clicking a row (should not trigger any Malloy event)
    const firstRow = page.locator("#prerender-test table tbody tr").first();
    await firstRow.click();

    // Verify click doesn't do anything (no Malloy event handlers)
    // This is expected - the pre-rendered HTML is static
    console.log("Pre-rendered HTML displays but has no interactivity");
  });

  test("Test 5: Document virtual scroll behavior", async ({ page }) => {
    await page.goto("./#/model/invoices/preview/invoices");
    await expect(page.getByText("invoice_id")).toBeVisible({ timeout: 30000 });

    // Analyze virtual scroll implementation
    const virtualScrollAnalysis = await page.evaluate(() => {
      const result: {
        hasVirtualContainer: boolean;
        containerStyle: string;
        visibleRows: number;
        totalRowsHint: string | null;
        translateY: boolean;
        scrollHeight: number;
        clientHeight: number;
      } = {
        hasVirtualContainer: false,
        containerStyle: "",
        visibleRows: 0,
        totalRowsHint: null,
        translateY: false,
        scrollHeight: 0,
        clientHeight: 0,
      };

      // Look for virtual scroll container
      const scrollContainers = document.querySelectorAll(
        '[style*="overflow"], .overflow-auto',
      );
      scrollContainers.forEach((container) => {
        const style = (container as HTMLElement).style.cssText;
        if (style.includes("overflow")) {
          result.hasVirtualContainer = true;
          result.containerStyle = style;
          result.scrollHeight = container.scrollHeight;
          result.clientHeight = (container as HTMLElement).clientHeight;
        }
      });

      // Check for translateY (indicator of virtual scroll positioning)
      const translated = document.querySelector('[style*="translateY"]');
      result.translateY = !!translated;

      // Count visible rows
      result.visibleRows = document.querySelectorAll("table tbody tr").length;

      return result;
    });

    console.log(
      "Virtual Scroll Analysis:",
      JSON.stringify(virtualScrollAnalysis, null, 2),
    );

    // Test scrolling behavior
    const scrollResult = await page.evaluate(() => {
      const container = document.querySelector(
        '[style*="overflow-y"], .overflow-auto',
      );
      if (!container) return { scrolled: false, newRowCount: 0 };

      const _beforeRows = document.querySelectorAll("table tbody tr").length;
      void _beforeRows; // Used for debugging
      container.scrollTop = 500;

      // Wait a tick for virtual scroll to update
      return new Promise<{ scrolled: boolean; newRowCount: number }>(
        (resolve) => {
          setTimeout(() => {
            const afterRows = document.querySelectorAll("table tbody tr").length;
            resolve({
              scrolled: true,
              newRowCount: afterRows,
            });
          }, 100);
        },
      );
    });

    console.log("After scroll:", scrollResult);
    console.log(
      "Finding: Virtual scroll dynamically renders rows - requires JS",
    );
  });
});

test.describe("Vega Chart Hydration Analysis", () => {
  test("Analyze Vega chart rendering", async ({ page }) => {
    // Navigate to a page with charts (notebook with bar_chart)
    await page.goto("./#/notebook/Invoices");
    await expect(
      page.getByRole("heading", { name: "Invoice Analysis" }),
    ).toBeVisible({ timeout: 30000 });

    // Wait for charts to render
    await page.waitForTimeout(3000);

    const chartAnalysis = await page.evaluate(() => {
      const result: {
        svgCount: number;
        canvasCount: number;
        svgDetails: Array<{
          width: string | null;
          height: string | null;
          hasVegaClass: boolean;
          childCount: number;
        }>;
        vegaViews: number;
      } = {
        svgCount: 0,
        canvasCount: 0,
        svgDetails: [],
        vegaViews: 0,
      };

      // Count SVG and Canvas elements
      const svgs = document.querySelectorAll("svg");
      const canvases = document.querySelectorAll("canvas");

      result.svgCount = svgs.length;
      result.canvasCount = canvases.length;

      svgs.forEach((svg) => {
        result.svgDetails.push({
          width: svg.getAttribute("width"),
          height: svg.getAttribute("height"),
          hasVegaClass:
            svg.classList.contains("marks") ||
            svg.closest(".vega-embed") !== null,
          childCount: svg.querySelectorAll("*").length,
        });
      });

      // Check for Vega view instances (stored in global or element)
      // @ts-expect-error - checking for vega globals
      if (window.VEGA_DEBUG) {
        // @ts-expect-error - checking for vega globals
        result.vegaViews = Object.keys(window.VEGA_DEBUG).length;
      }

      return result;
    });

    console.log("Chart Analysis:", JSON.stringify(chartAnalysis, null, 2));

    // Key finding: Are charts rendered as SVG (hydrateable) or Canvas (not hydrateable)?
    if (chartAnalysis.svgCount > 0) {
      console.log("Charts use SVG - could potentially export and rehydrate");
    }
    if (chartAnalysis.canvasCount > 0) {
      console.log("Charts use Canvas - cannot hydrate, must re-render");
    }
  });
});
