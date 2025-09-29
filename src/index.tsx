import { createRoot } from "react-dom/client";
import App from "./App";
import { StrictMode } from "react";

const rootElement = document.getElementById("root");
if (null === rootElement) {
  throw new Error("Root element not found");
}
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
