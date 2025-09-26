export { getModels, getModelCode, getNotebooks, getNotebookCode, getDataset };

export type { SupportedFileType };
type SupportedFileType =
  | "csv"
  | "parquet"
  | "json"
  | "jsonl"
  | "ndjson"
  | "xlsx";

const modelsCode = import.meta.glob("/models/*.malloy", {
  query: "?raw",
  eager: true,
  import: "default",
});

const notebooksCode = import.meta.glob("/models/*.malloynb", {
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

function getModels(): Record<string, string> {
  const models = Object.keys(modelsCode).reduce<Record<string, string>>(
    (acc, modelPath) => {
      const modelName = pathToName(modelPath);
      acc[modelName] = modelPath;
      return acc;
    },
    {},
  );
  console.log({ models });
  return models;
}

function getDatasources(): Record<string, string> {
  const datasources = Object.keys(dataSources).reduce<Record<string, string>>(
    (acc, datasourcePath) => {
      const datasourceName = pathToName(datasourcePath);
      acc[datasourceName] = datasourcePath;
      return acc;
    },
    {},
  );
  console.log({ datasources });
  return datasources;
}

function getNotebooks(): Record<string, string> {
  const notebooks = Object.keys(notebooksCode).reduce<Record<string, string>>(
    (acc, notebookPath) => {
      const notebookName = pathToName(notebookPath);
      acc[notebookName] = notebookPath;
      return acc;
    },
    {},
  );
  console.log({ notebooks });
  return notebooks;
}

function getModelCode(modelName: string): null | string {
  const models = getModels();
  const modelPath = models[modelName];
  if (modelPath in modelsCode) {
    try {
      console.log(`Loading model: ${modelName}`);
      console.log({ modelsCode });
      const code = modelsCode[modelPath];
      if (typeof code === "string") {
        return code;
      }
      throw new Error("Unknown model type");
    } catch (error: unknown) {
      console.error(`Failed to load model: ${modelName}`, error);
      return null;
    }
  } else {
    console.error(`Model not found: ${modelName}`);
    return null;
  }
}

function getNotebookCode(notebookName: string): null | string {
  const notebooks = getNotebooks();
  const notebookPath = notebooks[notebookName];
  if (notebookPath in notebooksCode) {
    try {
      console.log(`Loading notebook: ${notebookName}`);
      console.log({ notebooksCode });
      const code = notebooksCode[notebookPath];
      if (typeof code === "string") {
        return code;
      }
      throw new Error("Unknown notebook type");
    } catch (error: unknown) {
      console.error(`Failed to load notebook: ${notebookName}`, error);
      return null;
    }
  } else {
    console.error(`Notebook not found: ${notebookName}`);
    return null;
  }
}

async function getDataset(
  datasetName: string,
): Promise<null | { data: Blob; fileType: SupportedFileType }> {
  const datasets = getDatasources();
  const datasetpath = datasets[datasetName];
  if (datasetName in datasets) {
    try {
      console.log(`Loading data: ${datasetName}`);
      console.log({ modelsCode });
      const url = dataSources[datasetpath];
      if (typeof url !== "string") {
        throw new Error(`Invalid URL for dataset: ${datasetName}`);
      }
      const fileType = getFileType(datasetpath);
      if (null === fileType) {
        throw new Error(`Unsupported file type for dataset: ${datasetName}`);
      }
      const response = await fetch(url);
      const data = await response.blob();
      return { data, fileType };
    } catch (error: unknown) {
      console.error(`Failed to load data: ${datasetName}`, error);
      return null;
    }
  } else {
    console.warn(`Data ${datasetName} not found in local files`);
    return null;
  }
}

/**
 * Determine the file type based on table name and available datasets
 */
function getFileType(datasetPath: string): SupportedFileType | null {
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
