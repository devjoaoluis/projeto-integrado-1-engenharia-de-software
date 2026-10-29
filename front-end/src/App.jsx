import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./Login";
import AppLayout from "./layouts/AppLayout";
import Home from "./Home";
import Imoveis from "./Imoveis";
import VisaoGeralImovel from "./VisaoGeralImovel";
import CadastrarImovel from "./CadastrarImovel";
import Locatarios from "./Locatarios";
import VisaoGeralLocatario from "./VisaoGeralLocatario";
import Vistorias from "./Vistorias";
import VisaoGeralVistoria from "./VistoriaImovel";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/imoveis" element={<Imoveis />} />
        <Route path="/imoveis/cadastrar" element={<CadastrarImovel />} />
        <Route path="/imoveis/:id" element={<VisaoGeralImovel />} />

        {/* Módulo de Locatários + Visão Geral  */}
        <Route path="/locatarios" element={<Locatarios />} />
        <Route path="/locatarios/:id" element={<VisaoGeralLocatario />} />

        {/* Módulo de Vistoria*/}
        <Route path="/vistorias" element={<Vistorias />} />
        <Route path="/vistorias/:id" element={<VisaoGeralVistoria />} />

        {/* Outras rotas ainda em desenvolvimento */}
        <Route path="/contratos" element={<div>Contratos</div>} />
        <Route path="/pagamentos" element={<div>Pagamentos</div>} />
        <Route path="/visitas" element={<div>Visitas</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}