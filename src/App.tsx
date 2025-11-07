import { RouterProvider } from "react-router";
import "./index.css";
import createAppRouter from "./routing";
import { SupportedFileType } from "./connection";
import { JSX } from "react/jsx-runtime";

export default App;

function App(): JSX.Element {
  return (
    <RouterProvider
      router={createAppRouter({
        basename: "/",
        models: getModels(),
        notebooks: getNotebooks(),
        getDataset,
      })}
    />
  );
}

const modelsCode = import.meta.glob("/models/**/*.malloy", {
  query: "?raw",
  eager: true,
  import: "default",
});

const notebooksCode = import.meta.glob("/models/**/*.malloynb", {
  query: "?raw",
  eager: true,
  import: "default",
});
const dataSources = import.meta.glob(
  "/models/data/*.{csv,parquet,json,jsonl,ndjson,xlsx}",
  {
    query: "?url",
    eager: true,
    import: "default",
  },
);

console.log({ modelsCode, dataSources, notebooksCode });

function getModels(): Record<string, string> {
  const models = Object.entries(modelsCode).reduce<Record<string, string>>(
    (acc, [modelPath, modelContents]) => {
      if (typeof modelContents !== "string") {
        throw new Error("Unknown notebook type");
      }
      const modelName = pathToName(modelPath);
      acc[modelName] = modelContents;
      return acc;
    },
    {},
  );
  console.log({ models });
  return models;
}

async function getDataset(
  datasetName: string,
): Promise<null | { data: Blob; fileType: SupportedFileType }> {
  console.log(`Fetching dataset: ${datasetName}`);
  const fileType = getFileType(datasetName);
  const datasetUrl = dataSources[datasetNameToDatasourcePath(datasetName)];
  if (typeof datasetUrl !== "string") {
    throw new Error(`Invalid URL for dataset: ${datasetName}`);
  }
  const response = await fetch(datasetUrl);
  const data = await response.blob();
  return { data, fileType };
}

function getNotebooks(): Record<string, string> {
  const notebooks = Object.entries(notebooksCode).reduce<
    Record<string, string>
  >((acc, [notebookPath, notebookContents]) => {
    if (typeof notebookContents !== "string") {
      throw new Error("Unknown notebook type");
    }
    const notebookName = pathToName(notebookPath);
    acc[notebookName] = notebookContents;
    return acc;
  }, {});
  console.log({ notebooks });
  return notebooks;
}

/**
 * Determine the file type based on table name and available datasets
 */
function getFileType(datasetPath: string): SupportedFileType {
  // Extract file extension from the path
  const extension = datasetPath.split(".").pop()?.toLowerCase();
  if (undefined === extension) {
    throw new Error(`Invalid dataset path: ${datasetPath}`);
  }
  if (
    !["csv", "parquet", "json", "jsonl", "ndjson", "xlsx"].includes(extension)
  ) {
    throw new Error(
      `Unknown ${extension} file type for dataset ${datasetPath}`,
    );
  }
  return extension as SupportedFileType;
}

function pathToName(modelPath: string): string {
  return modelPath
    .replace("/models/", "")
    .replace(".malloynb", "")
    .replace(".malloy", "");
}

function datasetNameToDatasourcePath(datasetName: string): string {
  return `/models/${datasetName}`;
}
