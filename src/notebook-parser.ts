import type {
  NotebookCell,
  ParsedNotebook,
  SourceReference,
} from "./notebook-types";

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
      metadata.title = titleMatch[1]?.trim() ?? "";
    }
  }

  return metadata;
}

/**
 * Extract source references from notebook cells
 *
 * @TODO: Convert to use Malloy's parser API instead of regex-based parsing.
 * @See: @malloydata/malloy/dist/lang/parse-malloy.d.ts
 *
 * @param cells - Array of notebook cells
 * @returns Array of unique source references with model names
 */
export function extractNotebookSources(
  cells: ParsedNotebook["cells"],
): SourceReference[] {
  const sourceReferences = cells.flatMap((cell) => {
    if (cell.type !== "malloy") return [];

    const results: SourceReference[] = [];
    const lines = cell.code.split("\n");
    let inImportStatement = false;
    let importBuffer = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      // Check if this line starts an import statement (with or without space after import)
      if (trimmed.startsWith("import")) {
        inImportStatement = true;
        importBuffer = trimmed;
      } else if (inImportStatement) {
        // Continue accumulating lines if we're in a multiline import
        importBuffer += " " + trimmed;
      }

      // Check if import statement is complete (contains 'from' and closes with .malloy)
      if (inImportStatement && importBuffer.includes("from")) {
        const match = importBuffer.match(/\.malloy["']/);
        if (match) {
          // Parse the complete import statement
          const parsed = parseImportStatement(importBuffer);
          if (parsed) {
            results.push(...parsed);
          }
          inImportStatement = false;
          importBuffer = "";
        }
      }
    }

    return results;
  });

  // Deduplicate by source name
  return sourceReferences.filter(
    (source, index, arr) =>
      arr.findIndex((s) => s.name === source.name) === index,
  );
}

/**
 * Parse a single import statement to extract source references
 * @param statement - Complete import statement string
 * @returns Array of source references, or null if parsing fails
 */
function parseImportStatement(statement: string): SourceReference[] | null {
  // Match: import [default,] {named1, named2, ...} from './path.malloy'
  //    or: import default from './path.malloy'
  // Note: \s* allows zero or more spaces to handle imports with no spaces
  const importRegex =
    /import\s*(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]\.\/([^'"]+)\.malloy['"]/;

  const match = statement.match(importRegex);
  if (!match) return null;

  const defaultImport = match[1]?.trim();
  const namedImports = match[2];
  const modelName = match[3];

  if (!modelName) return null;

  const results: SourceReference[] = [];

  // Add default import if present
  if (defaultImport) {
    results.push({ name: defaultImport, model: modelName });
  }

  // Add named imports if present
  if (namedImports) {
    const sourceNames = namedImports
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    results.push(...sourceNames.map((name) => ({ name, model: modelName })));
  }

  return results;
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
