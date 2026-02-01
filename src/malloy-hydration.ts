/**
 * Malloy Render Hydration Support
 *
 * This module provides hydration capabilities for @malloydata/render.
 * It wraps the MalloyRenderer to support:
 * 1. Pre-rendering to static HTML (for SSG/SSR)
 * 2. Hydrating pre-rendered HTML with interactivity
 *
 * NOTE: This module works with the patched @malloydata/render package
 * that adds a hydrate() method to MalloyViz. The patch is applied via
 * patch-package (see patches/@malloydata+render+0.0.335.patch).
 */

import { MalloyRenderer } from "@malloydata/render";
import type { Result } from "@malloydata/malloy-interfaces";

export interface HydratableRendererOptions {
  tableConfig?: {
    disableVirtualization?: boolean;
    rowLimit?: number;
    shouldFillWidth?: boolean;
    enableDrill?: boolean;
  };
  dashboardConfig?: {
    disableVirtualization?: boolean;
  };
  onClick?: (payload: unknown) => void;
  onDrill?: (drillData: unknown) => void;
  onError?: (error: Error) => void;
  vegaConfigOverride?: (chartType: string) => Record<string, unknown> | undefined;
  modalElement?: HTMLElement;
  scrollEl?: HTMLElement;
}

/**
 * Extended MalloyRenderer with hydration support
 */
export class HydratableMalloyRenderer {
  private renderer: ReturnType<typeof MalloyRenderer.prototype.createViz>;
  private result: Result | null = null;

  constructor(options: HydratableRendererOptions = {}) {
    const malloyRenderer = new MalloyRenderer();
    this.renderer = malloyRenderer.createViz(options);
  }

  /**
   * Set the query result to render
   */
  setResult(result: Result): void {
    this.result = result;
    this.renderer.setResult(result);
  }

  /**
   * Standard render - clears container and renders fresh
   */
  render(container: HTMLElement): void {
    this.renderer.render(container);
  }

  /**
   * Get static HTML suitable for pre-rendering
   * Uses disableVirtualization to ensure all content is rendered
   */
  async getStaticHTML(): Promise<string> {
    return this.renderer.getHTML();
  }

  /**
   * Pre-render to static HTML with full styles
   * This is the method to use at build time
   */
  async prerenderToHTML(options: {
    includeStyles?: boolean;
    wrapperClass?: string;
  } = {}): Promise<string> {
    const { includeStyles = true, wrapperClass = "malloy-prerendered" } = options;

    // Get the rendered HTML
    const contentHTML = await this.renderer.getHTML();

    if (!includeStyles) {
      return `<div class="${wrapperClass}" data-malloy-prerendered="true">${contentHTML}</div>`;
    }

    // Extract Malloy styles from document
    const styles = this.extractMalloyStyles();

    return `
<div class="${wrapperClass}" data-malloy-prerendered="true">
  <style>${styles}</style>
  ${contentHTML}
</div>`.trim();
  }

  /**
   * Hydrate pre-rendered HTML with interactivity
   *
   * Uses the patched MalloyViz.hydrate() method which:
   * 1. Detects pre-rendered content via data-malloy-prerendered attribute
   * 2. Preserves scroll position during re-render
   * 3. Attaches event handlers to the content
   *
   * @param container - Element containing pre-rendered HTML
   */
  hydrate(container: HTMLElement): void {
    if (!this.result) {
      throw new Error("No result set. Call setResult() first.");
    }

    // Use the patched hydrate method directly
    // This method is added by patches/@malloydata+render+0.0.335.patch
    this.renderer.hydrate(container);
  }

  /**
   * Hydrate with additional pre-processing (async version)
   *
   * This method provides additional flexibility for cases where
   * you need to perform async operations before hydration.
   */
  async hydrateAsync(container: HTMLElement): Promise<void> {
    if (!this.result) {
      throw new Error("No result set. Call setResult() first.");
    }

    // Check if container has pre-rendered content
    const isPrerendered = container.hasAttribute("data-malloy-prerendered") ||
      container.querySelector("[data-malloy-prerendered]") !== null;

    if (!isPrerendered) {
      // No pre-rendered content, just do a normal render
      this.render(container);
      return;
    }

    // Find the actual content container
    const contentContainer = container.hasAttribute("data-malloy-prerendered")
      ? container
      : container.querySelector("[data-malloy-prerendered]") as HTMLElement;

    if (!contentContainer) {
      this.render(container);
      return;
    }

    // Use the patched hydrate method
    this.renderer.hydrate(contentContainer);

    // Wait for hydration to complete
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Progressive hydration - hydrates visible content first
   * Useful for large tables where virtual scroll is disabled
   */
  async hydrateProgressive(container: HTMLElement): Promise<void> {
    // For now, just use regular hydrate
    // Future: implement intersection observer based progressive hydration
    await this.hydrate(container);
  }

  /**
   * Extract Malloy-specific styles from the document
   */
  private extractMalloyStyles(): string {
    const styles: string[] = [];

    // Get Malloy-injected styles
    document.querySelectorAll('style[data-malloy-viz="true"]').forEach(style => {
      if (style.textContent) {
        styles.push(style.textContent);
      }
    });

    // If no Malloy styles found, try to extract from rendered content
    if (styles.length === 0) {
      // Fallback: include common Malloy CSS variables and base styles
      styles.push(this.getDefaultMalloyStyles());
    }

    return styles.join("\n");
  }

  /**
   * Default Malloy styles for pre-rendered content
   */
  private getDefaultMalloyStyles(): string {
    return `
/* Malloy Render Default Styles */
:root {
  --malloy-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --malloy-border-color: #e2e8f0;
  --malloy-header-bg: #f8fafc;
  --malloy-hover-bg: #f1f5f9;
  --malloy-text-primary: #1e293b;
  --malloy-text-secondary: #64748b;
  --malloy-title-color: #505050;
}

.malloy-prerendered {
  font-family: var(--malloy-font-family);
}

.malloy-prerendered table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}

.malloy-prerendered th,
.malloy-prerendered td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--malloy-border-color);
  text-align: left;
}

.malloy-prerendered th {
  background: var(--malloy-header-bg);
  font-weight: 600;
  color: var(--malloy-title-color);
}

.malloy-prerendered tbody tr:hover {
  background: var(--malloy-hover-bg);
}
    `.trim();
  }

  /**
   * Remove the renderer and clean up
   */
  remove(): void {
    this.renderer.remove();
  }
}

/**
 * Create a pre-rendered HTML string from a query result
 * This is a standalone function for build-time use
 */
export async function prerenderMalloyResult(
  result: Result,
  options: HydratableRendererOptions = {}
): Promise<string> {
  // Ensure virtualization is disabled for pre-rendering
  const prerenderOptions: HydratableRendererOptions = {
    ...options,
    tableConfig: {
      ...options.tableConfig,
      disableVirtualization: true,
    },
    dashboardConfig: {
      ...options.dashboardConfig,
      disableVirtualization: true,
    },
  };

  const renderer = new HydratableMalloyRenderer(prerenderOptions);
  renderer.setResult(result);

  return renderer.prerenderToHTML({ includeStyles: true });
}

/**
 * Hydrate a pre-rendered element
 */
export async function hydrateMalloyResult(
  container: HTMLElement,
  result: Result,
  options: HydratableRendererOptions = {}
): Promise<HydratableMalloyRenderer> {
  const renderer = new HydratableMalloyRenderer(options);
  renderer.setResult(result);
  await renderer.hydrate(container);
  return renderer;
}

export { MalloyRenderer };
