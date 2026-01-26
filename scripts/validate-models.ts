#!/usr/bin/env npx tsx

/**
 * Validates that all Malloy models in examples directories have valid syntax.
 * This performs a basic syntax check - it cannot fully validate models
 * without a real database connection to fetch table schemas.
 *
 * Usage: npx tsx scripts/validate-models.ts [optional-specific-directory]
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

interface ValidationResult {
  file: string;
  dir: string;
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

function validateMalloyFile(filePath: string, dirName: string): ValidationResult {
  const fileName = filePath.split("/").pop() ?? filePath;

  try {
    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    const hasSource = MALLOY_PATTERNS.source.test(content);
    const hasQuery = MALLOY_PATTERNS.query.test(content);
    const hasView = MALLOY_PATTERNS.view.test(content);
    const hasImport = MALLOY_PATTERNS.import.test(content);

    const hasValidContent = hasSource || hasQuery || hasView || hasImport;

    if (!hasValidContent && content.trim().length > 0) {
      return {
        file: fileName,
        dir: dirName,
        success: false,
        fileSize: stats.size,
        hasSource,
        hasQuery,
        error: "No valid Malloy constructs found",
      };
    }

    for (const { pattern, message } of SYNTAX_ERROR_PATTERNS) {
      if (pattern.test(content)) {
        return {
          file: fileName,
          dir: dirName,
          success: false,
          fileSize: stats.size,
          hasSource,
          hasQuery,
          error: `Syntax error: ${message}`,
        };
      }
    }

    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        file: fileName,
        dir: dirName,
        success: false,
        fileSize: stats.size,
        hasSource,
        hasQuery,
        error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
      };
    }

    return {
      file: fileName,
      dir: dirName,
      success: true,
      fileSize: stats.size,
      hasSource,
      hasQuery,
    };
  } catch (e) {
    return {
      file: fileName,
      dir: dirName,
      success: false,
      fileSize: 0,
      hasSource: false,
      hasQuery: false,
      error: `Read error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function validateNotebook(filePath: string, dirName: string): ValidationResult {
  const fileName = filePath.split("/").pop() ?? filePath;

  try {
    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    const hasMalloyCell = content.includes(">>>malloy");
    const hasMarkdownCell = content.includes(">>>markdown");

    if (hasMalloyCell || hasMarkdownCell) {
      return {
        file: fileName,
        dir: dirName,
        success: true,
        fileSize: stats.size,
        hasSource: false,
        hasQuery: hasMalloyCell,
      };
    } else {
      return {
        file: fileName,
        dir: dirName,
        success: false,
        fileSize: stats.size,
        hasSource: false,
        hasQuery: false,
        error: "No notebook cells found",
      };
    }
  } catch (e) {
    return {
      file: fileName,
      dir: dirName,
      success: false,
      fileSize: 0,
      hasSource: false,
      hasQuery: false,
      error: `Read error: ${e}`,
    };
  }
}

function validateDirectory(dirPath: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const dirName = dirPath.split("/").pop() ?? dirPath;

  if (!existsSync(dirPath)) {
    return results;
  }

  const files = readdirSync(dirPath);
  const malloyFiles = files.filter((f) => extname(f) === ".malloy");
  const notebookFiles = files.filter((f) => extname(f) === ".malloynb");

  for (const file of malloyFiles) {
    results.push(validateMalloyFile(join(dirPath, file), dirName));
  }

  for (const file of notebookFiles) {
    results.push(validateNotebook(join(dirPath, file), dirName));
  }

  return results;
}

async function main(): Promise<void> {
  const specificDir = process.argv[2];

  let directories: string[];

  if (specificDir) {
    directories = [resolve(specificDir)];
  } else {
    // Scan all examples directories
    const examplesDir = join(PROJECT_ROOT, "examples");
    if (!existsSync(examplesDir)) {
      console.error("No examples directory found");
      process.exit(1);
    }
    directories = readdirSync(examplesDir)
      .map((d) => join(examplesDir, d))
      .filter((d) => statSync(d).isDirectory());
  }

  console.log("Validating Malloy models...\n");

  const allResults: ValidationResult[] = [];

  for (const dir of directories) {
    const dirName = dir.split("/").pop() ?? dir;
    const results = validateDirectory(dir);

    if (results.length > 0) {
      console.log(`[${dirName}]`);
      for (const result of results) {
        if (result.success) {
          const type = result.file.endsWith(".malloynb") ? "notebook" : "";
          const features = [];
          if (result.hasSource) features.push("source");
          if (result.hasQuery) features.push("query");
          const info = type || features.join(", ") || "import";
          console.log(`  ✓ ${result.file} (${info})`);
        } else {
          console.log(`  ✗ ${result.file}`);
          console.log(`    ${result.error}`);
        }
      }
      console.log("");
      allResults.push(...results);
    }
  }

  console.log("─".repeat(50));

  const passed = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success).length;

  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("\nValidation completed with errors!");
    process.exit(1);
  } else {
    console.log("\nAll models validated successfully!");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Validation script error:", e);
  process.exit(1);
});
