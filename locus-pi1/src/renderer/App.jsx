import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./Login";
import AppLayout from "./layouts/AppLayout";
import Home from "./Home";
import Imoveis from "./Imoveis";
import CadastrarImovel from "./CadastrarImovel";


export default function App() {
    return (
        <Routes>
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
        </Routes>
    );
}