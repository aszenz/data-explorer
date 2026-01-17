import { type JSX } from "react/jsx-runtime";
import NotebookCellRenderer from "./NotebookCellRenderer";
import type { NotebookOutput } from "./notebook-types";

export default NotebookViewer;
export type { NotebookViewerProps };

type NotebookViewerProps = {
  notebook: NotebookOutput;
  showCode?: boolean;
};

function NotebookViewer({
  notebook,
  showCode = false,
}: NotebookViewerProps): JSX.Element {
  const cellCount = notebook.cells.length;

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <h2>Notebook</h2>
        <span className="count-badge">{cellCount} cells</span>
      </div>
      <main className="notebook">
        {notebook.cells.map((cell, index) => (
          <NotebookCellRenderer
            key={index}
            cell={cell}
            cellIndex={index}
            showCode={showCode}
          />
        ))}
        {notebook.cells.length === 0 && (
          <div className="empty-state">
            <p>This notebook is empty.</p>
            <p className="empty-state-hint">No cells to display</p>
          </div>
        )}
      </main>
    </div>
  );
}
