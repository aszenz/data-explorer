import type * as malloy from "@malloydata/malloy";
import type { SubmittedQuery } from "@malloydata/malloy-explorer";
import type * as MalloyInterface from "@malloydata/malloy-interfaces";
import type { RuntimeSetup } from "./types";
import type { NotebookOutput } from "./notebook-types";

export type {
  SourceExplorerLoaderData,
  ModelHomeLoaderData,
  PreviewSourceLoaderData,
  PreparedQueryLoaderData,
  NotebookLoaderData,
};

type SourceExplorerLoaderData = {
  sourceInfo: MalloyInterface.SourceInfo;
  topValues: malloy.SearchValueMapResult[];
  parsedQuery: undefined | MalloyInterface.Query | string;
  submittedQuery: undefined | SubmittedQuery;
  modelDef: malloy.ModelDef;
  modelUri: URL;
};

type ModelHomeLoaderData = RuntimeSetup;

type PreviewSourceLoaderData = MalloyInterface.Result;

type PreparedQueryLoaderData = MalloyInterface.Result;

type NotebookLoaderData = NotebookOutput;
