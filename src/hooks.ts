import { useEffect, useState } from "react";
import * as malloy from "@malloydata/malloy";
import { RuntimeSetup } from "./types";
import { DuckDBConnection } from "./connection";
import { getModelCode } from "./models";

export { useRuntimeSetup, useTopValues, setupRuntime };

function useRuntimeSetup(modelDef: null | string) {
  const [setup, setRuntime] = useState<RuntimeSetup | null>(null);
  const [refreshModel, setRefreshModel] = useState(false);

  useEffect(() => {
    async function setup(_modelDef: string) {
      const { runtime, model } = await setupRuntime(_modelDef);
      setRuntime({
        runtime,
        model,
        refreshModel: () => {
          setRefreshModel(!refreshModel);
        },
      });
    }
    if (null !== modelDef) {
      void setup(modelDef);
    }
  }, [modelDef, refreshModel]);

  return setup;
}

function useTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
): {
  refresh: () => void;
  topValues: malloy.SearchValueMapResult[] | undefined;
} {
  const [topValues, setTopValues] = useState<
    malloy.SearchValueMapResult[] | undefined
  >();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    async function getValues() {
      setTopValues(await fetchTopValues(runtime, model, source));
    }
    void getValues();
  }, [model, runtime, source, refresh]);

  return {
    refresh: () => {
      setRefresh(!refresh);
    },
    topValues,
  };
}

async function setupRuntime(mainModelCode: string) {
  const conn = new DuckDBConnection("main", undefined, undefined, {
    // This is the default row limit of the connection (when no row limit is provided)
    rowLimit: 10,
  });
  const runtime = new malloy.SingleConnectionRuntime({
    connection: conn,
    urlReader: {
      readURL: async (url: URL) => {
        if (url.href == "http://main-model.malloy/") {
          return Promise.resolve({ contents: mainModelCode });
        }
        const modelCode = getModelCode(
          url.pathname.replace("/", "").replace(".malloy", ""),
        );
        if (null === modelCode) {
          return Promise.reject(
            new Error(`Failed to load model: ${url.pathname}`),
          );
        }
        return Promise.resolve({ contents: modelCode });
      },
    },
  });
  async function load() {
    const modelMaterializer = runtime.loadModel(
      new URL("http://main-model.malloy"),
    );
    return await modelMaterializer.getModel();
  }

  return { model: await load(), runtime };
}

async function fetchTopValues(
  runtime: malloy.Runtime,
  model?: malloy.ModelDef,
  source?: malloy.StructDef,
): Promise<malloy.SearchValueMapResult[] | undefined> {
  if (undefined === source || undefined === model) {
    return undefined;
  }

  const sourceName = source.as ?? source.name;
  // Returns top 1000(by count) values from every string column in the source
  return runtime._loadModelFromModelDef(model).searchValueMap(sourceName, 10);
}
