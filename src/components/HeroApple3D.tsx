import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import './HeroApple3D.css';

// La escultura (three) se descarga aparte, después del texto
const HeroEscena = lazy(() => import('./HeroEscena'));

const CURVA = [0.16, 1, 0.3, 1] as const;

type Busqueda = { texto: string; provincia: string };

type Props = {
  /** Provincias o localidades que salen en el desplegable. */
  provincias?: string[];
  /** Si no se pasa, lleva a /cursos con la búsqueda en la dirección. */
  onBuscar?: (busqueda: Busqueda) => void;
};

export default function HeroApple3D({ provincias = [], onBuscar }: Props) {
  const [texto, setTexto] = useState('');
  const [provincia, setProvincia] = useState('');
  const navigate = useNavigate();
  const quieta = !!useReducedMotion();

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const busqueda = { texto: texto.trim(), provincia };
    if (onBuscar) return onBuscar(busqueda);
    const params = new URLSearchParams();
    if (busqueda.texto) params.set('q', busqueda.texto);
    if (busqueda.provincia) params.set('zona', busqueda.provincia);
    const cola = params.toString();
    navigate(cola ? `/cursos?${cola}` : '/cursos');
  };

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

          <motion.form className="hero-a3d-buscador" role="search" onSubmit={buscar} {...entra(0.18)}>
            <label className="hero-a3d-campo">
              <span>Qué buscar</span>
              <input
                type="search"
                placeholder="Soldadura, inglés, cocina..."
                value={texto}
                maxLength={80}
                onChange={(e) => setTexto(e.target.value)}
              />
            </label>
            <label className="hero-a3d-campo">
              <span>Provincia</span>
              <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
                <option value="">Toda España</option>
                {provincias.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <button type="submit">Buscar</button>
          </motion.form>
        </div>

        <motion.div
          className="hero-a3d-escena"
          aria-hidden="true"
          {...(quieta ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8, delay: 0.1, ease: CURVA } })}
        >
          <Suspense fallback={null}>
            <HeroEscena quieta={quieta} />
          </Suspense>
        </motion.div>
      </div>
    </section>
  );
}
