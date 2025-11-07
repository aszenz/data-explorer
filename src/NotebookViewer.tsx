import { JSX } from "react/jsx-runtime";
import NotebookCellRenderer from "./NotebookCellRenderer";
import type { NotebookOutput } from "./notebook-types";

export default NotebookViewer;
export type { NotebookViewerProps };

type NotebookViewerProps = {
  notebook: NotebookOutput;
  showCode: boolean;
};

function NotebookViewer({
  notebook,
  showCode = false,
}: NotebookViewerProps): JSX.Element {
  return (
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
        <div>
          <p>This page is empty.</p>
        </div>
      )}
    </main>
  );
}
