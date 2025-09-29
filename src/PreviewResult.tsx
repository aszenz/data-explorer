import RenderedResult from "./RenderedResult";
import { useLoaderData, useParams } from "react-router";
import { PreviewSourceLoaderData } from "./routeType";

export default PreviewResult;

function PreviewResult() {
  const { source: sourceName } = useParams();
  const result = useLoaderData<PreviewSourceLoaderData>();
  return (
    <div>
      <h1>Preview Result for {sourceName}</h1>
      <RenderedResult result={result} />
    </div>
  );
}
