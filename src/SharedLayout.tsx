import type { Location } from "react-router";
import type { Navigation } from "react-router";
import { useNavigation, Outlet } from "react-router";
import type { JSX } from "react/jsx-runtime";
import Loader from "./Loader";
import Breadcrumbs from "./Breadcrumbs";

export default SharedLayout;

type SharedLayoutProps = {
  models: Record<string, string>;
  notebooks: Record<string, string>;
};
function SharedLayout({ models, notebooks }: SharedLayoutProps): JSX.Element {
  const { state, location } = useNavigation();
  return (
    <>
      <Breadcrumbs models={models} notebooks={notebooks} />
      {showLoader(state, location) ? <Loader /> : <Outlet />}
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
