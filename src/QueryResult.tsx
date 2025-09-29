import { useParams } from "react-router";
import RenderedResult from "./RenderedResult";
import { useLoaderData } from "react-router";
import { PreparedQueryLoaderData } from "./routeType";

export default QueryResult;

function QueryResult() {
  const urlParams = useParams();
  const queryName = urlParams.query;
  const result = useLoaderData<PreparedQueryLoaderData>();
  return (
    <div>
      <h1>Query Result for {queryName}</h1>
      <RenderedResult result={result} />
    </div>
  );
}
