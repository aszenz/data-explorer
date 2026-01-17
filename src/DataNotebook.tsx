import { useSearchParams, useLoaderData, useParams } from "react-router";
import NotebookViewer from "./NotebookViewer";
import type { NotebookLoaderData } from "./routeType";
import type { JSX } from "react/jsx-runtime";

export default DataNotebook;

function DataNotebook(): JSX.Element {
  const [urlSearchParams] = useSearchParams();
  const { notebook: notebookName } = useParams();
  const notebook = useLoaderData<NotebookLoaderData>();

  return (
    <NotebookViewer
      notebook={notebook}
      name={notebookName}
      showCode={urlSearchParams.has("showCode")}
    />
  );
}
