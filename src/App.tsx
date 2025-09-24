import { HashRouter, Route, Routes } from "react-router";
import "./index.css";
import ModelHome from "./ModelHome";
import ModelExplorer from "./ModelExplorer";
import ModelLayout from "./Layout";
import { getModels, getNotebooks } from "./models";
import PreviewResult from "./PreviewResult";
import QueryResult from "./QueryResult";
import DataNotebook from "./DataNotebook";

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
        <Route path="/notebook/:notebook" element={<DataNotebook />} />
      </Routes>
    </HashRouter>
  );
}

function Home() {
  const models = getModels();
  const notebooks = getNotebooks();
  return (
    <div>
      <h2>Data Explorer</h2>
      <div>
        <h3>Data Models</h3>
        <ul>
          {Object.keys(models).map((modelName) => {
            return (
              <li key={modelName}>
                <a href={`#/model/${modelName}`}>{modelName}</a>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3>Data Notebooks</h3>
        <ul>
          {Object.keys(notebooks).map((notebookName) => {
            return (
              <li key={notebookName}>
                <a href={`#/notebook/${notebookName}`}>{notebookName}</a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
