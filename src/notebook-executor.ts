import type {
  CellOutput,
  NotebookOutput,
  ParsedNotebook,
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
  };
}

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}
