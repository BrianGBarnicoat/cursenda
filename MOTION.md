# Movimiento en Cursenda

Cómo se mueve la web. Todas las animaciones salen de aquí, para que parezcan de la misma casa.
Los valores están al principio de `src/index.css`.

## La idea

Cursenda es sobria: el movimiento acompaña, no llama la atención. Las cosas entran suaves y
se paran sin rebote. Si una animación se nota más que el contenido, sobra.

## Tiempos

| Nombre | Dura | Para qué |
| --- | --- | --- |
| `--dur-rapida` | 120 ms | Pasar el ratón, pulsar un botón, abrir un desplegable |
| `--dur-normal` | 240 ms | Ventanas, tarjetas que se levantan |
| `--dur-lenta` | 400 ms | Contenido que aparece, barras que se llenan |
| `--dur-entrada` | 800 ms | Lo grande de la portada (franjas de fotos) |
| `--dur-foto` | 6 s | El acercamiento lento de las fotos |
| `--paso-escalera` | 90 ms | Lo que va entre una franja y la siguiente al entrar |

## Curvas

| Nombre | Para qué |
| --- | --- |
| `--curva-entra` | Lo que aparece: sale rápido y frena al llegar |
| `--curva-sale` | Lo que se va: arranca despacio y acelera |
| `--curva-normal` | Cambios de color, tamaño y lo demás |

## Lo que no se anima

- Nada rebota ni se pasa de largo.
- Los avisos y errores salen al momento, sin efectos.
- Las tablas y formularios del panel no se mueven: ahí se va a trabajar.
- En el móvil nada aparece al bajar por la página; solo en ordenador.
- No se usa `transition: all`: se dice qué cambia.

## Menos movimiento

Quien tiene activado "reducir movimiento" en su aparato no ve animaciones: todos los tiempos
pasan a cero y la portada deja de cambiar de foto sola.

## Cómo se comprueba

```bash
npm run lint:movimiento
```

Avisa si alguien mete un tiempo o una curva a mano en vez de usar los de arriba.

## Decisiones

### Franjas de la portada
- Decisión: entran de abajo arriba, una detrás de otra, con `--dur-entrada` y `--curva-entra`.
- Por qué: es lo primero que se ve y tiene que dar sensación de cuidado.
- Descartado: rebote al llegar (parecía de juguete).
- Menos movimiento: aparecen quietas.

### Ventanas del panel
- Decisión: el fondo se oscurece y la ventana sube 8 px, con `--dur-normal`.
- Por qué: salían de golpe y despistaba.
- Descartado: que crezcan desde el centro (demasiado vistoso para un panel de trabajo).

### Aparecer al bajar
- Decisión: tarjetas, sectores y pasos asoman al entrar en pantalla, solo en ordenador.
- Por qué: da vida a la portada sin programa que la haga más lenta.
- Descartado: hacerlo en el móvil (las tarjetas ya se pasan con el dedo) y en navegadores que no lo traen de serie.

### Barras de plazas
- Decisión: cambian de ancho con `--dur-lenta`.
- Por qué: es una barra pequeña y no mueve nada de alrededor.
