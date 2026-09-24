//bloqueia o acesso ahome sem o login

let logado = false;

export const entrar = () => { logado = true; };
export const sair = () => { logado = false; };
export const estaLogado = () => logado;