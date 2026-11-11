# 🐳 Guia de Execução com Docker — Locus (PI1)

Este projeto conta com suporte completo a conteinerização via Docker e Docker Compose.

Como o **Locus** é uma aplicação desktop desenvolvida com **Electron**, **React**, **TypeScript** e banco local **SQLite (libsql/drizzle)**, o container foi configurado com um servidor X11 virtual (**Xvfb**) e um gateway web **noVNC**. Isso permite que a aplicação seja executada dentro do container e **acessada visualmente por qualquer navegador web**, sem necessidade de instalar dependências locais no computador hospedeiro (compatível com Windows, macOS e Linux).

---

## 🚀 1. Início Rápido (Executar a Aplicação)

### Pré-requisitos
- Ter o **Docker** e o **Docker Compose** instalados (ex: [Docker Desktop](https://www.docker.com/products/docker-desktop/)).
- Certifique-se de que o Docker Desktop esteja aberto e em execução.

### Subir a Aplicação:
Na raiz do repositório, execute:

```bash
docker compose up --build
```

Após o build e inicialização dos serviços, abra o seu navegador no endereço:

👉 **[http://localhost:6080](http://localhost:6080)**

A interface gráfica do **Locus** abrirá diretamente na janela do seu navegador com suporte total a cliques, teclado, upload de fotos e laudos de vistorias, geração de contratos e navegação.

> **Dica:** Para parar a execução, basta pressionar `Ctrl + C` no terminal ou executar `docker compose down`.

---

## 🧪 2. Executar Testes Automatizados no Container

Para rodar a suite completa de 97 testes automatizados isolados no ambiente Linux do Docker:

```bash
docker compose run --rm test
```

Para rodar a verificação estrita de tipagem TypeScript (`tsc --noEmit`):

```bash
docker compose run --rm typecheck
```

---

## 📦 3. Gerar Pacotes Instaladores Linux (.deb, .rpm, .zip)

Para gerar os pacotes de distribuição e executáveis da aplicação empacotados para Linux:

```bash
docker compose run --rm package
```

Os arquivos compilados serão gerados na pasta `./dist-packages` na raiz do seu projeto.

---

## 💾 4. Persistência de Dados

O banco de dados SQLite (`database.db`), os arquivos do dossiê de locatários e as fotos/vídeos de vistorias são gravados no volume nomeado `locus-data`. 

Isso garante que todos os dados cadastrados permaneçam salvos mesmo ao reiniciar ou recriar os containers Docker.

Para resetar a base de dados do Docker (apagar todos os dados):
```bash
docker compose down -v
```

---

## 🌐 5. Executar o Protótipo Web Estático (front-end)

Caso queira subir o servidor Vite do protótipo estático localizado na pasta `front-end`:

```bash
docker compose --profile web up --build frontend-web
```
Acesse em: **http://localhost:5173**

---

## 🛠️ 6. Uso com Docker puro (sem Compose)

Se preferir utilizar apenas os comandos nativos do Docker CLI:

```bash
# Construir a imagem da aplicação
docker build --target runner -t locus-app .

# Executar o container
docker run -d \
  --name locus-app \
  -p 6080:6080 \
  -p 5900:5900 \
  --shm-size=2gb \
  -v locus-pi1-data:/root/.config/locus-pi1 \
  locus-app

# Executar os testes
docker run --rm locus-app test
```

