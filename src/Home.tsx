import "./index.css";
import { getModels, getNotebooks } from "./models";

export default Home;

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
