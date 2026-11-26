#!/usr/bin/env bash
set -e

# Se o comando for apenas para tarefas CLI (testes, typecheck, lint, package, make)
if [ "$1" = "test" ]; then
    shift
    exec npm test "$@"
elif [ "$1" = "typecheck" ]; then
    shift
    exec npm run typecheck "$@"
elif [ "$1" = "lint" ]; then
    shift
    exec npm run lint "$@"
elif [ "$1" = "package" ]; then
    shift
    exec npm run package "$@"
elif [ "$1" = "make" ]; then
    shift
    exec npm run make "$@"
fi

# Configurações de exibição virtual e portas
export DISPLAY="${DISPLAY:-:99}"
export RESOLUTION="${RESOLUTION:-1280x800x24}"
export VNC_PORT="${VNC_PORT:-5900}"
export NOVNC_PORT="${NOVNC_PORT:-6080}"
export DOCKER_CONTAINER=true
export NO_SANDBOX=true

# Limpa possíveis lockfiles anteriores do X
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

echo "=========================================================="
echo "  Iniciando Locus - Sistema Imobiliário no Docker"
echo "=========================================================="
echo "-> 1/4: Iniciando display virtual Xvfb (${DISPLAY} - ${RESOLUTION})..."
Xvfb "${DISPLAY}" -screen 0 "${RESOLUTION}" -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Aguarda o display virtual estar pronto
for i in $(seq 1 30); do
    if xdpyinfo -display "${DISPLAY}" >/dev/null 2>&1; then
        break
    fi
    sleep 0.2
done

echo "-> 2/4: Iniciando gerenciador de janelas (Fluxbox)..."
fluxbox &

echo "-> 3/4: Iniciando servidor x11vnc na porta ${VNC_PORT}..."
x11vnc -display "${DISPLAY}" -nopw -listen 0.0.0.0 -rfbport "${VNC_PORT}" -forever -shared -bg -quiet

echo "-> 4/4: Iniciando interface web noVNC na porta ${NOVNC_PORT}..."
websockify --web /usr/share/novnc "${NOVNC_PORT}" localhost:"${VNC_PORT}" &

echo ""
echo "=========================================================="
echo " Aplicação Locus pronta para uso!"
echo " Acesse no seu navegador em:"
echo "   👉 http://localhost:${NOVNC_PORT}"
echo "=========================================================="
echo ""

# Inicia a aplicação ou comando customizado
if [ $# -eq 0 ]; then
    exec npm run start:docker
else
    exec "$@"
fi

