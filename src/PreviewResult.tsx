import { useLoaderData, useParams } from "react-router";
import RenderedResult from "./RenderedResult";
import type { PreviewSourceLoaderData } from "./routeType";
import { type JSX } from "react/jsx-runtime";

export default PreviewResult;

function PreviewResult(): JSX.Element {
  const { source: sourceName } = useParams();
  const result = useLoaderData<PreviewSourceLoaderData>();
  return (
    <div>
      <h1>Preview Result for {sourceName}</h1>
      <RenderedResult result={result} />
    </div>
  );
}
