import { useNavigate, useParams } from "react-router";
import { quoteIfNecessary } from "./schema-utils";
import { useRuntime } from "./contexts";
import DownloadIcon from "../img/download.svg?react";
import { SchemaRenderer } from "./Schema";
import { type JSX } from "react/jsx-runtime";
import { useModelDownloadUrl } from "./download-utils";

export default ModelHome;

function ModelHome(): JSX.Element {
  const runtime = useRuntime();
  const navigate = useNavigate();
  const urlParams = useParams();
  const modelName = urlParams["model"] || "";
  const modelDownloadUrl = useModelDownloadUrl(modelName);

  return (
    <div className="model-home">
      <div className="model-header">
        <div className="model-header-content">
          <h1 className="model-name">Malloy model {modelName}</h1>
          <p className="model-type">Malloy Data Model</p>
        </div>
        {modelDownloadUrl && (
          <a
            href={modelDownloadUrl}
            download={`${modelName}.malloy`}
            className="action-button"
            title={`Download ${modelName}.malloy`}
          >
            <DownloadIcon aria-label="Download" />
            Download
          </a>
        )}
      </div>
      <div className="model-content">
        <SchemaRenderer
          explores={runtime.model.exportedExplores}
          queries={runtime.model.namedQueries}
          model={runtime.model}
          modelCode={runtime.modelCode}
          dataSources={runtime.dataSources}
          defaultShow
          onPreviewClick={(explore) => {
            const { name: sourceName } = explore;
            return navigate(`preview/${sourceName}`);
          }}
          onFieldClick={(field) => {
            const sourceName = field.parentExplore.name;
            if (field.isAtomicField() && field.isCalculation()) {
              const queryString = `run: ${quoteIfNecessary(sourceName)}->{ aggregate: ${quoteIfNecessary(field.name)} }`;
              return navigate(
                `explorer/${sourceName}?query=${queryString}&run=true&load=true`,
              );
            }
            if (field.isAtomicField()) {
              const queryString = `run: ${quoteIfNecessary(sourceName)}->{ group_by: ${quoteIfNecessary(field.name)} }`;
              return navigate(
                `explorer/${sourceName}?query=${queryString}&run=true&load=true`,
              );
            }
          }}
          onQueryClick={(query) => {
            console.log("query", query);
            if ("parentExplore" in query) {
              const source = query.parentExplore.name;
              const queryString = `run: ${quoteIfNecessary(source)}->${quoteIfNecessary(query.name)}`;
              return navigate(
                `explorer/${source}?query=${queryString}&run=true&load=true`,
              );
            }
            return navigate(`query/${query.name}`);
          }}
          onExploreClick={(explore) => {
            const source = explore.name;
            return navigate(
              `explorer/${source}?showQueryPanel=true&showSourcePanel=true`,
            );
          }}
        />
      </div>
    </div>
  );
}
