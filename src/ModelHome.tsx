import { useNavigate, useParams } from "react-router";
import { quoteIfNecessary } from "./schema-utils";
import { useRuntime } from "./contexts";
import { SchemaRenderer } from "./Schema";
import { type JSX } from "react/jsx-runtime";

export default ModelHome;

function ModelHome(): JSX.Element {
  const runtime = useRuntime();
  const navigate = useNavigate();
  const urlParams = useParams();
  return (
    <div>
      <h1>Malloy model {urlParams["model"]}</h1>
      <SchemaRenderer
        explores={runtime.model.exportedExplores}
        queries={runtime.model.namedQueries}
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
          return navigate(`explorer/${source}`);
        }}
      />
    </div>
  );
}
