import * as malloy from "@malloydata/malloy";
import type * as MalloyInterface from "@malloydata/malloy-interfaces";
import type {
  Message,
  QueryResponse,
  SubmittedQuery,
} from "@malloydata/malloy-explorer";
import type { DataFileURLs } from "./connection";
import DuckDBConnection from "./connection";
import { parseNotebook, validateNotebook } from "./notebook-parser";

export {
  setupMalloyRuntime,
  parseMalloyExplorerQuery,
  executeMalloyQuery,
  executeMalloyPreparedQuery,
  getSourceInfo,
  getNotebookCode,
};

type RuntimeOptions = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
  dataFileURLs: DataFileURLs;
};

function setupMalloyRuntime({
  models,
  notebooks,
  dataFileURLs,
}: RuntimeOptions): {
  runtime: malloy.SingleConnectionRuntime<DuckDBConnection>;
  getModelURL: (_modelName: string) => URL;
} {
  const conn = new DuckDBConnection(
    dataFileURLs,
    { name: "main" },
    {
      // This is the default row limit of the connection (when no row limit is provided)
      rowLimit: 10,
    },
  );

  const getModelURL = (modelName: string): URL => {
    return new URL(`http://models/${modelName}.malloy`);
  };
  const urlToName = (url: URL): string => {
    return decodeURIComponent(url.pathname.replace("/", "")).replace(
      /\.malloy$/,
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
            const modelCode = getModelCode(models, name);
            if (null === modelCode) {
              const notebookCode = getNotebookCode(notebooks, name);
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
  parsedQuery?: MalloyInterface.Query | string,
): Promise<SubmittedQuery> {
  const queryResolutionStartMillis = Date.now();

  let response: QueryResponse = {};
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
    response = { messages };
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
    console.info(`Not a malloy explorer query: ${querySrcParam}`, logs);
    return undefined;
  }
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
    const result =
      undefined === rowLimit
        ? await runnable.run()
        : await runnable.run({ rowLimit });
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

function getModelCode(
  models: Record<string, string>,
  modelName: string,
): null | string {
  const modelContents = models[modelName];
  if (undefined === modelContents) {
    console.error(`Model not found: ${modelName}`);
    return null;
  }
  return modelContents;
}

function getNotebookCode(
  notebooks: Record<string, string>,
  notebookName: string,
): null | string {
  const notebookContents = notebooks[notebookName];
  if (undefined === notebookContents) {
    console.error(`Notebook not found: ${notebookName}`);
    return null;
  }
  return notebookContents;
}
