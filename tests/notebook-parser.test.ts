import { describe, expect, test } from "vitest";
import { parseNotebook } from "../src/notebook-parser";

describe.sequential("parsing notebooks", () => {
  test("single md cell", () => {
    const sampleNotebook = `>>>markdown
# Test Notebook

This is a test notebook with multiple cell types.
`;
    expect(parseNotebook(sampleNotebook)).toStrictEqual({
      cells: [
        {
          type: "markdown",
          content: `# Test Notebook

This is a test notebook with multiple cell types.`,
        },
      ],
      metadata: {
        title: "Test Notebook",
      },
    });
  });

  test("single md + malloy cell", () => {
    const sampleNotebook = `>>>markdown
# Duckdb Notebook

This is a test notebook with multiple cell types.

>>>malloy
source: duckdb.sql('SELECT * FROM generate_series(1, 20)) extends {}

`;
    expect(parseNotebook(sampleNotebook)).toStrictEqual({
      cells: [
        {
          type: "markdown",
          content: `# Duckdb Notebook

This is a test notebook with multiple cell types.`,
        },
        {
          type: "malloy",
          code: `source: duckdb.sql('SELECT * FROM generate_series(1, 20)) extends {}`,
        },
      ],
      metadata: {
        title: "Duckdb Notebook",
      },
    });
  });
});
