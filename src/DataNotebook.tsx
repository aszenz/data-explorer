import NotebookViewer from "./NotebookViewer";
import { useParams, useSearchParams } from "react-router";
import { getNotebookCode } from "./models";

export default DataNotebook;

function DataNotebook() {
  const { notebook } = useParams();
  const [urlSearchParams] = useSearchParams();
  if (undefined === notebook) {
    throw new Error("Notebook name is required");
  }
  const notebookCode = getNotebookCode(notebook);

  if (null === notebookCode) {
    return <div>Notebook {notebook} not found.</div>;
  }

  return (
    <NotebookViewer
      content={notebookCode}
      filename={notebook}
      showCode={urlSearchParams.has("showCode")}
    />
  );
}
