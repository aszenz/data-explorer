import * as malloy from "@malloydata/malloy";
import { SubmittedQuery } from "@malloydata/malloy-explorer";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import { RuntimeSetup } from "./types";
import { NotebookOutput } from "./notebook-types";

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
  parsedQuery: undefined | MalloyInterface.Query;
  submittedQuery: undefined | SubmittedQuery;
};

type ModelHomeLoaderData = RuntimeSetup;

type PreviewSourceLoaderData = MalloyInterface.Result;

type PreparedQueryLoaderData = MalloyInterface.Result;

type NotebookLoaderData = NotebookOutput;
