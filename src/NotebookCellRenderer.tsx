import { useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import { CellOutput } from "./notebook-types";
import RenderedResult from "./RenderedResult";
import { useSearchParams } from "react-router";

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
  showCode = false,
}: NotebookCellRendererProps) {
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
    <div className="notebook-cell">
      <details
        name={`cell-index-${cellIndex.toString()}`}
        open
        data-cell-index={cellIndex}
      >
        <summary>
          Output
          <button
            type="button"
            popoverTarget={`cell-result-expand-${cellIndex.toString()}`}
          >
            Expand
          </button>
        </summary>
        <div className="malloy-result-display">
          <RenderedResult result={cell.result} />
        </div>
        <div
          ref={popOverRef}
          popover="auto"
          data-testid={`notebook-cell-popover-${cellIndex.toString()}`}
          id={`cell-result-expand-${cellIndex.toString()}`}
        >
          <RenderedResult result={cell.result} />
        </div>
      </details>
      {showCode && (
        <details name={`cell-index-${cellIndex.toString()}`}>
          <summary>
            <span>Code</span>
          </summary>
          <pre>
            <code>{cell.code}</code>
          </pre>
        </details>
      )}
    </div>
  );
}
