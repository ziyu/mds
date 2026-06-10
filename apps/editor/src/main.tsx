import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { ErrorBoundary } from "./error-boundary.js";
import "./styles.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing root element.");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
