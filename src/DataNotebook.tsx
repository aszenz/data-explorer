import NotebookViewer from "./NotebookViewer";
import { useSearchParams } from "react-router";
import { useLoaderData } from "react-router";
import { NotebookLoaderData } from "./routeType";

export default DataNotebook;

function DataNotebook() {
  const [urlSearchParams] = useSearchParams();
  const notebook = useLoaderData<NotebookLoaderData>();

  return (
    <NotebookViewer
      notebook={notebook}
      showCode={urlSearchParams.has("showCode")}
    />
  );
}
