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

      <div className="home-section">
        <div className="section-header">
          <h2>Data Models</h2>
          <span className="count-badge">{modelCount}</span>
        </div>
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
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{modelName}</h3>
                    <p className="card-description">Malloy data model</p>
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
                      strokeWidth="2"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{notebookName}</h3>
                    <p className="card-description">Interactive notebook</p>
                  </div>
                  <div className="card-arrow">→</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
