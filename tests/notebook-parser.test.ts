import { describe, expect, test } from "vitest";
import { parseNotebook, extractNotebookSources } from "../src/notebook-parser";

describe.sequential("parsing notebooks", () => {
  test("single md cell", () => {
    const sampleNotebook = `>>>markdown
# Test Notebook

This is a test notebook with multiple cell types.
`;
    const parsed = parseNotebook(sampleNotebook);
    expect(parsed.cells).toStrictEqual([
      {
        type: "markdown",
        content: `# Test Notebook

This is a test notebook with multiple cell types.`,
      },
    ]);
    expect(parsed.metadata).toStrictEqual({
      title: "Test Notebook",
    });
    expect(typeof parsed.toModel).toBe("function");
  });

  test("single md + malloy cell", () => {
    const sampleNotebook = `>>>markdown
# Duckdb Notebook

This is a test notebook with multiple cell types.

>>>malloy
source: duckdb.sql('SELECT * FROM generate_series(1, 20)) extends {}

`;
    const parsed = parseNotebook(sampleNotebook);
    expect(parsed.cells).toStrictEqual([
      {
        type: "markdown",
        content: `# Duckdb Notebook

This is a test notebook with multiple cell types.`,
      },
      {
        type: "malloy",
        code: `source: duckdb.sql('SELECT * FROM generate_series(1, 20)) extends {}`,
      },
    ]);
    expect(parsed.metadata).toStrictEqual({
      title: "Duckdb Notebook",
    });
    expect(typeof parsed.toModel).toBe("function");
  });
});

describe.sequential("extracting notebook sources", () => {
  test("extracts named imports with standard formatting", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import {source1, source2} from './model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("extracts named imports with spaces", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { source1, source2 } from './model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("extracts named imports with double quotes", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: 'import { source1, source2 } from "./model.malloy"',
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("extracts default import", () => {
    const cells = [
      { type: "malloy" as const, code: "import model from './model.malloy'" },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([{ name: "model", model: "model" }]);
  });

  test("extracts mixed default and named imports", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import defaultModel, { source1, source2 } from './model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "defaultModel", model: "model" },
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("extracts multi-line imports", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: `import {
        source1,
        source2,
        source3
      } from './model.malloy'`,
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
      { name: "source3", model: "model" },
    ]);
  });

  test("extracts imports with no spaces", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import{source1,source2}from'./model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("handles multiple import statements in different cells", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { source1 } from './model1.malloy'",
      },
      {
        type: "malloy" as const,
        code: "import { source2 } from './model2.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model1" },
      { name: "source2", model: "model2" },
    ]);
  });

  test("handles multiple imports in single cell", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: `import { source1 } from './model1.malloy'
       import { source2 } from './model2.malloy'`,
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model1" },
      { name: "source2", model: "model2" },
    ]);
  });

  test("ignores non-malloy file imports", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { something } from './other.ts'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([]);
  });

  test("handles cells without imports", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "source: duckdb.sql('SELECT * FROM table') extends {}",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([]);
  });

  test("handles empty cells", () => {
    const cells = [{ type: "malloy" as const, code: "" }];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([]);
  });

  test("handles imports with extra whitespace and newlines", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: `import   {

        source1   ,

        source2

      }   from   './model.malloy'`,
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });

  test("handles single named import", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { singleSource } from './model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([{ name: "singleSource", model: "model" }]);
  });

  test("deduplicates sources with the same name", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { source1 } from './model1.malloy'",
      },
      {
        type: "malloy" as const,
        code: "import { source1 } from './model2.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([{ name: "source1", model: "model1" }]);
  });

  test("handles markdown cells mixed with malloy cells", () => {
    const cells = [
      { type: "markdown" as const, content: "# Title" },
      {
        type: "malloy" as const,
        code: "import { source1 } from './model.malloy'",
      },
      { type: "markdown" as const, content: "Some text" },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([{ name: "source1", model: "model" }]);
  });

  test("handles paths with subdirectories", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { source1 } from './models/subdir/model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "models/subdir/model" },
    ]);
  });

  test("handles trailing commas in imports", () => {
    const cells = [
      {
        type: "malloy" as const,
        code: "import { source1, source2, } from './model.malloy'",
      },
    ];
    const sources = extractNotebookSources(cells);
    expect(sources).toEqual([
      { name: "source1", model: "model" },
      { name: "source2", model: "model" },
    ]);
  });
});
