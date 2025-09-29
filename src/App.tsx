import { RouterProvider } from "react-router";
import "./index.css";
import createAppRouter from "./routing";

export default App;

function App() {
  return <RouterProvider router={createAppRouter()} />;
}
