# Manual de Testes no Console (DevTools)

Como a interface visual (React) ainda está sendo construída, a melhor forma de validar o backend Local-First é executando as chamadas diretamente no console do aplicativo.

## 🛠️ Como acessar o Console
1. Inicie o aplicativo com o comando: `npm start`
2. Na janela que se abrir, pressione `Ctrl + Shift + I` (ou vá no menu superior em *View > Toggle Developer Tools*).
3. Selecione a aba **Console**.
4. Copie e cole os blocos de código abaixo para testar as funcionalidades.

---

## 🔑 1. Testando a Autenticação (HU-01)

A API de autenticação foi isolada de forma segura e não expõe a criptografia para o frontend. 

**Teste 0: Cadastrar um Usuário (Register)**
Para podermos testar o login corretamente, primeiro precisamos ter um usuário no banco.
```javascript
const novoUsuario = await window.api.auth.register({
  nome: "João Corretor",
  email: "joao@imobiliaria.com",
  senha: "minhasenhaforte"
});

console.log("Usuário cadastrado:", novoUsuario);
```

**Teste 1: Tentativa de Login com dados incorretos (Falha esperada)**
Verifique se a segurança do sistema bloqueia logins inválidos.
```javascript
const loginResult = await window.api.auth.login({
  email: "errado@teste.com",
  senha: "123"
});

console.log("Resultado do Login:", loginResult);
// Esperado: { success: false, error: 'Credenciais inválidas' }
```

**Teste 1.5: Login com Sucesso**
Use os mesmos dados que você cadastrou no Teste 0.
```javascript
const loginSucesso = await window.api.auth.login({
  email: "joao@imobiliaria.com",
  senha: "minhasenhaforte"
});

console.log("Resultado do Login:", loginSucesso);
// Esperado: { success: true }
```

**Teste 2: Buscar usuário atual**
Verifica se o sistema reconhece que não há ninguém logado.
```javascript
const currentUser = await window.api.auth.getCurrentUser();
console.log("Usuário logado:", currentUser);
// Esperado: { user: null }
```

---

## 🏠 2. Testando Imóveis (HU-03)

O CRUD completo de Imóveis está exposto e funcional gravando direto no SQLite.

**Teste 1: Criar um imóvel (CREATE)**
```javascript
const novoImovel = await window.api.properties.create({
  title: "Apartamento no Centro",
  address: "Rua Principal, 100",
  description: "Excelente localização com vista panorâmica.",
  price: 350000
});

console.log("Imóvel criado com sucesso:", novoImovel);
// Guarde o 'id' que aparecer no console para os próximos testes!
```

**Teste 2: Listar todos os imóveis (READ)**
```javascript
const imoveis = await window.api.properties.list();
console.table(imoveis);
```

**Teste 3: Atualizar um imóvel (UPDATE)**
Substitua `COLOQUE_O_ID_AQUI` pelo ID gerado no Teste 1.
```javascript
const imovelAtualizado = await window.api.properties.update("COLOQUE_O_ID_AQUI", {
  price: 340000,
  description: "Preço atualizado para vender rápido!"
});

console.log("Atualizado:", imovelAtualizado);
```

**Teste 4: Deletar um imóvel (DELETE)**
Substitua `COLOQUE_O_ID_AQUI` pelo ID que deseja excluir.
```javascript
await window.api.properties.delete("COLOQUE_O_ID_AQUI");
console.log("Imóvel deletado com sucesso!");

// Liste novamente para conferir se sumiu
console.table(await window.api.properties.list());
```

---

## 📸 3. Testando Mídias do Imóvel (HU-03)

O sistema de mídia faz uma cópia física da imagem do computador para a pasta protegida do App (`%appdata%/locus-pi1/media`).

**Teste 1: Adicionar Mídia**
Substitua o `propertyId` pelo ID de um imóvel existente e coloque um caminho real de uma foto no seu computador (com barras duplas `\\` no Windows).
```javascript
const novaMidia = await window.api.propertyMedia.add({
  propertyId: "ID_DO_IMOVEL_AQUI",
  sourceFilePath: "C:\\Users\\proje\\Pictures\\teste.jpg" // <--- Coloque o caminho de uma foto real sua aqui
});

console.log("Mídia adicionada:", novaMidia);
// Note que o 'filePath' retornado será diferente do original, mostrando que foi copiado pro AppData.
```

**Teste 2: Listar Mídias de um Imóvel**
```javascript
const midias = await window.api.propertyMedia.list("ID_DO_IMOVEL_AQUI");
console.table(midias);
```
