import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import MarkdownRenderer from "./MarkdownRenderer";
import MalloyCodeBlock from "./MalloyCodeBlock";
import type { CellOutput } from "./notebook-types";
import RenderedResult from "./RenderedResult";
import { type JSX } from "react/jsx-runtime";
import ExpandIcon from "../img/expand.svg?react";

export default NotebookCellRenderer;

export type { NotebookCellRendererProps };

type NotebookCellRendererProps = {
  cell: CellOutput;
  cellIndex: number;
  showCode?: boolean;
};

function NotebookCellRenderer({
  cell,
  cellIndex,
  showCode: _showCode = false,
}: NotebookCellRendererProps): JSX.Element | null {
  const [searchParams, setSearchParams] = useSearchParams();
  const popOverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cellExpanded = `cell-expanded`;
    const cellIndexStr = cellIndex.toString();
    const popoverElement = popOverRef.current;
    function toggleSearchParams({ newState }: ToggleEvent) {
      const newParams = new URLSearchParams(searchParams);
      if (newState === "open") {
        newParams.set(cellExpanded, cellIndexStr);
      } else {
        newParams.delete(cellExpanded);
      }
      setSearchParams(newParams);
    }
    popoverElement?.addEventListener("toggle", toggleSearchParams);
    if (cellIndexStr === searchParams.get(cellExpanded)) {
      popoverElement?.showPopover();
    }
    return () =>
      popoverElement?.removeEventListener("toggle", toggleSearchParams);
  }, [cellIndex, searchParams, setSearchParams]);
  if (cell.type === "markdown") {
    return (
      <div data-cell-index={cellIndex}>
        <MarkdownRenderer content={cell.content} />
      </div>
    );
  }

  if (null === cell.result) {
    return null;
  }
  return (
    <div className="notebook-cell" data-cell-index={cellIndex}>
      <div className="cell-content-wrapper">
        <div className="malloy-result-display">
          <RenderedResult result={cell.result} />
        </div>
        <button
          type="button"
          className="cell-expand-btn"
          popoverTarget={`cell-result-expand-${cellIndex.toString()}`}
          aria-label="Expand"
          title="Expand"
        >
          <ExpandIcon aria-label="Expand" />
        </button>
      </div>
      <div
        ref={popOverRef}
        popover="auto"
        data-testid={`notebook-cell-popover-${cellIndex.toString()}`}
        id={`cell-result-expand-${cellIndex.toString()}`}
        className="notebook-popover"
      >
        <button
          type="button"
          className="popover-close"
          popoverTarget={`cell-result-expand-${cellIndex.toString()}`}
          popoverTargetAction="hide"
          aria-label="Close"
        >
          &times;
        </button>
        <RenderedResult result={cell.result} height="100%" />
      </div>
      <details className="cell-code">
        <summary>Code</summary>
        <MalloyCodeBlock code={cell.code} />
      </details>
    </div>
  );
}
