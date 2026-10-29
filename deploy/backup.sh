#!/usr/bin/env bash
# Copia cifrada de la base de datos de Cursenda.
# Se lanza sola una vez al día (cursenda-backup.timer).
#
# Para recuperar una copia (como root):
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
#     -pass file:/etc/cursenda/backup.key \
#     -in /srv/cursenda/backups/cursenda-AAAAMMDD-HHMMSS.db.gz.enc | gunzip > cursenda.db
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

# Borrar copias antiguas
find "$DEST" -name 'cursenda-*.db.gz.enc' -mtime +"$KEEP_DAYS" -delete

echo "Copia creada: $DEST/cursenda-$STAMP.db.gz.enc"
