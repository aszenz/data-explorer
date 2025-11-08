import type { Location } from "react-router";
import type { Navigation } from "react-router";
import { Link, useNavigation, Outlet } from "react-router";
import type { JSX } from "react/jsx-runtime";

export default SharedLayout;

type SharedLayoutProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};
function SharedLayout({ models, notebooks }: SharedLayoutProps): JSX.Element {
  const { state, location } = useNavigation();
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
      {showLoader(state, location) ? "Loading...." : <Outlet />}
    </>
  );
}

function showLoader(
  state: Navigation["state"],
  location: undefined | Location,
) {
  const urlSearchParams = new URLSearchParams(location?.search);
  if (true === location?.pathname.includes("explorer")) {
    // Only show loader when going into explorer page, since it has it's own loader for query change navigation
    // When linking to explorer page from outside, we set the `load` query parameter
    return "loading" === state && urlSearchParams.has("load");
  }
  return "loading" === state;
}
