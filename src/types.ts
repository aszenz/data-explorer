import type * as malloy from "@malloydata/malloy";

export type { RuntimeSetup };

type RuntimeSetup = {
  runtime: malloy.Runtime;
  modelMaterializer: malloy.ModelMaterializer;
  model: malloy.Model;
  refreshModel: () => void;
};
