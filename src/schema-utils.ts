/*
 * THIS SOURCE CODE IS DERIVED FROM malloy vscode extension AND IS SUBJECT TO IT'S COPYRIGHT NOTICE AND LICENSE TERMS
 * REPO: https://github.com/malloydata/malloy-vscode-extension
 * FILE: https://github.com/malloydata/malloy-vscode-extension/blob/cde23d2459f4d7d4240d609b454cb9e8d47757e9/src/common/schema.ts
 */
import picomatch from "picomatch";
import type {
  AtomicFieldType,
  AtomicTypeDef,
  Explore,
  Field,
  Model,
  ModelDef,
  RepeatedRecordTypeDef,
  SourceDef,
  StructDef,
} from "@malloydata/malloy";
import { JoinRelationship, isSourceDef } from "@malloydata/malloy";
import type { DataSourceInfo } from "./types";

export type { ModelDef, Explore, Field };
export {
  fieldType,
  exploreSubtype,
  isFieldHidden,
  isFieldAggregate,
  getTypeLabel,
  quoteIfNecessary,
  getSourceDef,
  extractReferencedDataFiles,
};

type FieldType =
  | FieldSubType
  | "array"
  | keyof typeof AtomicFieldType
  | "query";

type FieldSubType = "base" | "many_to_one" | "one_to_many" | "one_to_one";

function isFieldAggregate(field: Field): boolean {
  return field.isAtomicField() && field.isCalculation();
}

function fieldType(field: Field): FieldType {
  if (field.isExplore()) {
    if (field.isArray) {
      return "array";
    }
    return exploreSubtype(field);
  }
  return field.isAtomicField()
    ? (field.type as unknown as keyof typeof AtomicFieldType)
    : "query";
}

function exploreSubtype(explore: Explore): FieldSubType {
  let subtype: FieldSubType;
  if (explore.hasParentExplore()) {
    const relationship = explore.joinRelationship;
    subtype =
      relationship === JoinRelationship.ManyToOne
        ? "many_to_one"
        : relationship === JoinRelationship.OneToMany
          ? "one_to_many"
          : "one_to_one";
  } else {
    subtype = "base";
  }
  return subtype;
}

/**
 * Cache of compiled field hiding patterns so that for a given schema
 * view render, the pattern only needs to be compiled once. Uses a WeakMap
 * because the Explore object is typically re-created for each render.
 */
const hiddenFields = new WeakMap<
  Explore,
  { strings: string[]; pattern?: RegExp }
>();

/**
 * Guard created because TypeScript wasn't simply treating
 * `typeof tag === 'string` as a sufficient guard in filter()
 *
 * @param tag string | undefined
 * @returns true if tag is a string
 */
function isStringTag(tag: string | undefined): tag is string {
  return typeof tag === "string";
}

/**
 * Determine whether to hide a field in the schema viewer based on tags
 * applied to the source.
 *
 * `hidden = ["field1", "field2"]` will hide individual fields
 * `hidden.pattern = "^_"` will hide fields that match the regular expression
 * /^_/. They can be combined.
 *
 * @param field A Field object
 * @returns true if field should not be displayed in schema viewer
 */
function isFieldHidden(field: Field): boolean {
  const { name, parentExplore } = field;
  let hidden = hiddenFields.get(parentExplore);
  if (!hidden) {
    const { tag } = parentExplore.tagParse();
    const strings =
      tag
        .array("hidden")
        ?.map((_tag) => _tag.text())
        .filter(isStringTag) || [];

    const patternText = tag.text("hidden", "pattern");
    const pattern = patternText ? new RegExp(patternText) : undefined;

    hidden = undefined === pattern ? { strings } : { strings, pattern };
    hiddenFields.set(field.parentExplore, hidden);
  }
  return hidden.pattern?.test(name) || hidden.strings.includes(name);
}

/**
 * Add `` around path elements that have special characters or are in
 * the list of reserved words
 * @param element A field path element
 * @returns A potentially quoted field path element
 */
function quoteIfNecessary(element: string): string {
  // Quote if contains non-word characters
  if (/\W/.test(element) || RESERVED.includes(element.toUpperCase())) {
    return `\`${element}\``;
  }
  return element;
}

/**
 * Retrieve a source from a model safely
 *
 * @param modelDef Model definition
 * @param sourceName Source name
 * @returns SourceDef for given name, or throws if not a source
 */

function getSourceDef(modelDef: ModelDef, sourceName: string): SourceDef {
  const result = modelDef.contents[sourceName];
  if (undefined === result) {
    throw new Error(`Source not found: ${sourceName}`);
  }
  if (isSourceDef(result)) {
    return result;
  }
  throw new Error(`Not a source: ${sourceName}`);
}

/**
 * Extract table/file references from the compiled Malloy model using the Malloy API.
 * This function analyzes the compiled model's source definitions to identify
 * which data files (tables) are actually referenced in the model.
 *
 * @param model - The compiled Malloy model
 * @param dataSources - Array of available data sources to filter
 * @returns Filtered array containing only the data sources referenced in the model
 */
function extractReferencedDataFiles(
  model: Model,
  dataSources: DataSourceInfo[],
): DataSourceInfo[] {
  const referencedPaths = new Set<string>();

  // Access the ModelDef to get all sources
  const modelDef = model._modelDef;

  // Iterate through all contents in the model
  for (const [_name, obj] of Object.entries(modelDef.contents)) {
    // Check if this is a source definition
    if (isSourceDef(obj)) {
      // If it's a table source, extract the table path
      if (obj.type === "table") {
        const tablePath = obj.tablePath;

        // Remove 'duckdb:' prefix if present
        const cleanPath = tablePath.replace(/^duckdb:/, "");

        referencedPaths.add(cleanPath);

        // Also add without 'data/' prefix if present, or with it
        if (cleanPath.startsWith("data/")) {
          referencedPaths.add(cleanPath.substring(5));
        } else {
          referencedPaths.add(`data/${cleanPath}`);
        }
      }
    }
  }

  // Filter dataSources to only include referenced files.
  const matchers = [...referencedPaths].map((refPath) => {
    if (!picomatch.scan(refPath).isGlob)
      return (path: string) => path === refPath;
    return picomatch(refPath);
  });

  return dataSources.filter((source) => {
    const fileName = `${source.name}.${source.fileType}`;
    const pathWithData = `data/${fileName}`;
    const relativePath = source.path.replace("/models/", "");
    return matchers.some(
      (m) => m(fileName) || m(pathWithData) || m(relativePath),
    );
  });
}

/*
 * It would be nice if these types made it out of Malloy, or if this
 * functionality moved into core Malloy
 */

type NativeUnsupportedTypeDef = {
  type: "sql native";
  rawType?: string;
};

type RecordElementTypeDef = {
  type: "record_element";
};

type TypeDef =
  | RepeatedRecordTypeDef
  | AtomicTypeDef
  | NativeUnsupportedTypeDef
  | RecordElementTypeDef;

const getTypeLabelFromStructDef = (structDef: StructDef): string => {
  const getTypeLabelFromTypeDef = (typeDef: TypeDef): string => {
    if (typeDef.type === "array") {
      return `${getTypeLabelFromTypeDef(typeDef.elementTypeDef)}[]`;
    }
    if (typeDef.type === "sql native" && typeDef.rawType) {
      return `${typeDef.type} (${typeDef.rawType})`;
    }
    return typeDef.type;
  };

  if (structDef.type === "array") {
    return `${getTypeLabelFromTypeDef(structDef.elementTypeDef)}[]`;
  }
  return structDef.type;
};

const getTypeLabel = (field: Field): string => {
  if (field.isExplore()) {
    if (field.isArray) {
      return getTypeLabelFromStructDef(field.structDef);
    }
    return "";
  }
  const type = fieldType(field);
  if (field.isAtomicField() && field.isUnsupported()) {
    return `${type} ${undefined !== field.rawType ? `(${field.rawType})` : ""}`;
  }
  return type;
};

const RESERVED: string[] = [
  "ALL",
  "AND",
  "AS",
  "ASC",
  "AVG",
  "BOOLEAN",
  "BY",
  "CASE",
  "CAST",
  "CONDITION",
  "COUNT",
  "DATE",
  "DAY",
  "DAYS",
  "DESC",
  "DISTINCT",
  "ELSE",
  "END",
  "EXCLUDE",
  "EXTEND",
  "FALSE",
  "FULL",
  "FOR",
  "FROM",
  "FROM_SQL",
  "HAS",
  "HOUR",
  "HOURS",
  "IMPORT",
  "INNER",
  "IS",
  "JSON",
  "LAST",
  "LEFT",
  "MAX",
  "MIN",
  "MINUTE",
  "MINUTES",
  "MONTH",
  "MONTHS",
  "NOT",
  "NOW",
  "NULL",
  "NUMBER",
  "ON",
  "OR",
  "PICK",
  "QUARTER",
  "QUARTERS",
  "RIGHT",
  "SECOND",
  "SECONDS",
  "STRING",
  "SOURCE_KW",
  "SUM",
  "SQL",
  "TABLE",
  "THEN",
  "THIS",
  "TIMESTAMP",
  "TO",
  "TRUE",
  "TURTLE",
  "WEEK",
  "WEEKS",
  "WHEN",
  "WITH",
  "YEAR",
  "YEARS",
  "UNGROUPED",
] as const;
