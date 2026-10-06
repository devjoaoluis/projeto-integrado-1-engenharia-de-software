import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import AppLayout from "./layouts/AppLayout";
import Home from "./Home";
import Imoveis from "./Imoveis";
import CadastrarImovel from "./CadastrarImovel";

export default function App() {
  const [hasUsers, setHasUsers] = useState(null);

  useEffect(() => {
    async function checkUsersExist() {
      try {
        const response = await window.api.auth.hasUsers();
        if (response.success) {
          setHasUsers(response.hasUsers);
        } else {
          setHasUsers(true);
        }
      } catch (error) {
        console.error("Erro ao verificar utilizadores:", error);
        setHasUsers(true);
      }
    }

    checkUsersExist();
  }, []);

  if (hasUsers === null) {
    return (
      <div className="min-h-screen bg-[#1E75C8] flex items-center justify-center text-white font-medium">
        Carregando...
      </div>
    );
  }

  return (
    <Routes>
      {!hasUsers ? (
        <>
          <Route path="/register" element={<Register onSuccess={() => setHasUsers(true)} />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </>
      ) : (
        <>
          <Route path="/login" element={<Login />} />

          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/imoveis" element={<Imoveis />} />
            <Route path="/contratos" element={<div>Contratos</div>} />
            <Route path="/pagamentos" element={<div>Pagamentos</div>} />
            <Route path="/visitas" element={<div>Visitas</div>} />
            <Route path="/vistorias" element={<div>Vistorias</div>} />
            <Route path="/imoveis/cadastrar" element={<CadastrarImovel />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}