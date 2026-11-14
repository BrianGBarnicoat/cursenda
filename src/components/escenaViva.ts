// Lo que la página le cuenta a la escultura de la portada.
// Es un objeto suelto y no un estado de React: la escultura lo lee en cada fotograma
// y así nada se vuelve a pintar por escribir una letra o pasar el ratón.
export const escenaViva = {
  /** De 0 a 1. Sube al escribir en el buscador o al pasar por un área y se apaga sola. */
  energia: 0,
};

/** Aviva la escultura: 1 es el máximo (escribir), menos para cosas más leves (pasar por un área). */
export function avivarEscena(cuanto = 1) {
  escenaViva.energia = Math.min(1, Math.max(escenaViva.energia, cuanto));
}
