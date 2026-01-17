import { useParams } from "react-router";
import SourceExplorer from "./SourceExplorer";
import { type JSX } from "react/jsx-runtime";

export default ModelExplorer;

function ModelExplorer(): JSX.Element {
  const urlParams = useParams();
  const sourceName = urlParams["source"];
  if (undefined === sourceName) {
    throw new Error("Source name is required");
  }
  return (
    <div className="model-explorer">
      <SourceExplorer key={sourceName} />
    </div>
  );
}
