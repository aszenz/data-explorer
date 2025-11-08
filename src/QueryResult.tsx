import { useParams, useLoaderData } from "react-router";
import RenderedResult from "./RenderedResult";
import type { PreparedQueryLoaderData } from "./routeType";
import { type JSX } from "react/jsx-runtime";

export default QueryResult;

function QueryResult(): JSX.Element {
  const urlParams = useParams();
  const queryName = urlParams["query"];
  const result = useLoaderData<PreparedQueryLoaderData>();
  return (
    <div>
      <h1>Query Result for {queryName}</h1>
      <RenderedResult result={result} />
    </div>
  );
}
