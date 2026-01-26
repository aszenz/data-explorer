#!/usr/bin/env npx tsx

/**
 * Validates that all Malloy models in a directory have valid syntax.
 * This performs a basic syntax check - it cannot fully validate models
 * without a real database connection to fetch table schemas.
 *
 * Usage: npx tsx scripts/validate-models.ts [models-directory]
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";

const modelsDir = process.argv[2] ?? "./example/models";
const resolvedDir = resolve(modelsDir);

interface ValidationResult {
  file: string;
  success: boolean;
  fileSize: number;
  hasSource: boolean;
  hasQuery: boolean;
  error?: string;
}

// Basic syntax patterns to check for in Malloy files
const MALLOY_PATTERNS = {
  source: /\bsource:\s+\w+\s+is\b/,
  query: /\bquery:\s+\w+\s+is\b/,
  view: /\bview:\s+\w+\s+is\b/,
  measure: /\bmeasure:\s+\w+\s+is\b/,
  dimension: /\bdimension:\s+\w+\s+is\b/,
  import: /\bimport\s+["']/,
};

// Common syntax errors to detect
const SYNTAX_ERROR_PATTERNS = [
  { pattern: /source:\s*$/m, message: "Incomplete source definition" },
  { pattern: /query:\s*$/m, message: "Incomplete query definition" },
];

function validateMalloyFile(filePath: string): ValidationResult {
  const fileName = filePath.split("/").pop() ?? filePath;

  try {
    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    // Check for basic Malloy constructs
    const hasSource = MALLOY_PATTERNS.source.test(content);
    const hasQuery = MALLOY_PATTERNS.query.test(content);
    const hasView = MALLOY_PATTERNS.view.test(content);
    const hasImport = MALLOY_PATTERNS.import.test(content);

    // A valid Malloy file should have at least one of these
    const hasValidContent = hasSource || hasQuery || hasView || hasImport;

    if (!hasValidContent && content.trim().length > 0) {
      return {
        file: fileName,
        success: false,
        fileSize: stats.size,
        hasSource,
        hasQuery,
        error: "No valid Malloy constructs found (source, query, view, or import)",
      };
    }

    // Check for common syntax errors
    for (const { pattern, message } of SYNTAX_ERROR_PATTERNS) {
      if (pattern.test(content)) {
        return {
          file: fileName,
          success: false,
          fileSize: stats.size,
          hasSource,
          hasQuery,
          error: `Potential syntax error: ${message}`,
        };
      }
    }

    // Check for balanced braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        file: fileName,
        success: false,
        fileSize: stats.size,
        hasSource,
        hasQuery,
        error: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
      };
    }

    return {
      file: fileName,
      success: true,
      fileSize: stats.size,
      hasSource,
      hasQuery,
    };
  } catch (e) {
    return {
      file: fileName,
      success: false,
      fileSize: 0,
      hasSource: false,
      hasQuery: false,
      error: `Failed to read file: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function validateModels(): Promise<void> {
  console.log(`Validating Malloy models in: ${resolvedDir}\n`);

  const files = readdirSync(resolvedDir);
  const malloyFiles = files.filter((f) => extname(f) === ".malloy");
  const notebookFiles = files.filter((f) => extname(f) === ".malloynb");

  if (malloyFiles.length === 0 && notebookFiles.length === 0) {
    console.log("No .malloy or .malloynb files found.");
    process.exit(0);
  }

  console.log(`Found ${malloyFiles.length} .malloy files and ${notebookFiles.length} .malloynb files\n`);

  const results: ValidationResult[] = [];
  let hasErrors = false;

  // Validate .malloy files
  for (const file of malloyFiles) {
    const filePath = join(resolvedDir, file);
    const result = validateMalloyFile(filePath);
    results.push(result);

    if (result.success) {
      const features = [];
      if (result.hasSource) features.push("source");
      if (result.hasQuery) features.push("query");
      console.log(`  ✓ ${file} (${features.join(", ") || "import only"})`);
    } else {
      hasErrors = true;
      console.log(`  ✗ ${file}`);
      console.log(`    Error: ${result.error}`);
    }
  }

  // Basic check for .malloynb files (just verify they exist and have content)
  for (const file of notebookFiles) {
    const filePath = join(resolvedDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const stats = statSync(filePath);

      // Check for notebook markers
      const hasMalloyCell = content.includes(">>>malloy");
      const hasMarkdownCell = content.includes(">>>markdown");

      if (hasMalloyCell || hasMarkdownCell) {
        console.log(`  ✓ ${file} (notebook)`);
        results.push({
          file,
          success: true,
          fileSize: stats.size,
          hasSource: false,
          hasQuery: hasMalloyCell,
        });
      } else {
        console.log(`  ✗ ${file}`);
        console.log(`    Error: No >>>malloy or >>>markdown cells found`);
        hasErrors = true;
        results.push({
          file,
          success: false,
          fileSize: stats.size,
          hasSource: false,
          hasQuery: false,
          error: "No notebook cells found",
        });
      }
    } catch (e) {
      hasErrors = true;
      console.log(`  ✗ ${file}`);
      console.log(`    Error: Failed to read file`);
      results.push({
        file,
        success: false,
        fileSize: 0,
        hasSource: false,
        hasQuery: false,
        error: `Failed to read: ${e}`,
      });
    }
  }

  console.log("");
  console.log("─".repeat(50));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (hasErrors) {
    console.log("\nValidation completed with errors!");
    process.exit(1);
  } else {
    console.log("\nAll models validated successfully!");
    process.exit(0);
  }
}

validateModels().catch((e) => {
  console.error("Validation script error:", e);
  process.exit(1);
});
