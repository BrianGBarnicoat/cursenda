import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './NavbarMinimal.css';

type Enlace = { texto: string; destino: string };

const ENLACES: Enlace[] = [
  { texto: 'Explorar cursos', destino: '/cursos' },
  { texto: 'Áreas', destino: '/#areas' },
  { texto: 'Empresas', destino: '/centros' },
];

type Props = {
  /** Lleva al espacio del alumno. */
  onMiEspacio: () => void;
  /** Logo propio; si no se pasa, se escribe "cursenda" con su punto. */
  logo?: ReactNode;
  enlaces?: Enlace[];
};

export default function NavbarMinimal({ onMiEspacio, logo, enlaces = ENLACES }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [conBorde, setConBorde] = useState(false);
  const { pathname, hash } = useLocation();

  // Al cambiar de página se cierra el menú del móvil
  useEffect(() => { setAbierto(false); }, [pathname, hash]);

  // La línea de abajo solo aparece cuando se ha bajado un poco
  useEffect(() => {
    const mirar = () => setConBorde(window.scrollY > 8);
    mirar();
    window.addEventListener('scroll', mirar, { passive: true });
    return () => window.removeEventListener('scroll', mirar);
  }, []);

  // Con el menú abierto, Escape lo cierra
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto]);

  const entrar = () => { setAbierto(false); onMiEspacio(); };

  return (
    <header className={`nav-min${conBorde ? ' nav-min-borde' : ''}${abierto ? ' nav-min-abierto' : ''}`}>
      <div className="nav-min-fila">
        {logo ?? (
          <Link to="/" className="nav-min-logo" aria-label="Cursenda, ir al inicio">
            cursenda<span aria-hidden="true">.</span>
          </Link>
        )}

        <nav className="nav-min-enlaces" aria-label="Principal">
          {enlaces.map(e => (
            e.destino.includes('#')
              ? <Link key={e.destino} to={e.destino}>{e.texto}</Link>
              : <NavLink key={e.destino} to={e.destino}>{e.texto}</NavLink>
          ))}
        </nav>

        <button type="button" className="nav-min-entrar" onClick={entrar}>Mi espacio</button>

        <button
          type="button"
          className="nav-min-menu"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
          aria-controls="nav-min-panel"
          onClick={() => setAbierto(a => !a)}
        >
          {abierto ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
        </button>
      </div>

      <div id="nav-min-panel" className="nav-min-panel" hidden={!abierto}>
        <nav aria-label="Principal, móvil">
          {enlaces.map(e => <Link key={e.destino} to={e.destino}>{e.texto}</Link>)}
        </nav>
        <button type="button" className="nav-min-entrar" onClick={entrar}>Mi espacio</button>
      </div>
    </header>
  );
}
