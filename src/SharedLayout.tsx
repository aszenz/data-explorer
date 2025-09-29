import { Link, Location, useNavigation } from "react-router";
import { Outlet } from "react-router";
import { getModels, getNotebooks } from "./models";

export default SharedLayout;

function SharedLayout() {
  const { state, location } = useNavigation();
  const models = getModels();
  const notebooks = getNotebooks();
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
                      <Link to={`/model/${modelName}`}>{modelName}</Link>
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
                      <Link to={`/notebook/${notebookName}`}>
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
