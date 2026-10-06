import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const api = () => window.api?.auth;
const MOCK_KEY = "locus:mock-user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (api()) {
          const { user } = await api().getCurrentUser();
          setUser(user ?? null);
        } else {
          const salvo = sessionStorage.getItem(MOCK_KEY);
          setUser(salvo ? JSON.parse(salvo) : null);
        }
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const login = useCallback(async ({ email, senha }) => {
    if (api()) {
      const res = await api().login({ email, senha });
      if (res.success) {
        const { user } = await api().getCurrentUser();
        setUser(user ?? { email });
      }
      return res;
    }
    if (!email || !senha) return { success: false, error: "Preencha email e senha." };
    const mock = { email };
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(mock));
    setUser(mock);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (api()) await api().logout();
    sessionStorage.removeItem(MOCK_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}