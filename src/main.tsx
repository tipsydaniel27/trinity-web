import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The root vessel could not be found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);