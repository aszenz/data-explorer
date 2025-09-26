import { setupRuntime } from "./hooks";
import {
  CellOutput,
  MalloyCell,
  NotebookOutput,
  ParsedNotebook,
} from "./notebook-types";
import { executeMalloyQuery } from "./SourceExplorer";

export { executeNotebook };

async function executeNotebook(
  notebook: ParsedNotebook,
): Promise<NotebookOutput> {
  const notebookModel = parseModel(
    notebook.cells.filter((cell) => cell.type === "malloy"),
  );
  console.log("Malloy Model to execute:", notebookModel);
  const { model, runtime } = await setupRuntime(notebookModel);
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
          const result = await executeMalloyQuery(runtime, runnableCode, model);
          return { type: "malloy", code: cell.code, result } as const;
        }
        default:
          assertUnreachable(cell);
      }
    }),
  );
  return {
    cells: cellOutputs,
    metadata: notebook.metadata,
  };
}

function parseModel(malloyCells: MalloyCell[]): string {
  return malloyCells.map((cell) => cell.code).join("\n");
}

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}
