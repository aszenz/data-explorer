import type { Location } from "react-router";
import { Link, useNavigation, Outlet } from "react-router";
import { useEffect } from "react";
import { JSX } from "react/jsx-runtime";

export default SharedLayout;

type SharedLayoutProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};
function SharedLayout({ models, notebooks }: SharedLayoutProps): JSX.Element {
  const { state, location } = useNavigation();
  useEffect(() => {
    window.parent.document.title = document.title;
    window.parent.postMessage("urlChanged", window.location.origin);
  });
  return (
    <>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <div className="menu">
              <button type="button" popoverTarget="models-menu-list">
                Data Models
              </button>
              <ul id="models-menu-list" popover="auto">
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
          </li>
          <li>
            <div className="menu">
              <button type="button" popoverTarget="notebooks-menu-list">
                Data Notebooks
              </button>
              <ul id="notebooks-menu-list" popover="auto">
                {Object.keys(notebooks).map((notebookName) => {
                  return (
                    <li key={notebookName}>
                      <Link
                        to={`/notebook/${encodeURIComponent(notebookName)}`}
                      >
                        {notebookName}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>
        </ul>
      </nav>
      {"loading" === state && !isExplorerPath(location) ? (
        "Loading...."
      ) : (
        <Outlet />
      )}
    </>
  );
}

function isExplorerPath(location: undefined | Location) {
  return location?.pathname.includes("/explorer/");
}
