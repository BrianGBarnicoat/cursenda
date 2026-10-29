# Servidor

Cursenda va separado del resto de cosas del servidor. Tiene su propio usuario (`cursenda`),
no puede ver nada de `/home` ni conectarse a otros servicios de la máquina, y solo puede
escribir en su carpeta de datos.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `/srv/cursenda/app` | La web y el servidor ya compilados |
| `/srv/cursenda/data` | La base de datos |
| `/srv/cursenda/backups` | Copias diarias cifradas (se guardan 30 días) |
| `/etc/cursenda/` | Las claves (solo root) |

La carpeta de desarrollo solo tiene el código, sin datos reales.

## Instalarlo (solo la primera vez)

```bash
sudo bash deploy/instalar.sh
```

Si algo sale mal, deja todo como estaba.

## Actualizar

```bash
sudo bash deploy/desplegar.sh
```

Si la versión nueva no arranca, vuelve sola a la anterior.

## Ver cómo va

```bash
systemctl status cursenda
journalctl -u cursenda -n 50
```

## Recuperar una copia

```bash
sudo systemctl stop cursenda
sudo openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:/etc/cursenda/backup.key \
  -in /srv/cursenda/backups/cursenda-FECHA.db.gz.enc \
  | gunzip | sudo -u cursenda tee /srv/cursenda/data/cursenda.db > /dev/null
sudo systemctl start cursenda
```

Ojo: guardar `/etc/cursenda/backup.key` fuera del servidor. Sin ella las copias no sirven.

## Pasarlo a otro servidor

1. En el nuevo: instalar nginx, node, rsync, python3 y openssl, y sacar el certificado con certbot.
2. Clonar el repo y lanzar `OLD_DB=/no-existe sudo -E bash deploy/instalar.sh`.
3. Parar el servicio y copiar del servidor viejo `/srv/cursenda/data/cursenda.db` y
   `/etc/cursenda/` (con los mismos dueños y permisos).
4. Cambiar el dominio en `deploy/nginx/gbarnicoat.uk.conf` y la IP en `deploy/systemd/cursenda.service`.
5. Arrancar el servicio y apuntar el DNS al servidor nuevo.

## Pendiente

- Para mandar emails habrá que usar un servicio externo (Resend, Brevo…), porque Cursenda no puede
  usar el correo de este servidor.
- Las copias siguen en la misma máquina. Habría que sacarlas fuera.
