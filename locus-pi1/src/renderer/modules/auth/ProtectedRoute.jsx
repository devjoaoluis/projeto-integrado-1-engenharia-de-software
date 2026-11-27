import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { user, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <main className="app-state" role="status" aria-live="polite">
        <p>Verificando sua sessão…</p>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}