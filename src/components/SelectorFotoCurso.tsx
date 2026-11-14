import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import './SelectorFotoCurso.css';

/** Lo que se ha elegido en el formulario. Se aplica al guardar el curso. */
export type EleccionFoto =
  | { tipo: 'propia'; archivo: Blob; vista: string }
  | { tipo: 'banco'; id: number; vista: string; autor: string }
  | { tipo: 'quitar' };

export type FotoDeBanco = { id: number; miniatura: string; autor: string };

type Props = {
  /** Dirección de la foto que el curso tiene ahora, si tiene. */
  actual: string | null;
  eleccion: EleccionFoto | null;
  onCambio: (eleccion: EleccionFoto | null) => void;
  /** Busca fotos en el banco. Si falla, lanza un error con el texto que hay que enseñar. */
  buscar: (texto: string) => Promise<FotoDeBanco[]>;
};

// La foto se recorta a 16:10 y se reduce en el propio navegador: así pesa poco y todas las tarjetas quedan iguales
const ANCHO = 1200, ALTO = 750, PESO_MAXIMO = 230 * 1024;

async function prepararFoto(archivo: File): Promise<{ archivo: Blob; vista: string }> {
  const imagen = await createImageBitmap(archivo);
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const escala = Math.max(ANCHO / imagen.width, ALTO / imagen.height);
  const w = imagen.width * escala, h = imagen.height * escala;
  const dibujo = lienzo.getContext('2d');
  if (!dibujo) throw new Error('sin lienzo');
  dibujo.fillStyle = '#FFFFFF';
  dibujo.fillRect(0, 0, ANCHO, ALTO);
  dibujo.drawImage(imagen, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
  imagen.close();
  // Se baja la calidad hasta que quepa
  for (const calidad of [0.86, 0.78, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await new Promise<Blob | null>(resuelve => lienzo.toBlob(resuelve, 'image/jpeg', calidad));
    if (blob && blob.size <= PESO_MAXIMO) return { archivo: blob, vista: lienzo.toDataURL('image/jpeg', 0.6) };
  }
  throw new Error('pesa demasiado');
}

export default function SelectorFotoCurso({ actual, eleccion, onCambio, buscar }: Props) {
  const [pestana, setPestana] = useState<'propia' | 'banco'>('propia');
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<FotoDeBanco[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  const entrada = useRef<HTMLInputElement>(null);
  const id = useId();

  const vista = eleccion?.tipo === 'quitar' ? null : eleccion ? eleccion.vista : actual;

  const alElegirArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setAviso('');
    try {
      onCambio({ tipo: 'propia', ...(await prepararFoto(archivo)) });
    } catch {
      setAviso('No se ha podido usar esa imagen. Prueba con una foto JPG o PNG.');
    }
  };

  const lanzarBusqueda = async () => {
    const q = texto.trim();
    if (q.length < 2 || buscando) return;
    setBuscando(true);
    setAviso('');
    try {
      const lista = await buscar(q);
      setFotos(lista);
      if (lista.length === 0) setAviso('No hay fotos con esa búsqueda. Prueba con otra palabra.');
    } catch (err: any) {
      setFotos(null);
      setAviso(err?.message || 'No se han podido buscar fotos.');
    } finally {
      setBuscando(false);
    }
  };
  // El buscador va dentro del formulario del curso: Intro busca fotos, no guarda el curso
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); lanzarBusqueda(); } };

  return (
    <div className="foto-curso">
      <div className="foto-curso-vista">
        {vista ? <img src={vista} alt="Foto del curso" /> : <span>Sin foto. Se usará la del área del curso.</span>}
      </div>

      <div className="foto-curso-lado">
        <div className="foto-curso-pestanas" role="tablist" aria-label="De dónde sale la foto">
          <button type="button" role="tab" id={`${id}-t-propia`} aria-selected={pestana === 'propia'} aria-controls={`${id}-p-propia`} onClick={() => setPestana('propia')}>Subir una foto</button>
          <button type="button" role="tab" id={`${id}-t-banco`} aria-selected={pestana === 'banco'} aria-controls={`${id}-p-banco`} onClick={() => setPestana('banco')}>Buscar en el banco de fotos</button>
        </div>

        {pestana === 'propia' ? (
          <div role="tabpanel" id={`${id}-p-propia`} aria-labelledby={`${id}-t-propia`} className="foto-curso-panel">
            <p>Una foto tuya en JPG, PNG o WebP. Se recorta en horizontal y se guarda en Cursenda.</p>
            <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={alElegirArchivo} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => entrada.current?.click()}>Elegir archivo</button>
          </div>
        ) : (
          <div role="tabpanel" id={`${id}-p-banco`} aria-labelledby={`${id}-t-banco`} className="foto-curso-panel">
            <div className="foto-curso-buscar">
              <input className="form-control" type="search" aria-label="Buscar fotos" placeholder="Cocina, soldadura, oficina..." maxLength={80} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclear} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={lanzarBusqueda} disabled={buscando || texto.trim().length < 2}>{buscando ? 'Buscando...' : 'Buscar'}</button>
            </div>
            {fotos && fotos.length > 0 && (
              <>
                <ul className="foto-curso-rejilla">
                  {fotos.map(f => (
                    <li key={f.id}>
                      <button type="button" aria-pressed={eleccion?.tipo === 'banco' && eleccion.id === f.id} title={`Foto de ${f.autor}`}
                        onClick={() => onCambio({ tipo: 'banco', id: f.id, vista: f.miniatura, autor: f.autor })}>
                        <img src={f.miniatura} alt={`Foto de ${f.autor}`} />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="foto-curso-credito">Fotos de <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>. Al guardar el curso, la elegida se copia a Cursenda.</p>
              </>
            )}
          </div>
        )}

        {aviso && <p className="foto-curso-aviso" role="status">{aviso}</p>}
        {eleccion?.tipo === 'banco' && <p className="foto-curso-credito">Elegida: foto de {eleccion.autor}.</p>}
        {(vista || eleccion) && (
          <p className="foto-curso-acciones">
            {vista && <button type="button" className="foto-curso-enlace" onClick={() => onCambio(actual ? { tipo: 'quitar' } : null)}>Quitar la foto</button>}
            {eleccion && actual && <button type="button" className="foto-curso-enlace" onClick={() => onCambio(null)}>Dejar la que tenía</button>}
          </p>
        )}
      </div>
    </div>
  );
}
