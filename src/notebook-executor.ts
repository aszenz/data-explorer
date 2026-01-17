import type {
  CellOutput,
  NotebookOutput,
  ParsedNotebook,
  SourceReference,
} from "./notebook-types";
import type { RuntimeSetup } from "./types";
import { executeMalloyQuery } from "./helpers";

export { executeNotebook };

async function executeNotebook(
  getRuntimeSetup: (_: string) => Promise<RuntimeSetup>,
  notebookName: string,
  notebook: ParsedNotebook,
): Promise<NotebookOutput> {
  const notebookModel = notebook.toModel();
  console.log("Malloy Model to execute:", notebookModel);
  const { modelMaterializer } = await getRuntimeSetup(notebookName);

  // Extract sources from import statements in cells
  const sources: SourceReference[] = notebook.cells
    .flatMap((cell) => {
      if (cell.type !== "malloy") return [];
      // Match: import {source1, source2} from './model.malloy'
      const match = cell.code.match(
        /import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)\.malloy['"]/,
      );
      if (!match?.[1] || !match[2]) return [];
      const names = match[1].split(",").map((s) => s.trim());
      const modelName = match[2];
      return names.map((name) => ({ name, model: modelName }));
    })
    .filter(
      (source, index, arr) =>
        arr.findIndex((s) => s.name === source.name) === index,
    );

  const cellOutputs: CellOutput[] = await Promise.all(
    notebook.cells.map(async (cell) => {
      switch (cell.type) {
        case "markdown": {
          return { type: "markdown", content: cell.content } as const;
        }
        case "malloy": {
          // filter out import lines
          const runnableCode = cell.code
            .split("\n")
            .filter((line) => !line.trim().startsWith("import "))
            .join("\n")
            .trim();
          if ("" === runnableCode) {
            return { type: "malloy", code: cell.code, result: null } as const;
          }
          const { response } = await executeMalloyQuery(
            modelMaterializer,
            runnableCode,
          );
          return {
            type: "malloy",
            code: cell.code,
            result: response?.result ?? null,
          } as const;
        }
        default:
          assertUnreachable(cell);
      }
    }),
  );
  return {
    cells: cellOutputs,
    metadata: notebook.metadata,
    sources,
  };
}

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}
