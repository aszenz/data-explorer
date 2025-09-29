import { useNavigate, useParams } from "react-router";
import { quoteIfNecessary } from "./schema-utils";
import { useRuntime } from "./contexts";
import { SchemaRenderer } from "./Schema";

export default ModelHome;

function ModelHome() {
  const runtime = useRuntime();
  const navigate = useNavigate();
  const urlParams = useParams();
  return (
    <div>
      <h1>Malloy model {urlParams.model}</h1>
      <SchemaRenderer
        explores={runtime.model.exportedExplores}
        queries={runtime.model.namedQueries}
        defaultShow={true}
        onPreviewClick={(explore) => {
          const { name: sourceName } = explore;
          void navigate(`preview/${sourceName}`);
        }}
        onFieldClick={(field) => {
          const sourceName = field.parentExplore.name;
          if (field.isAtomicField() && field.isCalculation()) {
            const queryString = `run: ${quoteIfNecessary(sourceName)}->{ aggregate: ${quoteIfNecessary(field.name)} }`;
            void navigate(
              `explorer/${sourceName}?query=${queryString}&run=true`,
            );
          } else if (field.isAtomicField()) {
            const queryString = `run: ${quoteIfNecessary(sourceName)}->{ group_by: ${quoteIfNecessary(field.name)} }`;
            void navigate(
              `explorer/${sourceName}?query=${queryString}&run=true`,
            );
          }
        }}
        onQueryClick={(query) => {
          console.log("query", query);
          if ("parentExplore" in query) {
            const source = query.parentExplore.name;
            const queryString = `run: ${quoteIfNecessary(source)}->${quoteIfNecessary(query.name)}`;
            void navigate(`explorer/${source}?query=${queryString}&run=true`);
          } else {
            void navigate(`query/${query.name}`);
          }
        }}
      />
    </div>
  );
}
