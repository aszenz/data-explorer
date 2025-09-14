import { useState } from "react";
import * as malloy from "@malloydata/malloy";
import * as QueryBuilder from "@malloydata/malloy-query-builder";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import { useTopValues } from "./hooks";
import { useSearchParams } from "react-router";
import { useRuntime } from "./contexts";
import * as React from "react";
import {
  MalloyExplorerProvider,
  Message,
  QueryExecutionState,
  QueryPanel,
  QueryResponse,
  ResizableCollapsiblePanel,
  ResultPanel,
  SourcePanel,
  SubmittedQuery,
} from "@malloydata/malloy-explorer";
import "@malloydata/malloy-explorer/styles.css";

export default SourceExplorer;

function SourceExplorer({ sourceName }: { sourceName: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const querySrcParam = searchParams.get("query");
  const runParam = searchParams.get("run");
  const expandedQueryPanelParam = searchParams.get("showQueryPanel");
  const expandedSourcePanelParam = searchParams.get("showSourcePanel");
  const { model, runtime, refreshModel } = useRuntime();
  const { _modelDef: modelDef } = model;
  const source = React.useMemo(
    () => getSourceInfo(modelDef, sourceName),
    [modelDef, sourceName],
  );
  const sourceDef = getSourceDef(modelDef, source.name);
  const { topValues } = useTopValues(runtime, modelDef, sourceDef);
  const [draftQuery, setDraftQuery] = useState<
    string | MalloyInterface.Query
  >();
  const [executionState, setExecutionState] =
    useState<QueryExecutionState>("finished");
  const [queryResolutionStartMillis, setQueryResolutionStartMillis] =
    useState<number>();
  const [nestViewPath, setNestViewPath] = useState<string[]>([]);
  const [response, setResponse] = useState<QueryResponse>();

  const executedQuery = React.useMemo(() => {
    if (querySrcParam) {
      const { query, logs } = malloy.malloyToQuery(querySrcParam);
      if (query) {
        // Apply Manual fix for top-level annotations
        fixMalloyQueryAnnotations(querySrcParam, query);
        return {
          queryObj: query,
          queryString: new QueryBuilder.ASTQuery({ source, query }).toMalloy(),
        };
      }
      console.error(
        `Failed to parse query from source: ${querySrcParam}`,
        logs,
      );
    }
    return undefined;
  }, [querySrcParam, source]);

  const submittedQuery = React.useMemo(
    () =>
      executedQuery === undefined || queryResolutionStartMillis === undefined
        ? undefined
        : ({
            query: executedQuery.queryObj,
            executionState,
            queryResolutionStartMillis,
            response,
            onCancel: () => {},
          } satisfies SubmittedQuery),
    [executedQuery, queryResolutionStartMillis, executionState, response],
  );

  const updateQueryInUrl = React.useCallback(
    ({ run, query: newQuery }: { run: boolean; query: string | undefined }) => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (newQuery === undefined) {
        newSearchParams.delete("query");
      } else if (newQuery) {
        newSearchParams.set("query", newQuery);
      }

      if (run) {
        newSearchParams.set("run", "true");
      } else {
        newSearchParams.delete("run");
      }

      // Only update if the search params actually changed
      if (newSearchParams.toString() !== searchParams.toString()) {
        setSearchParams(newSearchParams);
      }
    },
    [searchParams, setSearchParams],
  );

  const runQuery = React.useCallback(
    (
      _source: MalloyInterface.SourceInfo,
      query: MalloyInterface.Query,
    ): void => {
      // Update URL with the query being run
      const queryString = queryToMalloyString(query);
      updateQueryInUrl({
        run: true,
        query: queryString,
      });
    },
    [source, updateQueryInUrl],
  );

  // Execute query when URL indicates to run
  React.useEffect(() => {
    if (undefined === executedQuery) {
      return;
    }
    if (runParam !== "true") {
      setDraftQuery(executedQuery.queryObj);
      return;
    }

    setDraftQuery(executedQuery.queryObj);
    setQueryResolutionStartMillis(Date.now());
    setExecutionState("running");

    const executeQuery = async () => {
      try {
        const result = await executeMalloyQuery(
          runtime,
          executedQuery.queryString,
          model,
        );
        setResponse({ result });
      } catch (error) {
        console.info(error);
        const messages: Message[] = [
          {
            severity: "ERROR",
            title: "Error",
            content: error instanceof Error ? error.message : String(error),
          },
        ];
        setResponse({ messages });
      } finally {
        setExecutionState("finished");
      }
    };

    void executeQuery();
  }, [executedQuery, runParam, source, runtime, model]);
  return (
    <MalloyExplorerProvider
      source={source}
      query={draftQuery}
      onQueryChange={setDraftQuery}
      topValues={topValues}
      focusedNestViewPath={nestViewPath}
      onFocusedNestViewPathChange={setNestViewPath}
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
            isInitiallyExpanded={"true" === expandedSourcePanelParam}
            initialWidth={280}
            minWidth={180}
            icon="database"
            title={source.name}
          >
            <SourcePanel
              onRefresh={() => {
                if (executedQuery) refreshModel();
              }}
            />
          </ResizableCollapsiblePanel>
          <ResizableCollapsiblePanel
            isInitiallyExpanded={"true" === expandedQueryPanelParam}
            initialWidth={320}
            minWidth={320}
            icon="filterSliders"
            title="Query"
          >
            <QueryPanel runQuery={runQuery} />
          </ResizableCollapsiblePanel>
          <div style={{ height: "100%", flex: "1 1 auto" }}>
            <ResultPanel
              source={source}
              draftQuery={draftQuery}
              setDraftQuery={setDraftQuery}
              submittedQuery={submittedQuery}
            />
          </div>
        </div>
      </div>
    </MalloyExplorerProvider>
  );
}

export async function executeMalloyQuery(
  runtime: malloy.Runtime,
  query: string,
  model: malloy.Model,
): Promise<MalloyInterface.Result> {
  try {
    const queryModel = await malloy.Malloy.compile({
      urlReader: runtime.urlReader,
      connections: runtime.connections,
      model: model,
      parse: malloy.Malloy.parse({ source: query }),
    });
    const runnable = runtime
      ._loadModelFromModelDef(queryModel._modelDef)
      .loadQuery(query);
    const rowLimit = (await runnable.getPreparedResult()).resultExplore.limit;
    const result = await runnable.run({ rowLimit });
    return malloy.API.util.wrapResult(result);
  } catch (error) {
    return Promise.reject(error as Error);
  }
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

function findSource(
  model: MalloyInterface.ModelInfo,
  name: string,
): MalloyInterface.SourceInfo | undefined {
  return model.entries.find(
    (entry) => entry.name === name && entry.kind === "source",
  );
}

function queryToMalloyString(query: MalloyInterface.Query): string | undefined {
  try {
    return MalloyInterface.queryToMalloy(query);
  } catch (error) {
    console.warn("Failed to convert query to Malloy string:", error);
    return undefined;
  }
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
