import type { NotebookCell, ParsedNotebook } from "./notebook-types";

/**
 * Parse a .malloynb file content into structured notebook cells
 */
export function parseNotebook(content: string): ParsedNotebook {
  const cells: NotebookCell[] = [];
  const lines = content.split("\n");

  let currentlyParsingCell: { type: "malloy" | "markdown" } | null = null;
  let currentContent: string[] = [];

  function pushContentToCells() {
    if (null !== currentlyParsingCell) {
      if (currentlyParsingCell.type === "malloy") {
        cells.push({
          type: currentlyParsingCell.type,
          code: currentContent.join("\n").trim(),
        });
      } else {
        cells.push({
          type: currentlyParsingCell.type,
          content: currentContent.join("\n").trim(),
        });
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith(">>>malloy")) {
      // Save previous cell if exists
      if (null !== currentlyParsingCell) {
        pushContentToCells();
        currentContent = [];
      }
      currentlyParsingCell = { type: "malloy" };
    } else if (trimmedLine.startsWith(">>>markdown")) {
      // Save previous cell if exists
      if (null !== currentlyParsingCell) {
        pushContentToCells();
        currentContent = [];
      }
      currentlyParsingCell = { type: "markdown" };
    } else {
      // Add line to current cell content
      currentContent.push(line);

      // if last line, save the cell
      if (i === lines.length - 1 && null !== currentlyParsingCell) {
        pushContentToCells();
      }
    }
  }

  // Extract metadata from first markdown cell if it contains frontmatter-like content
  const metadata = extractMetadata(cells);

  return {
    cells: cells,
    metadata,
    toModel: () =>
      cells
        .filter((cell) => "malloy" === cell.type)
        .map((cell) => cell.code)
        .join("\n"),
  };
}

/**
 * Extract metadata from notebook cells
 * Look for title in first markdown cell (# Title pattern)
 */
function extractMetadata(cells: NotebookCell[]): { title?: string } {
  const metadata: { title?: string } = {};

  // Look for title in first markdown cell
  const firstMarkdownCell = cells.find((cell) => cell.type === "markdown");
  if (firstMarkdownCell) {
    const titleMatch = firstMarkdownCell.content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1]?.trim();
    }
  }

  return metadata;
}

/**
 * Simple validation for notebook content
 */
export function validateNotebook(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!content.trim()) {
    errors.push("Notebook file is empty");
    return { valid: false, errors };
  }

  // Check for at least one cell delimiter
  if (!content.includes(">>>malloy") && !content.includes(">>>markdown")) {
    errors.push("No valid cell delimiters found (>>>malloy or >>>markdown)");
  }

  // Check for balanced cells (not strictly required but good practice)
  const malloyCount = (content.match(/>>>malloy/g) || []).length;
  const markdownCount = (content.match(/>>>markdown/g) || []).length;

  if (malloyCount === 0 && markdownCount === 0) {
    errors.push("No Malloy or Markdown cells found");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
