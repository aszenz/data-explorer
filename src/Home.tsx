import { Link } from "react-router";
import "./index.css";
import { type JSX } from "react/jsx-runtime";

export default Home;

type HomeProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};

function Home({ models, notebooks }: HomeProps): JSX.Element {
  return (
    <div>
      <h2>Data Explorer</h2>
      <div>
        <h3>Data Models</h3>
        <ul>
          {Object.keys(models).map((modelName) => {
            return (
              <li key={modelName}>
                <Link to={`/model/${encodeURIComponent(modelName)}`}>
                  {modelName}
                </Link>
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
                <Link to={`/notebook/${encodeURIComponent(notebookName)}`}>
                  {notebookName}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
