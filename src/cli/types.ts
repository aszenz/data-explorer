/**
 * Configuration for the data-explorer build
 */
export interface DataExplorerConfig {
  /** Path to the directory containing Malloy files (.malloy, .malloynb) */
  inputPath: string;
  /** Path to output the built website */
  outputPath: string;
  /** Title for the site (shown in browser tab and home page) */
  title: string;
  /** Description shown on the home page */
  description: string;
  /** Base public path for deployment (e.g., "/my-repo/" for GitHub Pages) */
  basePath: string;
}

export const DEFAULT_CONFIG: Omit<DataExplorerConfig, "inputPath" | "outputPath"> = {
  title: "Data Explorer",
  description: "Explore and analyze your Malloy models and notebooks",
  basePath: "/",
};
