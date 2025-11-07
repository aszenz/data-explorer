import { useRouteLoaderData } from "react-router";
import type { ModelHomeLoaderData } from "./routeType";
import { RuntimeSetup } from "./types";

export { useRuntime };

function useRuntime(): RuntimeSetup {
  const setup = useRouteLoaderData<ModelHomeLoaderData>("model");
  if (undefined === setup) {
    throw new Error("Model data not found");
  }
  return setup;
}
