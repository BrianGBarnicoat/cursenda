import { lazy, Suspense, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import './HeroApple3D.css';

// La escultura (three) se descarga aparte, después del texto
const HeroEscena = lazy(() => import('./HeroEscena'));

const CURVA = [0.16, 1, 0.3, 1] as const;

type Busqueda = { texto: string; provincia: string };

export type CursoSugerido = {
  id: number | string;
  titulo: string;
  categoria?: string | null;
  modalidad?: string | null;
  localidad?: string | null;
  centro_nombre?: string | null;
  visitas?: number | null;
};

export type AreaSugerida = { nombre: string; destino: string };

type Props = {
  /** Provincias o localidades que salen en el desplegable. */
  provincias?: string[];
  /** Cursos y áreas con los que se ayuda a quien escribe en el buscador. */
  cursos?: CursoSugerido[];
  areas?: AreaSugerida[];
  /** Si no se pasa, lleva a /cursos con la búsqueda en la dirección. */
  onBuscar?: (busqueda: Busqueda) => void;
};

// Busca igual con tilde o sin ella
const sinTildes = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function HeroApple3D({ provincias = [], cursos = [], areas = [], onBuscar }: Props) {
  const [texto, setTexto] = useState('');
  const [provincia, setProvincia] = useState('');
  const [ayudas, setAyudas] = useState(false);
  const navigate = useNavigate();
  const quieta = !!useReducedMotion();

  // Cuando se baja y la escultura deja de verse, se para: así no gasta ni frena el resto de la página
  const escena = useRef<HTMLDivElement>(null);
  const [aLaVista, setALaVista] = useState(true);
  useEffect(() => {
    const el = escena.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const vigia = new IntersectionObserver(([e]) => setALaVista(e.isIntersecting));
    vigia.observe(el);
    return () => vigia.disconnect();
  }, []);

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    setAyudas(false);
    const busqueda = { texto: texto.trim(), provincia };
    if (onBuscar) return onBuscar(busqueda);
    const params = new URLSearchParams();
    if (busqueda.texto) params.set('q', busqueda.texto);
    if (busqueda.provincia) params.set('zona', busqueda.provincia);
    const cola = params.toString();
    navigate(cola ? `/cursos?${cola}` : '/cursos');
  };

  // Ayudas: mientras se escribe, las áreas y los cursos que coinciden; sin escribir nada, los más vistos
  const q = sinTildes(texto.trim());
  const areasQ = q ? areas.filter(a => sinTildes(a.nombre).includes(q)).slice(0, 3) : [];
  const cursosQ = (q
    ? cursos.filter(c => [c.titulo, c.categoria, c.localidad, c.centro_nombre].some(v => sinTildes(v).includes(q)))
    : [...cursos].sort((a, b) => (b.visitas ?? 0) - (a.visitas ?? 0))
  ).slice(0, 4);
  const hayAyudas = ayudas && (areasQ.length > 0 || cursosQ.length > 0 || !!q);

  // Se cierran al salir del buscador (no al pasar a una de las ayudas) y con Escape
  const alSalir = (e: FocusEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget)) setAyudas(false); };
  // (sin dejar que Escape vacíe el campo, que es lo que hace el navegador por su cuenta)
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Escape' && ayudas) { e.preventDefault(); setAyudas(false); } };

  const entra = (retraso: number) => quieta ? {} : {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: retraso, ease: CURVA },
  };

  return (
    <section className="hero-a3d">
      <div className="hero-a3d-ancho">
        <div className="hero-a3d-texto">
          <motion.h1 {...entra(0)}>Formación oficial, a coste cero.</motion.h1>
          <motion.p {...entra(0.09)}>
            Cursos subvencionados por el SEPE y Fundae, para personas en paro y para quienes ya trabajan.
            Con titulación oficial y sin pagar nada.
          </motion.p>

          <motion.div className="hero-a3d-buscar" onBlur={alSalir} onKeyDown={alTeclear} {...entra(0.18)}>
            <form className="hero-a3d-buscador" role="search" onSubmit={buscar}>
              <label className="hero-a3d-campo">
                <span>Qué buscar</span>
                <input
                  type="search"
                  placeholder="Soldadura, inglés, cocina..."
                  value={texto}
                  maxLength={80}
                  autoComplete="off"
                  onFocus={() => setAyudas(true)}
                  onChange={(e) => { setTexto(e.target.value); setAyudas(true); }}
                />
              </label>
              <label className="hero-a3d-campo">
                <span>Provincia</span>
                <select value={provincia} onFocus={() => setAyudas(false)} onChange={(e) => setProvincia(e.target.value)}>
                  <option value="">Toda España</option>
                  {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <button type="submit" onFocus={() => setAyudas(false)}>Buscar</button>
            </form>

            {hayAyudas && (
              <div className="hero-a3d-ayudas">
                {areasQ.length > 0 && <p>Áreas</p>}
                {areasQ.map(a => <Link key={a.nombre} to={a.destino}><strong>{a.nombre}</strong><span>Ver los cursos de esta área</span></Link>)}
                {cursosQ.length > 0 && <p>{q ? 'Cursos' : 'Los más vistos'}</p>}
                {cursosQ.map(c => (
                  <Link key={c.id} to={`/curso/${c.id}`}>
                    <strong>{c.titulo}</strong>
                    <span>{[c.modalidad, c.modalidad === 'Online' ? '' : c.localidad].filter(Boolean).join(' · ')}</span>
                  </Link>
                ))}
                {q && areasQ.length === 0 && cursosQ.length === 0 && <p className="hero-a3d-ayudas-vacio">No hay cursos con esa búsqueda. Prueba con otra palabra.</p>}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          ref={escena}
          className="hero-a3d-escena"
          aria-hidden="true"
          {...(quieta ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8, delay: 0.1, ease: CURVA } })}
        >
          <Suspense fallback={null}>
            <HeroEscena quieta={quieta} parada={!aLaVista} />
          </Suspense>
        </motion.div>
      </div>
    </section>
  );
}
