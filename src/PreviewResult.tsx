import { useLoaderData, useParams } from "react-router";
import RenderedResult from "./RenderedResult";
import type { PreviewSourceLoaderData } from "./routeType";
import { type JSX } from "react/jsx-runtime";

export default PreviewResult;

function PreviewResult(): JSX.Element {
  const result = useLoaderData<PreviewSourceLoaderData>();
  const { source } = useParams();
  return (
    <div className="result-page">
      <div className="result-header">
        <h1 className="result-title">{source}</h1>
        <p className="result-subtitle">Preview</p>
      </div>
      <div className="result-content">
        <RenderedResult result={result} height="100%" />
      </div>
    </div>
  );
}
