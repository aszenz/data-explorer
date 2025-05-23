import { HashRouter, Route, Routes } from "react-router";
import tradingModelSource from "./models/trading.malloy?raw";
import "./index.css";
import Home from "./Home";
import { useRuntimeSetup } from "./hooks";
import { RuntimeProvider } from "./contexts";
import ModelExplorer from "./Explore";
import ModelExplorerV2 from "./ExploreV2";

export default App;
function App() {
  const setup = useRuntimeSetup(tradingModelSource);
  if (null === setup) {
    return <div>Loading...</div>;
  }
  return (
    <RuntimeProvider setup={setup}>
      <HashRouter>
        <Routes>
          <Route index path="/" element={<Home />} />
          <Route path="/explorer/:source" element={<ModelExplorer />} />
          <Route path="/explorerv2/:source" element={<ModelExplorerV2 />} />
        </Routes>
      </HashRouter>
    </RuntimeProvider>
  );
}
