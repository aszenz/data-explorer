import { type JSX } from "react/jsx-runtime";

export default Loader;

function Loader(): JSX.Element {
  return (
    <div className="loader" data-testid="loader">
      <div className="loader-spinner" />
    </div>
  );
}
