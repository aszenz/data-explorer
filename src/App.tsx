import { RouterProvider } from "react-router";
import "./index.css";
import createAppRouter from "./routing";
import { DownloadURLsContext } from "./download-utils";
import type { JSX } from "react/jsx-runtime";

export default App;

function App(): JSX.Element {
  const modelURLs = globToRecord(modelsURLs);
  const notebookURLs = globToRecord(notebooksURLs);

  return (
    <DownloadURLsContext.Provider value={{ modelURLs, notebookURLs }}>
      <RouterProvider
        router={createAppRouter({
          models: getModels(),
          notebooks: getNotebooks(),
          dataFileURLs: getDataFileURLs(),
        })}
      />
    </DownloadURLsContext.Provider>
  );
}

const modelsCode = import.meta.glob("/models/*.malloy", {
  query: "?raw",
  eager: true,
  import: "default",
});

const modelsURLs = import.meta.glob("/models/*.malloy", {
  query: "?url",
  eager: true,
  import: "default",
});

const notebooksCode = import.meta.glob("/models/*.malloynb", {
  query: "?raw",
  eager: true,
  import: "default",
});

const notebooksURLs = import.meta.glob("/models/*.malloynb", {
  query: "?url",
  eager: true,
  import: "default",
});

const dataSources = import.meta.glob(
  "/models/data/**/*.{csv,parquet,json,jsonl,ndjson,xlsx}",
  {
    query: "?url",
    eager: true,
    import: "default",
  },
);

console.log({ modelsCode, dataSources, notebooksCode });

function getModels(): Record<string, string> {
  return globToRecord(modelsCode);
}

function getNotebooks(): Record<string, string> {
  return globToRecord(notebooksCode);
}

function globToRecord(glob: Record<string, unknown>): Record<string, string> {
  return Object.entries(glob).reduce<Record<string, string>>(
    (acc, [path, value]) => {
      if (typeof value !== "string") {
        throw new Error(`Expected string for ${path}`);
      }
      acc[pathToName(path)] = value;
      return acc;
    },
    {},
  );
}

/**
 * Build a map of data file paths to their serving URLs.
 * e.g. { "data/orders.csv": "/assets/orders-abc123.csv" }
 * These get registered in DuckDB WASM's virtual filesystem so
 * both direct references and glob patterns work natively.
 */
function getDataFileURLs(): Record<string, string> {
  return Object.entries(dataSources).reduce<Record<string, string>>(
    (acc, [path, url]) => {
      if (typeof url !== "string") {
        throw new Error(`Invalid URL for dataset: ${path}`);
      }
      // Strip /models/ prefix so paths match what Malloy models reference
      const name = path.replace("/models/", "");
      acc[name] = url;
      return acc;
    },
    {},
  );
}

function pathToName(modelPath: string): string {
  return modelPath
    .replace("/models/", "")
    .replace(".malloynb", "")
    .replace(".malloy", "");
}
