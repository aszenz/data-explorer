import { useSearchParams, useLoaderData } from "react-router";
import NotebookViewer from "./NotebookViewer";
import type { NotebookLoaderData } from "./routeType";
import type { JSX } from "react/jsx-runtime";

export default DataNotebook;

function DataNotebook(): JSX.Element {
  const [urlSearchParams] = useSearchParams();
  const notebook = useLoaderData<NotebookLoaderData>();

  return (
    <NotebookViewer
      notebook={notebook}
      showCode={urlSearchParams.has("showCode")}
    />
  );
}
