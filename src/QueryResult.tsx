import { useParams } from "react-router";
import { useRuntime } from "./contexts";
import * as malloy from "@malloydata/malloy";
import { useEffect, useState } from "react";
import RenderedResult from "./RenderedResult";

export default QueryResult;

function QueryResult() {
  const urlParams = useParams();
  const queryName = urlParams.query;
  const { runtime, model } = useRuntime();
  const [result, setResult] = useState<malloy.Result | null>(null);
  useEffect(() => {
    async function fetchData() {
      if (undefined === queryName) {
        throw new Error("Query name is required");
      }
      const queryObject = model.getPreparedQueryByName(queryName);
      const result = await malloy.Malloy.run({
        connections: runtime.connections,
        preparedResult: queryObject.preparedResult,
      });
      setResult(result);
    }
    void fetchData();
  }, [model, queryName, runtime]);

  if (null === result) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>Query Result for {queryName}</h1>
      <RenderedResult result={malloy.API.util.wrapResult(result)} />
    </div>
  );
}
