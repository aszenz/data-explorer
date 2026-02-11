import { useState } from "react";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import { malloyToQuery } from "@malloydata/malloy";
import type * as Monaco from "monaco-editor-core";
import type { Navigation } from "react-router";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import * as React from "react";
import type { SubmittedQuery } from "@malloydata/malloy-explorer";
import {
  CodeEditorContext,
  MalloyExplorerProvider,
  QueryPanel,
  ResizableCollapsiblePanel,
  ResultPanel,
  SourcePanel,
} from "@malloydata/malloy-explorer";
import "@malloydata/malloy-explorer/styles.css";
import type { SourceExplorerLoaderData } from "./routeType";
import { type JSX } from "react/jsx-runtime";
import { getMonaco } from "./monaco-setup";

export default SourceExplorer;

function SourceExplorer(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const expandedQueryPanelParam = searchParams.get("showQueryPanel");
  const expandedSourcePanelParam = searchParams.get("showSourcePanel");
  const routeData = useLoaderData<SourceExplorerLoaderData>();
  const [draftQuery, setDraftQuery] = useState<
    string | MalloyInterface.Query | undefined
  >();
  const [nestViewPath, setNestViewPath] = useState<string[]>([]);
  const [monaco, setMonaco] = useState<typeof Monaco | undefined>();

  React.useEffect(() => {
    if (undefined === monaco) {
      void getMonaco().then(setMonaco);
    }
  }, [monaco]);

  const runQuery = React.useCallback(
    (
      _source: MalloyInterface.SourceInfo,
      query: MalloyInterface.Query,
    ): void => {
      const newSearchParams = serializeQueryToUrl(searchParams, query);
      if (null !== newSearchParams) {
        setSearchParams(newSearchParams);
      }
    },
    [searchParams, setSearchParams],
  );

  const runQueryString = React.useCallback(
    (_source: MalloyInterface.SourceInfo, query: string): void => {
      const newSearchParams = serializeStringQueryToUrl(searchParams, query);
      if (null !== newSearchParams) {
        setSearchParams(newSearchParams);
      }
    },
    [searchParams, setSearchParams],
  );

  const { state } = useNavigation();
  const submittedQueryWithState = React.useMemo(
    () => updateExecutionState(routeData.submittedQuery, state),
    [state, routeData.submittedQuery],
  );

  React.useEffect(() => {
    setDraftQuery(routeData.parsedQuery);
  }, [routeData.parsedQuery]);

  const codeEditorContextValue = React.useMemo(
    () => ({
      ...(monaco ? { monaco } : {}),
      modelDef: routeData.modelDef,
      modelUri: routeData.modelUri,
      malloyToQuery: (src: string) => malloyToQuery(src),
    }),
    [monaco, routeData.modelDef, routeData.modelUri],
  );

  return (
    <CodeEditorContext.Provider value={codeEditorContextValue}>
      {/* @ts-expect-error Exact Optional Type is wrong from lib */}
      <MalloyExplorerProvider
        source={routeData.sourceInfo}
        query={draftQuery}
        onQueryChange={setDraftQuery}
        topValues={routeData.topValues}
        focusedNestViewPath={nestViewPath}
        onFocusedNestViewPathChange={setNestViewPath}
      >
        <div
          className="source-explorer-container"
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
              title={routeData.sourceInfo.name}
            >
              <SourcePanel
                onRefresh={() => {
                  // if (executedQuery) refreshModel();
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
              <QueryPanel runQuery={runQuery} runQueryString={runQueryString} />
            </ResizableCollapsiblePanel>
            <div style={{ height: "100%", flex: "1 1 auto" }}>
              {/* @ts-expect-error Exact optional type is wrong from lib */}
              <ResultPanel
                source={routeData.sourceInfo}
                draftQuery={draftQuery}
                setDraftQuery={setDraftQuery}
                submittedQuery={submittedQueryWithState}
              />
            </div>
          </div>
        </div>
      </MalloyExplorerProvider>
    </CodeEditorContext.Provider>
  );
}

function serializeQueryToUrl(
  searchParams: URLSearchParams,
  query: MalloyInterface.Query,
): URLSearchParams | null {
  const queryString = queryToMalloyString(query);
  const newSearchParams = new URLSearchParams(searchParams);

  if (undefined === queryString) {
    newSearchParams.delete("query");
  } else if (queryString.length > 0) {
    newSearchParams.set("query", queryString);
  }

  newSearchParams.set("run", "true");
  newSearchParams.delete("load");
  newSearchParams.delete("mode");

  if (newSearchParams.toString() !== searchParams.toString()) {
    return newSearchParams;
  }
  return null;
}

function serializeStringQueryToUrl(
  searchParams: URLSearchParams,
  query: string,
): URLSearchParams | null {
  const newSearchParams = new URLSearchParams(searchParams);

  if (query.length > 0) {
    newSearchParams.set("query", query);
  } else {
    newSearchParams.delete("query");
  }

  newSearchParams.set("run", "true");
  newSearchParams.set("mode", "code");
  newSearchParams.delete("load");

  if (newSearchParams.toString() !== searchParams.toString()) {
    return newSearchParams;
  }
  return null;
}

function queryToMalloyString(query: MalloyInterface.Query): string | undefined {
  try {
    return MalloyInterface.queryToMalloy(query);
  } catch (error) {
    console.warn("Failed to convert query to Malloy string:", error);
    return undefined;
  }
}

function updateExecutionState(
  submittedQuery: undefined | SubmittedQuery,
  navigationState: Navigation["state"],
): undefined | SubmittedQuery {
  if (undefined === submittedQuery || navigationState !== "loading") {
    return submittedQuery;
  }
  return {
    ...submittedQuery,
    executionState: "running",
  };
}
