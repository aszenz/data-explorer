import * as malloy from "@malloydata/malloy";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import { DuckDBConnection } from "./connection";
import { getModelCode, getNotebookCode } from "./models";
import {
  Message,
  QueryResponse,
  SubmittedQuery,
} from "@malloydata/malloy-explorer";
import { parseNotebook, validateNotebook } from "./notebook-parser";

export {
  setupMalloyRuntime,
  parseMalloyExplorerQuery,
  executeMalloyQuery,
  executeMalloyPreparedQuery,
  getSourceInfo,
};

function setupMalloyRuntime() {
  const conn = new DuckDBConnection("main", undefined, undefined, {
    // This is the default row limit of the connection (when no row limit is provided)
    rowLimit: 10,
  });

  const getModelURL = (modelName: string): URL => {
    return new URL(`http://models/${modelName}.malloy`);
  };
  const urlToName = (url: URL): string => {
    return decodeURIComponent(url.pathname.replace("/", "")).replace(
      ".malloy",
      "",
    );
  };
  const runtime = new malloy.SingleConnectionRuntime({
    connection: conn,
    urlReader: {
      readURL: async (url: URL) => {
        console.log(`Loading model from URL: ${url.toString()}`);
        const name = urlToName(url);
        switch (url.origin) {
          case "http://models": {
            const modelCode = getModelCode(name);
            if (null === modelCode) {
              const notebookCode = getNotebookCode(name);
              if (null === notebookCode) {
                return Promise.reject(
                  new Error(`Failed to load model: ${name}`),
                );
              }
              if (!validateNotebook(notebookCode).valid) {
                return Promise.reject(
                  new Error(`Invalid notebook format for: ${name}`),
                );
              }
              const notebookModel = parseNotebook(notebookCode).toModel();
              return Promise.resolve({ contents: notebookModel });
            }
            return Promise.resolve({ contents: modelCode });
          }
          default: {
            return Promise.reject(
              new Error(`Unsupported model URL origin: ${url.origin}`),
            );
          }
        }
      },
    },
  });

  return { runtime, getModelURL };
}

async function executeMalloyQuery(
  modelMaterializer: malloy.ModelMaterializer,
  query: string,
  parsedQuery?: MalloyInterface.Query,
): Promise<SubmittedQuery> {
  const queryResolutionStartMillis = Date.now();

  let response: QueryResponse = {
    result: undefined,
  };
  try {
    const result = await compileAndRun(modelMaterializer, query);
    response.result = result;
  } catch (error) {
    console.info(error);
    const messages: Message[] = [
      {
        severity: "ERROR",
        title: "Error",
        content: error instanceof Error ? error.message : String(error),
      },
    ];
    response = { result: undefined, messages };
  }

  const submittedQuery = {
    query: parsedQuery ?? parseMalloyExplorerQuery(query) ?? query,
    executionState: "finished",
    queryResolutionStartMillis,
    response,
    onCancel: () => {},
  } satisfies SubmittedQuery;

  return submittedQuery;
}

async function executeMalloyPreparedQuery(
  runtime: malloy.Runtime,
  model: malloy.Model,
  queryName: string,
): Promise<MalloyInterface.Result> {
  const queryObject = model.getPreparedQueryByName(queryName);
  const result = await malloy.Malloy.run({
    connections: runtime.connections,
    preparedResult: queryObject.preparedResult,
  });
  return malloy.API.util.wrapResult(result);
}

function parseMalloyExplorerQuery(
  querySrcParam: string,
): MalloyInterface.Query | undefined {
  const { query, logs } = malloy.malloyToQuery(querySrcParam);
  if (undefined === query) {
    console.error(`Failed to parse query from source: ${querySrcParam}`, logs);
    return undefined;
  }
  // Apply Manual fix for top-level annotations
  fixMalloyQueryAnnotations(querySrcParam, query);
  return query;
}

function getSourceInfo(
  modelDef: malloy.ModelDef,
  name: string,
): MalloyInterface.SourceInfo {
  const modelInfo = malloy.modelDefToModelInfo(modelDef);
  const source = findSource(modelInfo, name);
  if (undefined === source) {
    throw new Error(`Source not found: ${name}`);
  }
  return source;
}

async function compileAndRun(
  modelMaterializer: malloy.ModelMaterializer,
  query: string,
): Promise<MalloyInterface.Result> {
  try {
    const runnable = modelMaterializer.loadQuery(query);
    const rowLimit = (await runnable.getPreparedResult()).resultExplore.limit;
    const result = await runnable.run({ rowLimit });
    return malloy.API.util.wrapResult(result);
  } catch (error) {
    return Promise.reject(error as Error);
  }
}

function findSource(
  model: MalloyInterface.ModelInfo,
  name: string,
): MalloyInterface.SourceInfo | undefined {
  return model.entries.find(
    (entry) => entry.name === name && entry.kind === "source",
  );
}

/**
 * Temp function to fix a bug upstream in malloyToQuery
 */
function fixMalloyQueryAnnotations(
  queryString: string,
  malloyQuery: MalloyInterface.Query,
) {
  if (
    undefined === malloyQuery.annotations ||
    0 === malloyQuery.annotations.length
  ) {
    // Match annotations at the beginning of the string (before any run statement)
    const beforeRunMatch = queryString.match(/^((?:#[^\r\n]*[\r\n]*)*)/m);

    if (null !== beforeRunMatch && beforeRunMatch[1]) {
      const annotationLines = beforeRunMatch[1]
        .split(/[\r\n]+/)
        .filter((line) => line.trim().startsWith("#"))
        .map((line) => line.trim())
        .filter((line) => line.length > 1); // Ensure it's not just "#"

      if (annotationLines.length > 0) {
        malloyQuery.annotations = annotationLines.map((line) => ({
          value: line,
        }));
      }
    }
  }
  return malloyQuery;
}
