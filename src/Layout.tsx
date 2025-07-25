import { Outlet, useParams } from "react-router";
import { useRuntimeSetup } from "./hooks";
import { RuntimeProvider } from "./contexts";
import { getModelCode } from "./models";

export default function ModelLayout() {
  const { model } = useParams<{ model: string }>();
  if (undefined === model) {
    throw new Error("Model name is required");
  }
  const modelCode = getModelCode(model);
  const setup = useRuntimeSetup(modelCode);

  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <RuntimeProvider setup={setup}>
      <Outlet />
    </RuntimeProvider>
  );
}
