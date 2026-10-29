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

## Activar los pagos (Stripe)

1. Crear la cuenta en [stripe.com](https://stripe.com) (gratis). Para probar no hace falta NIF.
2. En Stripe, con **Modo de prueba** activado: Desarrolladores → Claves de API → copiar la **clave secreta** (`sk_test_...`).
3. En el servidor, como root:
   ```bash
   cd "/home/Brian/Paginas Web/Cursenda" && node deploy/configurar-stripe.mjs
   systemctl restart cursenda
   ```
   Pide la clave (no se ve al escribirla) y crea solo los planes, el IVA, el portal del cliente y el aviso de pagos.
4. Probar con la tarjeta `4242 4242 4242 4242`.

Para cobrar de verdad: activar la cuenta en Stripe (pide NIF y cuenta bancaria), borrar la línea
`STRIPE_SECRET_KEY` de `/etc/cursenda/cursenda.env`, volver a lanzar el script con la clave `sk_live_...`
y reiniciar.

Cómo funciona:
- Cada centro nuevo tiene **30 días gratis** sin tarjeta. Desde el admin se puede dar +30 días.
- Si mete la tarjeta durante la prueba, no se cobra hasta que acabe.
- Si se acaba la prueba sin pagar, sus cursos dejan de salir en la web y no ve las solicitudes hasta que pague.
- Si falla un cobro, sigue funcionando mientras Stripe reintenta. Si al final no paga, se bloquea.
- Las facturas salen solas en "Plan y facturas". Ojo: las de Stripe no valen para VeriFactu (obligatorio en 2027).

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
