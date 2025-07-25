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
  const queryNameParam = searchParams.get("name");
  const querySrcParam = searchParams.get("query");
  const runParam = searchParams.get("run");
  const { model, runtime, refreshModel } = useRuntime();
  const { _modelDef: modelDef } = model;
  const source = React.useMemo(
    () => getSourceInfo(modelDef, sourceName),
    [modelDef, sourceName],
  );
  const sourceDef = getSourceDef(modelDef, source.name);
  const { topValues } = useTopValues(runtime, modelDef, sourceDef);
  const [draftQuery, setDraftQuery] = useState<MalloyInterface.Query>();
  const [executionState, setExecutionState] =
    useState<QueryExecutionState>("finished");
  const [queryResolutionStartMillis, setQueryResolutionStartMillis] =
    useState<number>();
  const [nestViewPath, setNestViewPath] = useState<string[]>([]);
  const [response, setResponse] = useState<QueryResponse>();

  const executedQuery = React.useMemo(() => {
    if (queryNameParam) {
      const view = findView(source, queryNameParam);
      if (view) {
        return {
          definition: {
            kind: "arrow",
            source: {
              kind: "source_reference",
              name: source.name,
            },
            view: {
              kind: "view_reference",
              name: queryNameParam,
            },
          },
        } satisfies MalloyInterface.Query;
      }
    } else if (querySrcParam) {
      const { query, logs } = malloy.malloyToQuery(querySrcParam);
      if (query) {
        return query;
      }
      console.error(
        `Failed to parse query from source: ${querySrcParam}`,
        logs,
      );
    }
    return undefined;
  }, [queryNameParam, querySrcParam, source]);

  const submittedQuery = React.useMemo(
    () =>
      executedQuery === undefined || queryResolutionStartMillis === undefined
        ? undefined
        : ({
            query: executedQuery,
            executionState,
            queryResolutionStartMillis,
            response,
            onCancel: () => {},
          } satisfies SubmittedQuery),
    [executedQuery, queryResolutionStartMillis, executionState, response],
  );

  const updateQueryInUrl = React.useCallback(
    ({
      run,
      query: newQuery,
      queryName,
    }: {
      run: boolean;
      query: string | undefined;
      queryName: string | undefined;
    }) => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (newQuery === undefined && queryName === undefined) {
        newSearchParams.delete("query");
        newSearchParams.delete("name");
      } else if (queryName) {
        newSearchParams.set("name", queryName);
        newSearchParams.delete("query");
      } else if (newQuery) {
        newSearchParams.set("query", newQuery);
        newSearchParams.delete("name");
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
      const queryName = getQueryName(query);
      const queryString = queryToMalloyString(source, query);
      updateQueryInUrl({
        run: true,
        query: queryString,
        queryName,
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
      setDraftQuery(executedQuery);
      return;
    }

    setDraftQuery(executedQuery);
    setQueryResolutionStartMillis(Date.now());
    setExecutionState("running");

    const executeQuery = async () => {
      try {
        const qb = new QueryBuilder.ASTQuery({ source, query: executedQuery });
        const result = await executeMalloyQuery(runtime, qb.toMalloy(), model);
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
            isInitiallyExpanded={true}
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
            isInitiallyExpanded={true}
            initialWidth={360}
            minWidth={280}
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

function findView(
  source: MalloyInterface.SourceInfo,
  name: string,
): MalloyInterface.FieldInfo | undefined {
  return source.schema.fields.find(
    (entry) => entry.name === name && entry.kind === "view",
  );
}

function getQueryName(query: MalloyInterface.Query): string | undefined {
  if (
    query.definition.kind === "arrow" &&
    query.definition.view.kind === "view_reference"
  ) {
    return query.definition.view.name;
  }
  return undefined;
}

function queryToMalloyString(
  source: MalloyInterface.SourceInfo,
  query: MalloyInterface.Query,
): string | undefined {
  try {
    if (
      query.definition.kind === "arrow" &&
      query.definition.view.kind === "view_reference"
    ) {
      // For view references, return the view name to use as 'name' param
      return undefined;
    }

    // For other query types, convert to Malloy string
    const qb = new QueryBuilder.ASTQuery({ source, query });
    return qb.toMalloy();
  } catch (error) {
    console.warn("Failed to convert query to Malloy string:", error);
    return undefined;
  }
}
