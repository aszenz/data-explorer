import "./index.css";
import { type JSX } from "react/jsx-runtime";
import Card from "./Card";
import ModelIcon from "../img/model-icon.svg?react";
import NotebookIcon from "../img/notebook-icon.svg?react";
import FaviconLogo from "../img/favicon-logo.svg?react";
import { humanizeName } from "./utils/humanize";

export default Home;

type HomeProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};

function Home({ models, notebooks }: HomeProps): JSX.Element {
  const modelCount = Object.keys(models).length;
  const notebookCount = Object.keys(notebooks).length;

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">Data Explorer</h1>
        <p className="home-subtitle">
          Explore and analyze your{" "}
          <a
            href="https://www.malloydata.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="malloy-link"
          >
            Malloy models and notebooks
          </a>
        </p>
        <FaviconLogo className="home-logo" />
      </div>

      <div className="home-content">
        <div className="home-section">
          <div className="section-header">
            <h2>Data Models</h2>
            <span className="count-badge">{modelCount}</span>
          </div>
          <p className="section-hint">
            Semantic layers that define how your data connects and what it means
            — explore sources, dimensions, measures, and relationships.
          </p>
          {modelCount === 0 ? (
            <div className="empty-state">
              <p>No models available</p>
              <p className="empty-state-hint">
                Create Malloy model files (.malloy) to get started
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {Object.keys(models).map((modelName) => (
                <Card
                  key={modelName}
                  to={`/model/${encodeURIComponent(modelName)}`}
                  icon={<ModelIcon aria-label="Data model" />}
                  title={humanizeName(modelName)}
                  className="model-card"
                />
              ))}
            </div>
          )}
        </div>

        <div className="home-section">
          <div className="section-header">
            <h2>Data Notebooks</h2>
            <span className="count-badge">{notebookCount}</span>
          </div>
          <p className="section-hint">
            Rich visual narratives that combine queries, charts, and
            explanations to tell compelling stories with your data.
          </p>
          {notebookCount === 0 ? (
            <div className="empty-state">
              <p>No notebooks available</p>
              <p className="empty-state-hint">
                Create Malloy notebook files (.malloynb) to get started
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {Object.keys(notebooks).map((notebookName) => (
                <Card
                  key={notebookName}
                  to={`/notebook/${encodeURIComponent(notebookName)}`}
                  icon={<NotebookIcon aria-label="Notebook" />}
                  title={humanizeName(notebookName)}
                  className="notebook-card"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
