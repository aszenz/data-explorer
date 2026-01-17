import { type JSX } from "react/jsx-runtime";
import { Link } from "react-router";
import NotebookCellRenderer from "./NotebookCellRenderer";
import type { NotebookOutput } from "./notebook-types";

export default NotebookViewer;
export type { NotebookViewerProps };

type NotebookViewerProps = {
  notebook: NotebookOutput;
  name?: string | undefined;
  showCode?: boolean;
};

function NotebookViewer({
  notebook,
  name,
  showCode = false,
}: NotebookViewerProps): JSX.Element {
  const contentCount = notebook.cells.filter(
    (c) => c.type === "markdown",
  ).length;
  const resultCount = notebook.cells.filter((c) => c.type === "malloy").length;

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <div className="notebook-title-row">
          <h2>{name ?? "Notebook"}</h2>
          <span className="count-badge">{contentCount} content</span>
          <span className="count-badge">{resultCount} results</span>
        </div>
        {notebook.sources.length > 0 && (
          <div className="notebook-sources">
            <span className="sources-label">Sources:</span>
            {notebook.sources.map((source) => (
              <Link
                key={source.name}
                to={`/model/${source.model}/explorer/${source.name}?load=true`}
                className="source-link"
              >
                {source.name}
              </Link>
            ))}
          </div>
        )}
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
