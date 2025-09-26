import MarkdownRenderer from "./MarkdownRenderer";
import { CellOutput } from "./notebook-types";
import RenderedResult from "./RenderedResult";

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
    <div data-cell-index={cellIndex}>
      {showCode && (
        <details>
          <summary>
            <span>Code</span>
          </summary>
          <pre>
            <code>{cell.code}</code>
          </pre>
        </details>
      )}
      <div className="malloy-result-display">
        <RenderedResult result={cell.result} />
      </div>
    </div>
  );

  return null;
}
