import { Link } from "react-router";
import "./index.css";
import { type JSX } from "react/jsx-runtime";

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
          Explore and analyze your Malloy models and notebooks
        </p>
      </div>

      <div className="home-columns">
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
                Add .malloy files to the /models directory
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {Object.keys(models).map((modelName) => {
                return (
                  <Link
                    key={modelName}
                    to={`/model/${encodeURIComponent(modelName)}`}
                    className="card model-card"
                  >
                    <div className="card-icon">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3l9 5v8l-9 5-9-5V8l9-5z" />
                        <path d="M12 8l9-5" />
                        <path d="M12 8L3 3" />
                        <path d="M12 8v13" />
                      </svg>
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{modelName}</h3>
                      <p className="card-description">Semantic data model</p>
                    </div>
                    <div className="card-arrow">→</div>
                  </Link>
                );
              })}
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
                Add .malloynb files to the /models directory
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {Object.keys(notebooks).map((notebookName) => {
                return (
                  <Link
                    key={notebookName}
                    to={`/notebook/${encodeURIComponent(notebookName)}`}
                    className="card notebook-card"
                  >
                    <div className="card-icon">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <path d="M8 6h8" />
                        <path d="M8 10h8" />
                        <path d="M8 14l2 2 2-3 2 1 2-2" />
                        <path d="M8 18h4" />
                      </svg>
                    </div>
                    <div className="card-content">
                      <h3 className="card-title">{notebookName}</h3>
                      <p className="card-description">Visual data story</p>
                    </div>
                    <div className="card-arrow">→</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
