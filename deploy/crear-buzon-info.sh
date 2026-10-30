#!/usr/bin/env bash
# Crea un buzón propio para info@cursenda.es, con su contraseña. Se lanza una vez como root:
#   bash deploy/crear-buzon-info.sh
# La contraseña se escribe en la terminal, sin que se vea, y se guarda cifrada.
set -euo pipefail

USUARIO="info"
DIRECCION="info@cursenda.es"
PASSWD="/etc/dovecot/passwd"
VIRTUAL="/etc/postfix/virtual"
COPIA="/root/cursenda-antes-buzon-$(date +%Y%m%d%H%M%S)"

[[ $EUID -eq 0 ]] || { echo "Hay que lanzarlo como root" >&2; exit 1; }
if grep -q "^$USUARIO:" "$PASSWD"; then
  echo "El buzón $USUARIO ya existe. No cambio nada." >&2
  exit 1
fi

read -r -s -p "Contraseña nueva para $DIRECCION (mínimo 12 caracteres): " CLAVE; echo
read -r -s -p "Repítela: " CLAVE2; echo
[[ "$CLAVE" == "$CLAVE2" ]] || { echo "No coinciden. No he cambiado nada." >&2; exit 1; }
[[ ${#CLAVE} -ge 12 ]] || { echo "Es demasiado corta. No he cambiado nada." >&2; exit 1; }
CIFRADA="$(doveadm pw -s SHA512-CRYPT -p "$CLAVE")"
unset CLAVE CLAVE2

mkdir -p "$COPIA"
cp -p "$PASSWD" "$VIRTUAL" "$COPIA/"
restaurar() {
  echo "Algo ha fallado: dejo el correo como estaba" >&2
  cp -p "$COPIA/passwd" "$PASSWD"
  cp -p "$COPIA/virtual" "$VIRTUAL"
  postmap "$VIRTUAL"
  systemctl reload postfix dovecot
}
trap restaurar ERR

# Usuario sin acceso al servidor: solo sirve para el correo
id "$USUARIO" >/dev/null 2>&1 || adduser --disabled-password --gecos "Correo de Cursenda" --shell /usr/sbin/nologin "$USUARIO"
echo "$USUARIO:$CIFRADA" >> "$PASSWD"
sed -i "s/^$DIRECCION .*/$DIRECCION $USUARIO/" "$VIRTUAL"
postmap "$VIRTUAL"
postfix check
systemctl reload postfix dovecot

# La web de correo también tiene que conocer el dominio
MODELO="$(find /var/www/snappymail -type f -path '*domains*' -name 'gbarnicoat.uk.json' 2>/dev/null | head -1)"
if [[ -n "$MODELO" ]]; then
  DESTINO="$(dirname "$MODELO")/cursenda.es.json"
  [[ -f "$DESTINO" ]] || cp -p "$MODELO" "$DESTINO"
else
  echo "Aviso: no he encontrado la configuración de la web de correo. Dímelo si no te deja entrar." >&2
fi

trap - ERR
echo "==> Listo. Entra en https://mail.gbarnicoat.uk con $DIRECCION y tu contraseña nueva."
echo "Copia de lo anterior en $COPIA"
