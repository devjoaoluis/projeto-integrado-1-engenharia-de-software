# syntax=docker/dockerfile:1
FROM node:20-bookworm AS base

# Evita prompts interativos durante a instalação de pacotes
ENV DEBIAN_FRONTEND=noninteractive

# Instala bibliotecas do sistema para Electron, display virtual (Xvfb), VNC e noVNC (HTML5)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    fluxbox \
    novnc \
    websockify \
    x11-utils \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libsecret-1-0 \
    dbus-x11 \
    libgl1 \
    fonts-dejavu-core \
    procps \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configura página inicial do noVNC com autoconexão e ajuste de tela automático
RUN echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=vnc.html?autoconnect=true&resize=scale"><title>Locus</title></head><body><p>Conectando ao Locus... <a href="vnc.html?autoconnect=true&resize=scale">Clique aqui</a>.</p></body></html>' > /usr/share/novnc/index.html

# Diretório de trabalho no container
WORKDIR /app/locus-pi1

# Copia os manifestos de dependência
COPY locus-pi1/package*.json ./

# Instala dependências do projeto (o Electron baixará o binário correspondente para Linux)
RUN npm install

# Copia o código-fonte da aplicação
COPY locus-pi1/ ./

# -----------------------------------------------------------------
# Target: tester (executa suite de testes, typecheck ou lint)
# -----------------------------------------------------------------
FROM base AS tester
CMD ["npm", "test"]

# -----------------------------------------------------------------
# Target: builder (gera pacotes executáveis do Electron para Linux)
# -----------------------------------------------------------------
FROM base AS builder
CMD ["npm", "run", "package"]

# -----------------------------------------------------------------
# Target: runner (executa a aplicação gráfica com noVNC para acesso web)
# -----------------------------------------------------------------
FROM base AS runner

# Configura script de entrada
COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Portas: 6080 para navegador Web (noVNC) e 5900 para clientes VNC
EXPOSE 6080 5900

# Variáveis de ambiente de display e sandbox
ENV DISPLAY=:99 \
    RESOLUTION=1280x800x24 \
    VNC_PORT=5900 \
    NOVNC_PORT=6080 \
    DOCKER_CONTAINER=true \
    NO_SANDBOX=true

ENTRYPOINT ["/docker-entrypoint.sh"]

