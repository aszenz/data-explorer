import { useParams } from "react-router";
import { useRuntime } from "./contexts";
import * as MalloyInterface from "@malloydata/malloy-interfaces";
import { useEffect, useState } from "react";
import RenderedResult from "./RenderedResult";
import { executeMalloyQuery } from "./SourceExplorer";

export default PreviewResult;

function PreviewResult() {
  const urlParams = useParams();
  const sourceName = urlParams.source;
  const { runtime, model } = useRuntime();
  const [result, setResult] = useState<MalloyInterface.Result | null>(null);
  useEffect(() => {
    async function fetchData() {
      if (undefined === sourceName) {
        throw new Error("Source name is required");
      }
      const result = await executeMalloyQuery(
        runtime,
        `run: ${sourceName} -> {select: *; limit: 50}`,
        model,
      );
      setResult(result);
    }
    void fetchData();
  }, [model, sourceName, runtime]);

  if (null === result) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <h1>Preview Result for {sourceName}</h1>
      <RenderedResult result={result} />
    </div>
  );
}
