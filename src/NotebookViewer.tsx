import { type JSX } from "react/jsx-runtime";
import { useCallback } from "react";
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

function DownloadIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function NotebookViewer({
  notebook,
  name,
  showCode = false,
}: NotebookViewerProps): JSX.Element {
  const contentCount = notebook.cells.filter(
    (c) => c.type === "markdown",
  ).length;
  const resultCount = notebook.cells.filter((c) => c.type === "malloy").length;

  const handleDownload = useCallback(() => {
    if (!notebook.rawContent || !name) return;
    const blob = new Blob([notebook.rawContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.malloynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notebook.rawContent, name]);

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <div className="notebook-title-row">
          <h2>{name ?? "Notebook"}</h2>
          <span className="count-badge">{contentCount} content</span>
          <span className="count-badge">{resultCount} results</span>
          {notebook.rawContent && (
            <button
              className="action-button download-button"
              onClick={handleDownload}
              title="Download notebook"
            >
              <DownloadIcon />
              Download
            </button>
          )}
        </div>
        {notebook.sources.length > 0 && (
          <div className="notebook-sources">
            <span className="sources-label">Models:</span>
            {[...new Set(notebook.sources.map((s) => s.model))].map((model) => (
              <Link
                key={model}
                to={`/model/${encodeURIComponent(model)}`}
                className="source-link"
              >
                {model}
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
