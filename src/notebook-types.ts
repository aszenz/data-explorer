import { Result } from "@malloydata/malloy-interfaces";

export type {
  NotebookCell,
  ParsedNotebook,
  CellOutput,
  MalloyCell,
  MarkdownCell,
  NotebookOutput,
};

type MalloyCell = { type: "malloy"; code: string };
type MarkdownCell = { type: "markdown"; content: string };

type NotebookCell = MalloyCell | MarkdownCell;

type ParsedNotebook = {
  cells: NotebookCell[];
  metadata: {
    title?: string;
  };
  toModel: () => string;
};

type CellOutput = MarkdownCell | (MalloyCell & { result: Result | null });

type NotebookOutput = {
  cells: CellOutput[];
  metadata: {
    title?: string;
  };
};
