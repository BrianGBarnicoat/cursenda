#!/usr/bin/env bash
# Primera instalación de Cursenda en /srv/cursenda.
# Solo hace falta una vez. Para actualizar luego: deploy/desplegar.sh
#
# Uso (como root):  bash deploy/instalar.sh
#
# En un servidor nuevo, sin base de datos que traer:
#   OLD_DB=/ruta/inexistente bash deploy/instalar.sh
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Ejecuta este script como root." >&2; exit 1; }

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OLD_DB="${OLD_DB:-$REPO_DIR/cursenda.db}"
OLD_BACKUPS="${OLD_BACKUPS:-$REPO_DIR/backups}"
OLD_ENV="/etc/cursenda.env"
CONF_DIR="/etc/cursenda"
BASE="/srv/cursenda"
NGINX_SITE="/etc/nginx/sites-available/gbarnicoat.uk"
STAMP="$(date +%Y%m%d-%H%M%S)"
ROLLBACK_DIR="/root/cursenda-rollback-$STAMP"

mkdir -p "$ROLLBACK_DIR"
chmod 700 "$ROLLBACK_DIR"
[[ -f /etc/systemd/system/cursenda.service ]] && cp -p /etc/systemd/system/cursenda.service "$ROLLBACK_DIR/"
[[ -f "$NGINX_SITE" ]] && cp -p "$NGINX_SITE" "$ROLLBACK_DIR/"

rollback() {
  echo >&2
  echo "!!! Algo ha fallado: restaurando la configuración anterior" >&2
  if [[ -f "$ROLLBACK_DIR/cursenda.service" ]]; then
    cp -p "$ROLLBACK_DIR/cursenda.service" /etc/systemd/system/cursenda.service
    systemctl daemon-reload
    systemctl restart cursenda.service || true
  fi
  if [[ -f "$ROLLBACK_DIR/gbarnicoat.uk" ]]; then
    cp -p "$ROLLBACK_DIR/gbarnicoat.uk" "$NGINX_SITE"
    rm -f /etc/nginx/conf.d/cursenda-limits.conf
    nginx -t && systemctl reload nginx || true
  fi
  echo "La web vuelve a funcionar como antes. Los datos originales no se han tocado." >&2
}
trap rollback ERR

echo "==> 1/8 Usuario de sistema 'cursenda' (sin shell, sin sudo)"
if ! id cursenda &>/dev/null; then
  useradd --system --home-dir "$BASE" --no-create-home --shell /usr/sbin/nologin cursenda
fi
# Para que nginx pueda entrar al socket
usermod -aG cursenda www-data

echo "==> 2/8 Carpetas en $BASE"
install -d -m 755 -o root -g root "$BASE"
install -d -m 755 -o root -g root "$BASE/app"
install -d -m 700 -o cursenda -g cursenda "$BASE/data"
install -d -m 700 -o cursenda -g cursenda "$BASE/backups"

echo "==> 3/8 Secretos en $CONF_DIR (solo root)"
install -d -m 700 -o root -g root "$CONF_DIR"
if [[ ! -f "$CONF_DIR/cursenda.env" ]]; then
  if [[ -f "$OLD_ENV" ]]; then
    JWT_SECRET="$(grep '^JWT_SECRET=' "$OLD_ENV" | cut -d= -f2-)"
  fi
  umask 077
  cat > "$CONF_DIR/cursenda.env" <<EOF
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 48)}
ALLOWED_ORIGINS=https://gbarnicoat.uk
EOF
fi
if [[ ! -f "$CONF_DIR/backup.key" ]]; then
  (umask 077; openssl rand -base64 48 > "$CONF_DIR/backup.key")
fi
chmod 600 "$CONF_DIR"/*

echo "==> 4/8 Copiando la base de datos a $BASE/data"
if [[ -f "$OLD_DB" && ! -f "$BASE/data/cursenda.db" ]]; then
  systemctl stop cursenda.service || true
  python3 -I - "$OLD_DB" "$BASE/data/cursenda.db" <<'EOF'
import sqlite3, sys
src = sqlite3.connect(f'file:{sys.argv[1]}?mode=ro', uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
assert dst.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
dst.close()
EOF
  chown cursenda:cursenda "$BASE/data/cursenda.db"
  chmod 600 "$BASE/data/cursenda.db"
fi

echo "==> 5/8 Compilando e instalando la aplicación"
bash "$REPO_DIR/deploy/desplegar.sh"

echo "==> 6/8 nginx: socket Unix y límites de peticiones"
install -m 644 "$BASE/app/deploy/nginx/cursenda-limits.conf" /etc/nginx/conf.d/cursenda-limits.conf
install -m 644 "$BASE/app/deploy/nginx/gbarnicoat.uk.conf" "$NGINX_SITE"
nginx -t
systemctl reload nginx
sleep 1
curl -sf -o /dev/null https://gbarnicoat.uk/api/public/cursos

echo "==> 7/8 Copias de seguridad diarias cifradas"
systemctl enable --now cursenda-backup.timer
systemctl start cursenda-backup.service

trap - ERR

echo "==> 8/8 Retirando los datos personales de la carpeta de desarrollo"
if [[ -f "$OLD_DB" ]]; then
  install -d -m 700 -o cursenda -g cursenda "$BASE/backups/migracion"
  mv "$OLD_DB" "$BASE/backups/migracion/cursenda-original-$STAMP.db"
  if [[ -d "$OLD_BACKUPS" ]]; then
    mv "$OLD_BACKUPS" "$BASE/backups/migracion/backups-home-$STAMP"
  fi
  chown -R cursenda:cursenda "$BASE/backups/migracion"
  chmod -R go= "$BASE/backups/migracion"
fi
rm -f "$OLD_ENV"
systemctl enable cursenda.service >/dev/null

echo
echo "---------------- Comprobaciones ----------------"
echo -n "Web pública:              "; curl -s -o /dev/null -w "%{http_code}\n" https://gbarnicoat.uk/
echo -n "Usuario del servicio:     "; ps -o user= -p "$(systemctl show -p MainPID --value cursenda.service)"
echo -n "Puertos TCP de Cursenda:  "; ss -tlnp 2>/dev/null | grep -c 'node' || true
echo -n "Copias cifradas:          "; ls "$BASE/backups"/*.enc 2>/dev/null | wc -l
echo -n "Aislamiento (0 = máximo): "; systemd-analyze security cursenda.service 2>/dev/null | tail -1
echo
echo "Copia de la configuración anterior en: $ROLLBACK_DIR"
