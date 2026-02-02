import { useLoaderData, useParams } from "react-router";
import RenderedResult from "./RenderedResult";
import type { PreparedQueryLoaderData } from "./routeType";
import { type JSX } from "react/jsx-runtime";

export default QueryResult;

function QueryResult(): JSX.Element {
  const result = useLoaderData<PreparedQueryLoaderData>();
  const { query } = useParams();
  return (
    <div className="result-page">
      <div className="result-header">
        <h1 className="result-title">{query}</h1>
        <p className="result-subtitle">Named Query</p>
      </div>
      <div className="result-content">
        <RenderedResult result={result} height="100%" />
      </div>
    </div>
  );
}
