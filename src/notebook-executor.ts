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
  const malloyModel = parseModel(
    notebook.cells.filter((cell) => cell.type === "malloy"),
  );
  console.log("Malloy Model to execute:", malloyModel);
  const { model, runtime } = await setupRuntime(malloyModel);
  const cellOutputs: CellOutput[] = await Promise.all(
    notebook.cells.map(async (cell) => {
      switch (cell.type) {
        case "markdown": {
          return { type: "markdown", content: cell.content } as const;
        }
        case "malloy": {
          if (!cell.code.startsWith("run:")) {
            return { type: "malloy", code: cell.code, result: null } as const;
          }
          const result = await executeMalloyQuery(runtime, cell.code, model);
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
