import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import AppLayout from "./layouts/AppLayout";

const Login = lazy(() => import("./Login.jsx"));
const Register = lazy(() => import("./Register.jsx"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword.jsx"));
const Home = lazy(() => import("./Home.jsx"));
const Imoveis = lazy(() => import("./Imoveis.jsx"));
const VisaoGeralImovel = lazy(() => import("./VisaoGeralImovel.jsx"));
const CadastrarImovel = lazy(() => import("./CadastrarImovel.jsx"));
const Contatos = lazy(() => import("./Contatos.jsx"));
const Contratos = lazy(() => import("./Contratos.jsx"));
const Vistorias = lazy(() => import("./Vistorias.jsx"));
const Locatarios = lazy(() => import("./Locatarios.jsx"));
const VisaoGeralLocatario = lazy(() => import("./VisaoGeralLocatario.jsx"));
const Pagamentos = lazy(() => import("./Pagamentos.jsx"));
const AgendamentoVisitas = lazy(() =>
  import("./AgendamentoVisitas.jsx").then((module) => ({ default: module.AgendamentoVisitas }))
);

function ScreenLoading({ label }) {
  return (
    <main className="app-state" role="status" aria-live="polite">
      <div className="app-state-card">
        <span className="app-state-skeleton ui-skeleton" aria-hidden="true" />
        <p>{label}</p>
      </div>
    </main>
  );
}

export default function App() {
  const [accountState, setAccountState] = useState({ status: "loading", hasUsers: null });

  const checkUsersExist = useCallback(async () => {
    setAccountState((current) => ({ ...current, status: "loading" }));
    try {
      const response = await window.api.auth.hasUsers();
      if (!response?.success) {
        throw new Error(response?.error || "Não foi possível verificar as contas.");
      }
      setAccountState({ status: "ready", hasUsers: response.hasUsers });
    } catch (error) {
      console.error("Erro ao verificar contas:", error);
      setAccountState({ status: "error", hasUsers: null });
    }
  }, []);

  useEffect(() => {
    void checkUsersExist();
  }, [checkUsersExist]);

  if (accountState.status === "loading") {
    return <ScreenLoading label="Carregando o Locus…" />;
  }

  if (accountState.status === "error") {
    return (
      <main className="app-state" role="alert">
        <section className="app-state-card">
          <h1>Não foi possível iniciar o aplicativo</h1>
          <p>Verifique a conexão local do aplicativo e tente novamente.</p>
          <button type="button" className="ui-button ui-button--filled" onClick={checkUsersExist}>
            <RefreshCw size={18} aria-hidden="true" />
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <Suspense fallback={<ScreenLoading label="Carregando a tela…" />}>
      <Routes>
        {!accountState.hasUsers ? (
          <>
            <Route
              path="/register"
              element={<Register onSuccess={() => setAccountState({ status: "ready", hasUsers: true })} />}
            />
            <Route path="*" element={<Navigate to="/register" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/imoveis" element={<Imoveis />} />
              <Route path="/contatos" element={<Contatos />} />
              <Route path="/locatarios" element={<Locatarios />} />
              <Route path="/locatarios/:id" element={<VisaoGeralLocatario />} />
              <Route path="/imoveis/:id" element={<VisaoGeralImovel />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/pagamentos" element={<Pagamentos />} />
              <Route path="/visitas" element={<AgendamentoVisitas />} />
              <Route path="/vistorias" element={<Vistorias />} />
              <Route path="/imoveis/cadastrar" element={<CadastrarImovel />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}
