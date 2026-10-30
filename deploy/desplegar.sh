#!/usr/bin/env bash
# Compila Cursenda y lo sube a /srv/cursenda/app.
# Si la versión nueva no arranca, vuelve a la anterior.
#
# Uso (como root):  bash deploy/desplegar.sh
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Ejecuta este script como root." >&2; exit 1; }

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_USER="${BUILD_USER:-$(stat -c %U "$REPO_DIR")}"
BUILD_HOME="$(getent passwd "$BUILD_USER" | cut -d: -f6)"
# Usa el npm de nvm o, si no hay, el del sistema
NODE_BIN_DIR="${NODE_BIN_DIR:-$(ls -d "$BUILD_HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/usr/bin}"
APP_DIR="/srv/cursenda/app"
STAGE_DIR="$REPO_DIR/.deploy"
SOCKET="/run/cursenda/cursenda.sock"

[[ -x "$NODE_BIN_DIR/npm" ]] || { echo "No encuentro npm del usuario $BUILD_USER" >&2; exit 1; }

echo "==> Compilando como $BUILD_USER"
sudo -u "$BUILD_USER" env PATH="$NODE_BIN_DIR:$PATH" bash -c "
  set -euo pipefail
  cd '$REPO_DIR'
  npm run build
  npm run build:server
  rm -rf '$STAGE_DIR' && mkdir -p '$STAGE_DIR'
  cp -r dist dist-server package.json package-lock.json deploy '$STAGE_DIR/'
  cd '$STAGE_DIR' && npm ci --omit=dev --no-audit --no-fund --loglevel=error
"

echo "==> Instalando en $APP_DIR"
if [[ -d "$APP_DIR" ]]; then
  rm -rf "$APP_DIR.prev"
  cp -a "$APP_DIR" "$APP_DIR.prev"
fi
mkdir -p "$APP_DIR"
rsync -a --delete "$STAGE_DIR/" "$APP_DIR/"
# El código es de root: Cursenda lo puede leer pero no cambiar
chown -R root:root "$APP_DIR"
chmod -R u=rwX,go=rX "$APP_DIR"
rm -rf "$STAGE_DIR"

echo "==> Instalando servicios systemd"
install -m 644 "$APP_DIR/deploy/systemd/cursenda.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/systemd/cursenda-backup.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/systemd/cursenda-backup.timer" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/systemd/cursenda-correo.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/systemd/cursenda-correo.timer" /etc/systemd/system/
install -d -o cursenda -g cursenda -m 700 /srv/cursenda/data/correo
systemctl daemon-reload
systemctl restart cursenda.service
systemctl enable --now cursenda-correo.timer

echo "==> Comprobando que responde"
ok=0
for _ in $(seq 1 15); do
  if curl -sf --unix-socket "$SOCKET" -o /dev/null http://localhost/api/public/cursos; then ok=1; break; fi
  sleep 1
done

if [[ $ok -ne 1 ]]; then
  echo "La nueva versión no responde. Últimos logs:" >&2
  journalctl -u cursenda.service -n 30 --no-pager >&2 || true
  if [[ -d "$APP_DIR.prev" ]]; then
    echo "==> Volviendo a la versión anterior" >&2
    rsync -a --delete "$APP_DIR.prev/" "$APP_DIR/"
    install -m 644 "$APP_DIR/deploy/systemd/cursenda.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl restart cursenda.service
  fi
  exit 1
fi

echo "==> Actualizando nginx"
NGINX_SITE="/etc/nginx/sites-available/gbarnicoat.uk"
NGINX_LIMITS="/etc/nginx/conf.d/cursenda-limits.conf"
cp -p "$NGINX_SITE" "$NGINX_SITE.prev" 2>/dev/null || true
cp -p "$NGINX_LIMITS" "$NGINX_LIMITS.prev" 2>/dev/null || true
install -m 644 "$APP_DIR/deploy/nginx/gbarnicoat.uk.conf" "$NGINX_SITE"
install -m 644 "$APP_DIR/deploy/nginx/cursenda-limits.conf" "$NGINX_LIMITS"
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  echo "La configuración de nginx falla: dejo la anterior" >&2
  [[ -f "$NGINX_SITE.prev" ]] && cp -p "$NGINX_SITE.prev" "$NGINX_SITE"
  [[ -f "$NGINX_LIMITS.prev" ]] && cp -p "$NGINX_LIMITS.prev" "$NGINX_LIMITS"
  exit 1
fi
rm -f "$NGINX_SITE.prev" "$NGINX_LIMITS.prev"

echo "==> Despliegue correcto"
