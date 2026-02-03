/**
 * Schema extractor using Malloy libraries
 *
 * Compiles Malloy models and extracts schema information (sources, fields, queries)
 * for generating llms.txt
 */

import * as malloy from "@malloydata/malloy";
import { isSourceDef } from "@malloydata/malloy";
import { DuckDBConnection } from "@malloydata/db-duckdb";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ExtractedModel,
  ExtractedSource,
  ExtractedField,
  ExtractedQuery,
  ExtractedView,
} from "./types";

/**
 * Extract schema information from all Malloy models in a directory
 */
export async function extractModelsSchema(
  modelsDir: string,
): Promise<ExtractedModel[]> {
  try {
    await fs.access(modelsDir);
  } catch {
    return [];
  }

  const files = await fs.readdir(modelsDir);
  const malloyFiles = files
    .filter((f) => f.endsWith(".malloy"))
    .map((f) => path.join(modelsDir, f));

  if (malloyFiles.length === 0) {
    return [];
  }

  // Create a DuckDB connection for model compilation
  // Set workingDirectory so DuckDB can find data files referenced in models
  const connection = new DuckDBConnection({
    name: "llms-txt-build",
    workingDirectory: modelsDir,
  });

  // Create runtime with a URL reader that loads from the filesystem
  const runtime = new malloy.SingleConnectionRuntime({
    connection,
    urlReader: {
      readURL: async (url: URL) => {
        // Handle file:// URLs pointing to our models directory
        const fileName = url.pathname.split("/").pop() ?? "";
        const filePath = path.join(modelsDir, fileName);

        try {
          await fs.access(filePath);
        } catch {
          throw new Error(`Model file not found: ${filePath}`);
        }

        const contents = await fs.readFile(filePath, "utf-8");
        return { contents };
      },
    },
  });

  // Process all models in parallel - they're read-only operations
  const results = await Promise.all(
    malloyFiles.map(async (filePath) => {
      const modelName = path.basename(filePath, ".malloy");
      const modelCode = await fs.readFile(filePath, "utf-8");

      try {
        const modelUrl = new URL(`file:///${modelName}.malloy`);
        const modelMaterializer = runtime.loadModel(modelUrl);
        const model = await modelMaterializer.getModel();

        return extractFromModel(modelName, model, modelCode);
      } catch (error) {
        // Log but continue with other models
        console.warn(
          `[llms.txt] Warning: Could not compile model ${modelName}:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    }),
  );

  // Clean up connection
  await connection.close();

  // Filter out failed models (null values) and return
  return results.filter((result): result is ExtractedModel => result !== null);
}

/**
 * Extract schema information from a compiled Malloy model
 */
function extractFromModel(
  name: string,
  model: malloy.Model,
  rawCode: string,
): ExtractedModel {
  const modelDef = model._modelDef;

  // Extract sources from exported explores
  const sources: ExtractedSource[] = model.exportedExplores.map((explore) => {
    const dimensions: ExtractedField[] = [];
    const measures: ExtractedField[] = [];
    const views: ExtractedView[] = [];

    // Iterate through all fields and categorize them
    for (const field of explore.allFields) {
      // Skip hidden fields
      if (isFieldHidden(field)) {
        continue;
      }

      if (field.isQueryField()) {
        // This is a view
        views.push({
          name: field.name,
        });
      } else if (field.isAtomicField() && field.isCalculation()) {
        // This is a measure
        measures.push({
          name: field.name,
          type: getFieldType(field),
        });
      } else if (field.isAtomicField()) {
        // This is a dimension
        dimensions.push({
          name: field.name,
          type: getFieldType(field),
        });
      }
      // Skip explore/join fields for now
    }

    const tablePath = getTablePath(modelDef, explore.name);

    return {
      name: explore.name,
      ...(tablePath !== undefined && { tablePath }),
      dimensions,
      measures,
      views,
    };
  });

  // Extract named queries
  const queries: ExtractedQuery[] = model.namedQueries.map((q) => ({
    name: q.name,
  }));

  return {
    name,
    sources,
    queries,
    rawCode,
  };
}

/**
 * Get the table path for a source from the model definition
 */
function getTablePath(
  modelDef: malloy.ModelDef,
  sourceName: string,
): string | undefined {
  const source = modelDef.contents[sourceName];
  if (source !== undefined && isSourceDef(source) && source.type === "table") {
    // Remove duckdb: prefix if present
    return source.tablePath.replace(/^duckdb:/, "");
  }
  return undefined;
}

/**
 * Get a human-readable type string for a field
 */
function getFieldType(field: malloy.Field): string {
  if (field.isAtomicField()) {
    return field.type;
  }
  if (field.isExplore()) {
    return "explore";
  }
  return "unknown";
}

/**
 * Check if a field should be hidden based on its tags
 * Simplified version of the schema-utils.ts isFieldHidden
 */
function isFieldHidden(field: malloy.Field): boolean {
  const { name, parentExplore } = field;

  try {
    const { tag } = parentExplore.tagParse();
    const hiddenStrings =
      tag
        .array("hidden")
        ?.map((_tag) => _tag.text())
        .filter((t): t is string => typeof t === "string") || [];

    const patternText = tag.text("hidden", "pattern");
    const pattern = patternText ? new RegExp(patternText) : undefined;

    return pattern?.test(name) || hiddenStrings.includes(name);
  } catch {
    return false;
  }
}

/**
 * Get list of data files in the models/data directory
 */
export async function getDataFiles(modelsDir: string): Promise<string[]> {
  const dataDir = path.join(modelsDir, "data");

  try {
    await fs.access(dataDir);
  } catch {
    return [];
  }

  const files = await fs.readdir(dataDir);
  const extensions = [
    ".csv",
    ".parquet",
    ".json",
    ".jsonl",
    ".ndjson",
    ".xlsx",
  ];
  return files.filter((f) => extensions.some((ext) => f.endsWith(ext)));
}

/**
 * Get list of notebook files in the models directory
 */
export async function getNotebooks(modelsDir: string): Promise<string[]> {
  try {
    await fs.access(modelsDir);
  } catch {
    return [];
  }

  const files = await fs.readdir(modelsDir);
  return files
    .filter((f) => f.endsWith(".malloynb"))
    .map((f) => path.basename(f, ".malloynb"));
}
