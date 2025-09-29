import { useState } from "react";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import {
  Navigation,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";
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
import { SourceExplorerLoaderData } from "./routeType";

export default SourceExplorer;

function SourceExplorer({}: { sourceName: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const expandedQueryPanelParam = searchParams.get("showQueryPanel");
  const expandedSourcePanelParam = searchParams.get("showSourcePanel");
  const routeData = useLoaderData<SourceExplorerLoaderData>();
  const [draftQuery, setDraftQuery] = useState<
    string | MalloyInterface.Query | undefined
  >();
  const [nestViewPath, setNestViewPath] = useState<string[]>([]);

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
  const { state } = useNavigation();
  const submittedQueryWithState = React.useMemo(
    () => updateExecutionState(routeData.submittedQuery, state),
    [state, routeData.submittedQuery],
  );

  React.useEffect(() => {
    setDraftQuery(routeData.parsedQuery);
  }, [routeData.parsedQuery]);

  return (
    <MalloyExplorerProvider
      source={routeData.sourceInfo}
      query={draftQuery}
      onQueryChange={setDraftQuery}
      topValues={routeData.topValues}
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
            <QueryPanel runQuery={runQuery} />
          </ResizableCollapsiblePanel>
          <div style={{ height: "100%", flex: "1 1 auto" }}>
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
  );
}

function serializeQueryToUrl(
  searchParams: URLSearchParams,
  query: MalloyInterface.Query,
): URLSearchParams | null {
  // Update URL with the query being run
  const queryString = queryToMalloyString(query);
  const newSearchParams = new URLSearchParams(searchParams);

  if (undefined === queryString) {
    newSearchParams.delete("query");
  } else if (queryString.length > 0) {
    newSearchParams.set("query", queryString);
  }

  newSearchParams.set("run", "true");

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
