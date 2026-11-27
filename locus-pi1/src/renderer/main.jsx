import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { ApplicationErrorBoundary } from "./components/ApplicationErrorBoundary.jsx";
import "./design-tokens.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ApplicationErrorBoundary>
  </StrictMode>
);