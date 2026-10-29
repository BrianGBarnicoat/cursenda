#!/usr/bin/env bash
# Aplica las correcciones de seguridad de Cursenda en el servidor.
# Uso:  sudo bash scripts/aplicar-seguridad.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

APP_DIR="/home/Brian/Paginas Web/Cursenda"
APP_USER="Brian"
NODE_BIN_DIR="/home/Brian/.nvm/versions/node/v24.13.0/bin"
ENV_FILE="/etc/cursenda.env"
UNIT_FILE="/etc/systemd/system/cursenda.service"
NGINX_SITE="/etc/nginx/sites-available/gbarnicoat.uk"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$APP_DIR"

echo "==> 1/7 Copia de seguridad de la base de datos y configuraciones"
mkdir -p backups
cp -p cursenda.db "backups/cursenda-$STAMP.db"
cp -p "$UNIT_FILE" "backups/cursenda.service-$STAMP"
cp -p "$(readlink -f /etc/nginx/sites-enabled/gbarnicoat.uk)" "backups/nginx-gbarnicoat.uk-$STAMP"
chown -R "$APP_USER:$APP_USER" backups
chmod 700 backups
chmod 600 backups/*

echo "==> 2/7 Cambiando contraseñas por defecto (admin y demo) e invalidando la invitación"
ADMIN_PW="$(python3 -c 'import secrets;print(secrets.token_urlsafe(15))')"
DEMO_PW="$(python3 -c 'import secrets;print(secrets.token_urlsafe(15))')"
python3 -I - "$ADMIN_PW" "$DEMO_PW" <<'EOF'
import sqlite3, hashlib, secrets, sys
admin_pw, demo_pw = sys.argv[1], sys.argv[2]
db = sqlite3.connect('cursenda.db')
for email, pw in (('admin@cursenda.es', admin_pw), ('demo@cursenda.es', demo_pw)):
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha512', pw.encode(), salt.encode(), 1000, 64).hex()
    db.execute('UPDATE centros SET password_hash = ?, salt = ? WHERE email = ?', (h, salt, email))
db.execute("UPDATE invitaciones SET usada = 1 WHERE token = 'token_invitacion_123'")
db.commit()
EOF
chown "$APP_USER:$APP_USER" cursenda.db
chmod 600 cursenda.db

echo "==> 3/7 Creando $ENV_FILE con un JWT_SECRET nuevo (cierra todas las sesiones abiertas)"
umask 077
cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
ALLOWED_ORIGINS=https://gbarnicoat.uk
JWT_SECRET=$(openssl rand -hex 48)
EOF
chmod 600 "$ENV_FILE"

echo "==> 4/7 Compilando frontend y backend como $APP_USER"
sudo -u "$APP_USER" env PATH="$NODE_BIN_DIR:$PATH" bash -c "cd '$APP_DIR' && npm run build && npx tsc -p tsconfig.server.json"

echo "==> 5/7 Reescribiendo el servicio systemd (sin root y sin secretos en el archivo)"
cat > "$UNIT_FILE" <<EOF
[Unit]
Description=Cursenda SaaS Service
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node dist-server/index.js
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

echo "==> 6/7 nginx: compresión gzip y caché larga para /assets/"
cat > "$NGINX_SITE" <<'EOF'
server {
    server_name gbarnicoat.uk;

    gzip on;
    gzip_proxied any;
    gzip_vary on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
    server_tokens off;

    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gbarnicoat.uk/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gbarnicoat.uk/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = gbarnicoat.uk) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name gbarnicoat.uk;
    return 404; # managed by Certbot
}
EOF
if ! nginx -t; then
  echo "La configuración de nginx falla: restaurando la copia" >&2
  cp -p "backups/nginx-gbarnicoat.uk-$STAMP" "$NGINX_SITE"
  exit 1
fi

echo "==> 7/7 Reiniciando servicios"
systemctl daemon-reload
systemctl restart cursenda.service
systemctl reload nginx
sleep 2
systemctl --no-pager --lines=5 status cursenda.service || true

echo
echo "---------------- Comprobaciones ----------------"
echo -n "Web pública:            "; curl -s -o /dev/null -w "%{http_code}\n" https://gbarnicoat.uk/
echo -n "Puerto 3000 escucha en: "; ss -tln | awk '$4 ~ /:3000$/ {print $4}'
echo -n "Usuario del servicio:   "; ps -o user= -p "$(systemctl show -p MainPID --value cursenda.service)"
echo "Logins registrados en nginx (POST /api/auth/login), por IP:"
zgrep -h "POST /api/auth/login" /var/log/nginx/access.log* 2>/dev/null | awk '{print $1, $4}' | sort | uniq -c | sort -rn | head -20 || true

echo
echo "================ GUARDA ESTO ================"
echo "admin@cursenda.es  ->  $ADMIN_PW"
echo "demo@cursenda.es   ->  $DEMO_PW"
echo "============================================="
