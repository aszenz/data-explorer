import { useState, useEffect } from "react";
import NotebookCellRenderer from "./NotebookCellRenderer";
import { parseNotebook, validateNotebook } from "./notebook-parser";
import { NotebookOutput } from "./notebook-types";
import { executeNotebook } from "./notebook-executor";

export default NotebookViewer;
export type { NotebookViewerProps };

type NotebookViewerProps = {
  content: string;
  filename: string;
  showCode: boolean;
};

function NotebookViewer({
  content,
  filename,
  showCode = false,
}: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookOutput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    async function execute() {
      // Validate and parse the notebook content
      const validation = validateNotebook(content);

      if (!validation.valid) {
        setErrors(validation.errors);
        setNotebook(null);
        return;
      }

      try {
        const parsed = parseNotebook(content);
        const output = await executeNotebook(parsed);

        setNotebook(output);
        if (undefined !== output.metadata.title) {
          document.title = output.metadata.title;
        }
        setErrors([]);
      } catch (error) {
        setErrors([
          `Failed to parse notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        ]);
        setNotebook(null);
      }
    }
    void execute();
  }, [content]);

  if (errors.length > 0) {
    return (
      <div>
        <h2>Error loading page {filename && `"${filename}"`}</h2>
        <ul>
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div>
        <p>Loading page...</p>
      </div>
    );
  }

  return (
    <div>
      <main>
        {notebook.cells.map((cell, index) => (
          <NotebookCellRenderer
            key={index}
            cell={cell}
            cellIndex={index}
            showCode={showCode}
          />
        ))}
      </main>

      {notebook.cells.length === 0 && (
        <div>
          <p>This page is empty.</p>
        </div>
      )}
    </div>
  );
}
