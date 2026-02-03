import { type JSX } from "react/jsx-runtime";
import { Link } from "react-router";
import NotebookCellRenderer from "./NotebookCellRenderer";
import type { NotebookOutput } from "./notebook-types";
import DownloadIcon from "../img/download.svg?react";
import { getNotebookDownloadUrl } from "./download-utils";

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
          {notebook.rawContent && name && (
            <a
              href={getNotebookDownloadUrl(name)}
              download={`${name}.malloynb`}
              className="action-button download-button"
              title="Download notebook"
            >
              <DownloadIcon aria-label="Download" />
              Download
            </a>
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
