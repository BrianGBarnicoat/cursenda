#!/usr/bin/env bash
# Copia cifrada de la base de datos de Cursenda y de los logos de los centros.
# Se lanza sola una vez al día (cursenda-backup.timer).
#
# Para recuperar una copia (como root):
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
#     -pass file:/etc/cursenda/backup.key \
#     -in /srv/cursenda/backups/cursenda-AAAAMMDD-HHMMSS.db.gz.enc | gunzip > cursenda.db
# Y los logos (crea la carpeta logos donde se lance):
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
#     -pass file:/etc/cursenda/backup.key \
#     -in /srv/cursenda/backups/cursenda-AAAAMMDD-HHMMSS.logos.tar.gz.enc | tar -xzf -
set -euo pipefail

DB="${CURSENDA_DB_PATH:-/srv/cursenda/data/cursenda.db}"
DEST="${BACKUP_DIR:-/srv/cursenda/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
KEY="${CREDENTIALS_DIRECTORY:?Falta la credencial backup.key}/backup.key"
STAMP="$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Copia segura aunque la web esté escribiendo
python3 -I - "$DB" "$TMP" <<'EOF'
import sqlite3, sys
src = sqlite3.connect(f'file:{sys.argv[1]}?mode=ro', uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
dst.close()
src.close()
EOF

gzip -c "$TMP" | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
  -pass "file:$KEY" -out "$DEST/cursenda-$STAMP.db.gz.enc"

echo "Copia creada: $DEST/cursenda-$STAMP.db.gz.enc"

# Los logos de los centros están en una carpeta al lado de la base de datos.
# Si su copia falla se avisa, pero la de la base de datos ya está hecha.
LOGOS="$(dirname "$DB")/logos"
if [[ -d "$LOGOS" ]] && [[ -n "$(ls -A "$LOGOS" 2>/dev/null)" ]]; then
  if tar -C "$(dirname "$LOGOS")" -czf - logos | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
    -pass "file:$KEY" -out "$DEST/cursenda-$STAMP.logos.tar.gz.enc"; then
    echo "Logos copiados: $DEST/cursenda-$STAMP.logos.tar.gz.enc"
  else
    rm -f "$DEST/cursenda-$STAMP.logos.tar.gz.enc"
    echo "No se han podido copiar los logos" >&2
  fi
fi

# Borrar copias antiguas
find "$DEST" \( -name 'cursenda-*.db.gz.enc' -o -name 'cursenda-*.logos.tar.gz.enc' \) -mtime +"$KEEP_DAYS" -delete
