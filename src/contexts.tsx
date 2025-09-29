import { useRouteLoaderData } from "react-router";
import { ModelHomeLoaderData } from "./routeType";

export { useRuntime };

function useRuntime() {
  const setup = useRouteLoaderData<ModelHomeLoaderData>("model");
  if (undefined === setup) {
    throw new Error("Model data not found");
  }
  return setup;
}
