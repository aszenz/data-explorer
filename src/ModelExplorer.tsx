import { Link, useParams } from "react-router";
import { useRuntime } from "./contexts";
import SourceExplorer from "./SourceExplorer";
import { JSX } from "react/jsx-runtime";

export default ModelExplorer;

function ModelExplorer(): JSX.Element {
  const { model } = useRuntime();
  const urlParams = useParams();
  const modelName = urlParams.model;
  const sourceName = urlParams.source;
  if (undefined === modelName || undefined === sourceName) {
    throw new Error("Source name is required");
  }
  return (
    <div className="model-explorer">
      <div className="columns">
        <h2>Explorer for {modelName}</h2>
        {model.exportedExplores.length > 1 && (
          <>
            <span>Sources: </span>
            <div className="menu">
              <button type="button" popoverTarget="sources-menu-list">
                {sourceName}
              </button>
              <ul id="sources-menu-list" popover="auto">
                {model.exportedExplores
                  .filter((e) => e.name !== sourceName)
                  .map((explore) => (
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
          </>
        )}
      </div>
      <SourceExplorer key={sourceName} />
    </div>
  );
}
