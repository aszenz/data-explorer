import { useCallback, useState } from "react";
import * as malloy from "@malloydata/malloy";
import type { SearchValueMapResult } from "@malloydata/malloy";
import * as QueryBuilder from "@malloydata/malloy-query-builder";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import "@malloydata/render/webcomponent";
import { useTopValues } from "./hooks";
import { useParams } from "react-router";
import { useRuntime } from "./contexts";
import { SourceInfo, Query } from "@malloydata/malloy-interfaces";
// TODO: Remove dependency on query-composer here
import { RunQuery, useRunQuery } from "@malloydata/query-composer";
import * as React from "react";
import {
  MalloyExplorerProvider,
  QueryPanel,
  ResizableCollapsiblePanel,
  ResultPanel,
  SourcePanel,
  SubmittedQuery,
} from "@malloydata/malloy-explorer";
import "@malloydata/malloy-explorer/styles.css";

export default ModelExplorerV2;

function ModelExplorerV2() {
  const {
    model: { _modelDef: modelDef },
    runtime,
    refreshModel,
  } = useRuntime();
  const urlParams = useParams();
  const sourceName = urlParams.source;
  if (undefined === sourceName) {
    throw new Error("Source name is required");
  }
  const modelPath = "./"; // todo: think about the need for this
  // URL Parameter values
  //   const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState<MalloyInterface.Query>();
  //   const history = useRef<Array<malloy.TurtleDef | undefined>>([undefined]);
  //   const historyIndex = useRef(0);

  //   const updateQueryInUrl = useCallback(
  //     ({
  //       run,
  //       query: newQuery,
  //       turtle,
  //     }: {
  //       run: boolean;
  //       query: string | undefined;
  //       turtle: malloy.TurtleDef | undefined;
  //     }) => {
  //       history.current = history.current.slice(0, historyIndex.current + 1);
  //       history.current.push(turtle);
  //       historyIndex.current++;

  //       if (searchParams.get("query") === newQuery) {
  //         return;
  //       }
  //       if (newQuery === undefined) {
  //         searchParams.delete("query");
  //       } else {
  //         searchParams.set("query", newQuery);
  //         searchParams.delete("name");
  //       }
  //       if (run) {
  //         searchParams.set("run", "true");
  //       } else {
  //         searchParams.delete("run");
  //       }
  //       console.log({ urlParams: searchParams });
  //       setSearchParams(searchParams);

  //       console.info("updateQueryInUrl", history.current, historyIndex.current);
  //     },
  //     [searchParams, setSearchParams],
  //   );
  const runQueryImpl: RunQuery = useCallback(
    (query, model, modelPath, queryName) =>
      executeMalloyQuery(runtime, query, model, modelPath, queryName),
    [runtime],
  );
  // TODO: Remove dependency on query-composer here, direcly use executeMalloyQuery
  const {
    error: runnerError,
    result,
    runQuery,
    isRunning,
  } = useRunQuery(modelDef, modelPath, runQueryImpl);
  const newResult =
    undefined === result ? undefined : malloy.API.util.wrapResult(result);

  //   useEffect(() => {
  //     async function loadQueryFromUrl() {
  //       try {
  //         // const queryNameParam = searchParams.get("name");
  //         const querySrcParam = searchParams.get("query");
  //         // const runParam = searchParams.get("run");
  //         if (null !== querySrcParam) {
  //           // const compiler = new StubCompile();
  //           //   const compiledQuery = await compiler.compileQuery(
  //           //     modelDef,
  //           //     querySrcParam,
  //           //   );
  //           //   queryModifiers.setQuery(compiledQuery, true);
  //           //   if ("true" === runParam) {
  //           //     runQuery(querySrcParam, queryNameParam ?? "unnamed");
  //           //   }
  //         } else {
  //           searchParams.delete("query");
  //           searchParams.delete("run");
  //           searchParams.delete("name");
  //           //   queryModifiers.clearQuery(true);
  //         }
  //       } catch (error) {
  //         console.error(error);
  //       } finally {
  //         // setLoading(loading => --loading);
  //       }
  //     }
  //     void loadQueryFromUrl();
  //     // TODO: only run on start/urlParams changed
  //   }, [modelDef /*queryModifiers, runQuery*/, , searchParams]);

  const source = getSourceInfo(modelDef, sourceName);
  const sourceDef = getSourceDef(modelDef, sourceName);

  const { topValues } = useTopValues(runtime, modelDef, sourceDef, modelPath);

  //   const refresh = useCallback(
  //     ({ shiftKey }: EventModifiers) => {
  //       refreshModel();
  //       if (shiftKey) {
  //         refreshTopValues();
  //       }
  //     },
  //     [refreshModel, refreshTopValues],
  //   );

  //   const undoContext = useMemo(
  //     () => {
  //       const updateQuery = () => {
  //         const turtle = history.current[historyIndex.current];
  //         if (undefined !== turtle) {
  //           // queryModifiers.setQuery(turtle, true);
  //         } else {
  //           // queryModifiers.clearQuery(true);
  //         }
  //       };

  //       const canRedo = () => historyIndex.current < history.current.length - 1;
  //       const canUndo = () => historyIndex.current > 0;

  //       const undo = () => {
  //         if (canUndo()) {
  //           historyIndex.current--;
  //           updateQuery();
  //         }
  //         console.info("undo", history.current, historyIndex.current);
  //       };

  //       const redo = () => {
  //         if (canRedo()) {
  //           historyIndex.current++;
  //           updateQuery();
  //         }
  //         console.info("redo", history.current, historyIndex.current);
  //       };

  //       return { canRedo, canUndo, redo, undo };
  //     },
  //     [
  //       /*queryModifiers*/
  //     ],
  //   );

  //   return (
  // <UndoContext.Provider value={undoContext}>
  //   <div className="editor">
  //     <ExploreQueryEditor
  //       model={modelDef}
  //       modelPath={modelPath}
  //       source={source}
  //       queryModifiers={queryModifiers}
  //       topValues={topValues}
  //       queryWriter={queryWriter}
  //       querySummary={querySummary}
  //       result={result ?? runnerError ?? builderError}
  //       runQuery={runQueryAction}
  //       refreshModel={refresh}
  //       isRunning={isRunning}
  //     />
  //   </div>
  // </UndoContext.Provider>
  //   );
  return (
    <ExplorerV2
      source={source}
      // eslint-disable-next-line @typescript-eslint/require-await
      runQuery={async (source: SourceInfo, query: Query) => {
        setQuery(query);
        const qb = new QueryBuilder.ASTQuery({ source, query });
        runQuery(qb.toMalloy());
      }}
      submittedQuery={
        query === undefined
          ? undefined
          : {
              query,
              executionState: isRunning ? "running" : "finished",
              queryResolutionStartMillis: 0,
              response:
                undefined === newResult
                  ? undefined
                  : {
                      result: newResult,
                      messages:
                        undefined === runnerError
                          ? undefined
                          : [
                              {
                                severity: "ERROR",
                                title: "Error",
                                description: "Error running query",
                                content: runnerError.message,
                              },
                            ],
                    },
              onCancel: () => {},
            }
      }
      topValues={topValues}
      refreshModel={(): void => {
        refreshModel();
      }}
    />
  );
}

async function executeMalloyQuery(
  runtime: malloy.Runtime,
  query: string,
  model: malloy.ModelDef,
  modelPath: string,
  queryName?: string,
): Promise<malloy.Result> {
  const baseModel = await runtime._loadModelFromModelDef(model).getModel();
  const queryModel = await malloy.Malloy.compile({
    urlReader: runtime.urlReader,
    connections: runtime.connections,
    model: baseModel,
    parse: malloy.Malloy.parse({ source: query }),
  });
  console.log("Running query", { modelPath, queryName });
  const runnable = runtime
    ._loadModelFromModelDef(queryModel._modelDef)
    .loadQuery(query);
  const rowLimit = (await runnable.getPreparedResult()).resultExplore.limit;
  return runnable.run({ rowLimit });
}

function getSourceDef(
  modelDef: malloy.ModelDef,
  name: string,
): malloy.SourceDef {
  const result = modelDef.contents[name];
  if (malloy.isSourceDef(result)) {
    return result;
  }
  throw new Error(`Not a source: ${name}`);
}

function getSourceInfo(
  modelDef: malloy.ModelDef,
  name: string,
): MalloyInterface.SourceInfo {
  const modelInfo = malloy.modelDefToModelInfo(modelDef);
  const source = findSource(modelInfo, name);
  if (!source) {
    throw new Error(`Source not found: ${name}`);
  }
  return source;
}

// ----
/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

interface ExplorerProps {
  source: MalloyInterface.SourceInfo | undefined;
  runQuery: (
    source: MalloyInterface.SourceInfo,
    query: MalloyInterface.Query,
  ) => Promise<void>;
  submittedQuery: SubmittedQuery | undefined;
  topValues: SearchValueMapResult[] | undefined;
  viewName?: string;
  refreshModel: (
    source: MalloyInterface.SourceInfo,
    query: MalloyInterface.Query,
  ) => void;
}

const ExplorerV2: React.FC<ExplorerProps> = ({
  source,
  runQuery,
  submittedQuery,
  topValues,
  viewName,
  refreshModel,
}) => {
  const [query, setQuery] = useState<MalloyInterface.Query>();

  React.useEffect(() => {
    if (source && viewName) {
      const view = findView(source, viewName);
      if (view) {
        const query: MalloyInterface.Query = {
          definition: {
            kind: "arrow",
            source: {
              kind: "source_reference",
              name: source.name,
            },
            view: {
              kind: "view_reference",
              name: viewName,
            },
          },
        };
        setQuery(query);
      }
    }
  }, [source, viewName]);

  if (!source) {
    return <div>Invalid source name</div>;
  }

  return (
    <MalloyExplorerProvider
      source={source}
      setQuery={setQuery}
      query={query}
      topValues={topValues}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <ResizableCollapsiblePanel
            isInitiallyExpanded={true}
            initialWidth={280}
            minWidth={180}
            icon="database"
            title={source.name}
          >
            <SourcePanel
              onRefresh={() => {
                if (query) refreshModel(source, query);
              }}
            />
          </ResizableCollapsiblePanel>
          <ResizableCollapsiblePanel
            isInitiallyExpanded={true}
            initialWidth={360}
            minWidth={280}
            icon="filterSliders"
            title="Query"
          >
            {/*eslint-disable-next-line @typescript-eslint/no-misused-promises*/}
            <QueryPanel runQuery={runQuery} />
          </ResizableCollapsiblePanel>
          <div style={{ height: "100%", flex: "1 1 auto" }}>
            <ResultPanel
              source={source}
              draftQuery={query}
              setDraftQuery={setQuery}
              submittedQuery={submittedQuery}
            />
          </div>
        </div>
      </div>
    </MalloyExplorerProvider>
  );
};

function findSource(
  model: MalloyInterface.ModelInfo,
  name: string,
): MalloyInterface.SourceInfo | undefined {
  return model.entries.find(
    (entry) => entry.name === name && entry.kind === "source",
  );
}

function findView(
  source: MalloyInterface.SourceInfo,
  name: string,
): MalloyInterface.FieldInfo | undefined {
  return source.schema.fields.find(
    (entry) => entry.name === name && entry.kind === "view",
  );
}
