import { HashRouter, Route, Routes } from "react-router";
import "./index.css";
import ModelHome from "./ModelHome";
import ModelExplorer from "./ModelExplorer";
import ModelLayout from "./Layout";
import { getModels } from "./models";
import PreviewResult from "./PreviewResult";
import QueryResult from "./QueryResult";

export default App;

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/model/:model" element={<ModelLayout />}>
          <Route index element={<ModelHome />} />
          <Route path="preview/:source" element={<PreviewResult />} />
          <Route path="explorer/:source" element={<ModelExplorer />} />
          <Route path="query/:query" element={<QueryResult />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

function Home() {
  const models = getModels();
  return (
    <div>
      <h2>Models to explore</h2>
      {Object.keys(models).map((modelName) => {
        return (
          <li key={modelName}>
            <a href={`#/model/${modelName}`}>{modelName}</a>
          </li>
        );
      })}
    </div>
  );
}
