#!/usr/bin/env bash
# Pasa Cursenda a cursenda.es: correo (info@ llega al buzón de Brian), certificados, nginx y web.
# Se lanza una vez como root: bash deploy/activar-dominio.sh
set -euo pipefail

DOMINIO="cursenda.es"
IP="51.255.198.144"
BUZON="Brian"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COPIA="/root/cursenda-antes-dominio-$(date +%Y%m%d%H%M%S)"
NGINX_SITE="/etc/nginx/sites-available/gbarnicoat.uk"
ENV_FILE="/etc/cursenda/cursenda.env"

[[ $EUID -eq 0 ]] || { echo "Hay que lanzarlo como root" >&2; exit 1; }

for nombre in "$DOMINIO" "www.$DOMINIO" "mail.$DOMINIO"; do
  if [[ "$(dig +short A "$nombre" @8.8.8.8 | tail -1)" != "$IP" ]]; then
    echo "$nombre todavía no apunta a este servidor. Vuelve a lanzarlo en un rato." >&2
    exit 1
  fi
done

echo "==> Guardando copia en $COPIA"
mkdir -p "$COPIA"
cp -p /etc/postfix/main.cf /etc/postfix/virtual /etc/postfix/sni_maps "$COPIA/"
cp -p /etc/opendkim/signing.table /etc/opendkim/key.table "$COPIA/"
cp -p "$NGINX_SITE" "$ENV_FILE" "$COPIA/"

restaurar() {
  echo "Algo ha fallado: dejo el correo y la web como estaban" >&2
  cp -p "$COPIA/main.cf" "$COPIA/virtual" "$COPIA/sni_maps" /etc/postfix/
  cp -p "$COPIA/signing.table" "$COPIA/key.table" /etc/opendkim/
  cp -p "$COPIA/gbarnicoat.uk" "$NGINX_SITE"
  cp -p "$COPIA/cursenda.env" "$ENV_FILE"
  postmap /etc/postfix/virtual
  postmap -F hash:/etc/postfix/sni_maps
  systemctl restart opendkim
  systemctl reload postfix
  nginx -t && systemctl reload nginx
  systemctl restart cursenda
}
trap restaurar ERR

echo "==> Certificados"
certbot certonly --nginx --non-interactive --keep-until-expiring -d "$DOMINIO" -d "www.$DOMINIO"
certbot certonly --nginx --non-interactive --keep-until-expiring -d "mail.$DOMINIO"

echo "==> Firma del correo (DKIM)"
CLAVES="/etc/opendkim/keys/$DOMINIO"
if [[ ! -f "$CLAVES/mail.private" ]]; then
  mkdir -p "$CLAVES"
  opendkim-genkey -b 2048 -d "$DOMINIO" -D "$CLAVES" -s mail
  chown -R opendkim:opendkim "$CLAVES"
  chmod 600 "$CLAVES/mail.private"
  chmod 644 "$CLAVES/mail.txt"
fi
grep -q "@$DOMINIO" /etc/opendkim/signing.table || echo "*@$DOMINIO    mail._domainkey.$DOMINIO" >> /etc/opendkim/signing.table
grep -q "^mail._domainkey.$DOMINIO" /etc/opendkim/key.table || echo "mail._domainkey.$DOMINIO    $DOMINIO:mail:$CLAVES/mail.private" >> /etc/opendkim/key.table

echo "==> Correo"
DOMINIOS="$(postconf -h virtual_alias_domains)"
[[ " $DOMINIOS " == *" $DOMINIO "* ]] || postconf -e "virtual_alias_domains = $DOMINIOS $DOMINIO"
for cuenta in info postmaster; do
  grep -q "^$cuenta@$DOMINIO" /etc/postfix/virtual || echo "$cuenta@$DOMINIO $BUZON" >> /etc/postfix/virtual
done
postmap /etc/postfix/virtual
if ! grep -q "^mail.$DOMINIO " /etc/postfix/sni_maps; then
  echo "mail.$DOMINIO /etc/letsencrypt/live/mail.$DOMINIO/privkey.pem /etc/letsencrypt/live/mail.$DOMINIO/fullchain.pem" >> /etc/postfix/sni_maps
fi
postmap -F hash:/etc/postfix/sni_maps
postfix check
systemctl restart opendkim
systemctl reload postfix

echo "==> Web"
install -m 644 "$REPO/deploy/nginx/gbarnicoat.uk.conf" "$NGINX_SITE"
sed -i "s#^ALLOWED_ORIGINS=.*#ALLOWED_ORIGINS=https://$DOMINIO,https://gbarnicoat.uk#" "$ENV_FILE"
nginx -t
systemctl reload nginx
systemctl restart cursenda
sleep 2
curl -sf --resolve "$DOMINIO:443:127.0.0.1" -o /dev/null "https://$DOMINIO/api/public/cursos"

trap - ERR
echo "==> Listo. https://$DOMINIO ya funciona. Copia de lo anterior en $COPIA"
echo "Avisa a Claude para que publique la firma del correo en el DNS."
