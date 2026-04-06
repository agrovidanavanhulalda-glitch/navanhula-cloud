import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// NAVANHULA CLOUD - Entry Point
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackTitle="SYSTEM ERROR - CHECK CONSOLE">
    <App />
  </ErrorBoundary>
);
