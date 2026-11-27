import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App.jsx";
import { AuthProvider } from "./modules/auth/AuthContext.jsx";
import { ApplicationErrorBoundary } from "./shared/common/components/ApplicationErrorBoundary.jsx";
import "./shared/common/styles/design-tokens.css";
import "./shared/common/styles/index.css";

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