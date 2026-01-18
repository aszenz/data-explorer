import type * as malloy from "@malloydata/malloy";

export type { RuntimeSetup, DataSourceInfo };

type DataSourceInfo = {
  name: string;
  path: string;
  url: string;
  fileType: string;
};

type RuntimeSetup = {
  runtime: malloy.Runtime;
  modelMaterializer: malloy.ModelMaterializer;
  model: malloy.Model;
  modelCode: string;
  dataSources: DataSourceInfo[];
  refreshModel: () => void;
};
