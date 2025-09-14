import { Link, useParams } from "react-router";
import { useRuntime } from "./contexts";
import SourceExplorer from "./SourceExplorer";

export default ModelExplorer;

function ModelExplorer() {
  const { model } = useRuntime();
  const urlParams = useParams();
  const modelName = urlParams.model;
  const sourceName = urlParams.source;
  if (undefined === modelName || undefined === sourceName) {
    throw new Error("Source name is required");
  }
  return (
    <div className="model-explorer" style={{ height: "90%" }}>
      <div className="columns">
        <h2>{modelName}</h2>
        <ul className="tabs">
          {model.explores.map((explore) => (
            <li
              key={explore.name}
              className={explore.name === sourceName ? "active" : ""}
            >
              <Link
                to={{
                  pathname: `/model/${modelName}/explorer/${explore.name}`,
                }}
              >
                {explore.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SourceExplorer key={sourceName} sourceName={sourceName} />
    </div>
  );
}
