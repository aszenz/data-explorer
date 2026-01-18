import { createHashRouter } from "react-router";
import type * as MalloyInterface from "@malloydata/malloy-interfaces";
import type { SubmittedQuery } from "@malloydata/malloy-explorer";
import type * as malloy from "@malloydata/malloy";
import ModelHome from "./ModelHome";
import ModelExplorer from "./ModelExplorer";
import PreviewResult from "./PreviewResult";
import QueryResult from "./QueryResult";
import DataNotebook from "./DataNotebook";
import ErrorBoundary from "./ErrorBoundary";
import SharedLayout from "./SharedLayout";
import Home from "./Home";
import Loader from "./Loader";
import {
  getNotebookCode,
  executeMalloyPreparedQuery,
  executeMalloyQuery,
  getSourceInfo,
  parseMalloyExplorerQuery,
  setupMalloyRuntime,
} from "./helpers";
import { parseNotebook, validateNotebook } from "./notebook-parser";
import { executeNotebook } from "./notebook-executor";
import type { RuntimeSetup } from "./types";

import type * as RouteTypes from "./routeType";
import type { GetDataset } from "./connection";
import type { DataSourceInfo } from "./types";

export default createAppRouter;

type SourceCache = {
  info: MalloyInterface.SourceInfo;
  topValues: malloy.SearchValueMapResult[];
  queryCache: Map<string, MalloyInterface.Query>;
  resultCache: Map<string, SubmittedQuery>;
};
type ModelCache = {
  model: malloy.Model;
  modelMaterializer: malloy.ModelMaterializer;
  sources: Map<string, SourceCache>;
};
type ModelsCache = Map<string, ModelCache>;

type RouterOptions = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
  dataSources: DataSourceInfo[];
  getDataset: GetDataset;
};
function createAppRouter({
  models,
  notebooks,
  dataSources,
  getDataset,
}: RouterOptions): ReturnType<typeof createHashRouter> {
  const { runtime, getModelURL } = setupMalloyRuntime({
    getDataset,
    models,
    notebooks,
  });
  const cachedModels: ModelsCache = new Map();

  async function loadAndCacheModel(modelName: string): Promise<ModelCache> {
    const model =
      cachedModels.get(modelName) ??
      (await (async () => {
        console.log(`Loading model ${modelName}`);
        const modelMaterializer = runtime.loadModel(getModelURL(modelName));
        const _model = await modelMaterializer.getModel();
        const cacheEntry = {
          model: _model,
          modelMaterializer,
          sources: new Map(),
        };
        cachedModels.set(modelName, cacheEntry);
        return cacheEntry;
      })());
    return model;
  }

  async function loadAndCacheSource(
    modelName: string,
    sourceName: string,
    includeTopValues: boolean,
  ): Promise<SourceCache> {
    const cachedModel = await loadAndCacheModel(modelName);
    const cacheKey = `${modelName}:${sourceName}:${includeTopValues ? "includeTopValues" : ""}`;

    const source =
      cachedModel.sources.get(cacheKey) ??
      (await (async () => {
        console.log(`Loading source ${sourceName}`);
        const sourceInfo = getSourceInfo(
          cachedModel.model._modelDef,
          sourceName,
        );
        console.time("Loading top values");
        const topValues = includeTopValues
          ? ((await cachedModel.modelMaterializer.searchValueMap(
              sourceName,
              10,
            )) ?? [])
          : [];
        console.timeEnd("Loading top values");
        const sourceCache = {
          info: sourceInfo,
          topValues,
          queryCache: new Map(),
          resultCache: new Map(),
        };
        cachedModel.sources.set(cacheKey, sourceCache);
        return sourceCache;
      })());
    return source;
  }

  function loadAndCacheMalloyQuery(
    source: SourceCache,
    querySrc: string,
  ): undefined | MalloyInterface.Query {
    return (
      source.queryCache.get(querySrc) ??
      (() => {
        console.log(`Parsing query ${querySrc}`);
        const parsedQuery = parseMalloyExplorerQuery(querySrc);
        if (undefined === parsedQuery) {
          return undefined;
        }
        source.queryCache.set(querySrc, parsedQuery);
        return parsedQuery;
      })()
    );
  }

  async function loadAndCacheMalloyQueryResult(
    source: SourceCache,
    modelMaterializer: malloy.ModelMaterializer,
    parsedQuery: undefined | MalloyInterface.Query,
    querySrc: string,
  ): Promise<SubmittedQuery> {
    return (
      source.resultCache.get(querySrc) ??
      (async () => {
        console.log(`Running query ${querySrc}`);
        const result = await executeMalloyQuery(
          modelMaterializer,
          querySrc,
          parsedQuery,
        );
        source.resultCache.set(querySrc, result);
        return result;
      })()
    );
  }

  /**
   * @todo: Remove it's usage
   */
  async function getRuntimeSetup(modelName: string): Promise<RuntimeSetup> {
    const loadedModel = await loadAndCacheModel(modelName);
    const modelCode = models[modelName] ?? "";

    return {
      runtime,
      modelMaterializer: loadedModel.modelMaterializer,
      model: loadedModel.model,
      modelCode,
      dataSources,
      refreshModel: () => {},
    };
  }

  return createHashRouter([
    {
      path: "/",
      element: <SharedLayout notebooks={notebooks} models={models} />,
      errorElement: <ErrorBoundary />,
      hydrateFallbackElement: <Loader />,
      children: [
        {
          index: true,
          element: <Home notebooks={notebooks} models={models} />,
        },
        {
          id: "model",
          path: "model/:model",
          loader: async ({
            params,
          }): Promise<RouteTypes.ModelHomeLoaderData> => {
            if (undefined === params["model"]) {
              throw new Error("Model name is required");
            }
            return getRuntimeSetup(params["model"]);
          },
          children: [
            {
              index: true,
              element: <ModelHome />,
            },
            {
              path: "preview/:source",
              loader: async ({
                params,
              }): Promise<RouteTypes.PreviewSourceLoaderData> => {
                const { model: modelName, source } = params;
                if (undefined === modelName) {
                  throw new Error("Model name is required");
                }
                if (undefined === source) {
                  throw new Error("Source name is required");
                }
                const { modelMaterializer } =
                  await loadAndCacheModel(modelName);
                const output = await executeMalloyQuery(
                  modelMaterializer,
                  `run: ${source} -> {select: *; limit: 50}`,
                );
                const queryResult = output.response?.result;
                if (undefined === queryResult) {
                  throw new Error("Error running query");
                }
                return queryResult;
              },
              element: <PreviewResult />,
            },
            {
              path: "explorer/:source",
              loader: async ({
                request,
                params,
              }): Promise<RouteTypes.SourceExplorerLoaderData> => {
                const { model: modelName, source: sourceName } = params;
                if (undefined === modelName) {
                  throw new Error("Model name is required");
                }
                if (undefined === sourceName) {
                  throw new Error("Source name is required");
                }
                const urlSearchParams = new URL(request.url).searchParams;
                const querySrcParam = urlSearchParams.get("query");
                const runQueryParam = urlSearchParams.get("run");
                const includeTopValues =
                  urlSearchParams.get("includeTopValues") === "true";

                const { modelMaterializer } =
                  await loadAndCacheModel(modelName);
                const source = await loadAndCacheSource(
                  modelName,
                  sourceName,
                  includeTopValues,
                );
                const parsedQuery =
                  null === querySrcParam
                    ? undefined
                    : loadAndCacheMalloyQuery(source, querySrcParam);
                const submittedQuery =
                  "true" === runQueryParam && null !== querySrcParam
                    ? await loadAndCacheMalloyQueryResult(
                        source,
                        modelMaterializer,
                        parsedQuery,
                        querySrcParam,
                      )
                    : undefined;
                console.info("SourceExplorer loader");
                return {
                  sourceInfo: source.info,
                  topValues: source.topValues,
                  parsedQuery,
                  submittedQuery,
                };
              },
              element: <ModelExplorer />,
            },
            {
              path: "query/:query",
              loader: async ({
                params,
              }): Promise<RouteTypes.PreparedQueryLoaderData> => {
                const { model: modelName, query: queryName } = params;
                if (undefined === modelName) {
                  throw new Error("Model name is required");
                }
                if (undefined === queryName) {
                  throw new Error("Query is required");
                }
                const { model } = await getRuntimeSetup(modelName);
                return executeMalloyPreparedQuery(runtime, model, queryName);
              },
              element: <QueryResult />,
            },
          ],
        },
        {
          path: "notebook/:notebook",
          element: <DataNotebook />,
          shouldRevalidate: (arg) => {
            // Prevent revalidation on search param changes
            if (arg.currentUrl.pathname === arg.nextUrl.pathname) {
              return false;
            }
            return arg.defaultShouldRevalidate;
          },
          loader: async ({
            params,
          }): Promise<RouteTypes.NotebookLoaderData> => {
            const { notebook } = params;
            if (undefined === notebook) {
              throw new Error("Notebook name is required");
            }
            const notebookCode = getNotebookCode(notebooks, notebook);
            if (null === notebookCode) {
              throw new Error(`Notebook ${notebook} not found`);
            }
            // Validate and parse the notebook content
            const validation = validateNotebook(notebookCode);
            if (!validation.valid) {
              throw new Error(validation.errors.join(","));
            }
            const parsed = parseNotebook(notebookCode);
            const output = await executeNotebook(
              getRuntimeSetup,
              notebook,
              parsed,
            );
            // if (undefined !== output.metadata.title) {
            //   document.title = output.metadata.title;
            // }
            return output;
          },
        },
      ],
    },
  ]);
}
