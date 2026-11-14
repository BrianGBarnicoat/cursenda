import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './CourseSearchSection.css';

export type CursoBuscable = {
  id: number | string;
  titulo: string;
  categoria: string;
  modalidad: string; // 'Presencial' | 'Online' | 'Mixta'
  localidad?: string | null;
  provincia?: string | null;
  centro_nombre?: string | null;
  duracion_horas?: number | null;
  descripcion?: string | null;
};

type Modalidad = '' | 'Online' | 'Presencial';

export type FiltrosCursos = { texto: string; area: string; provincia: string; modalidad: Modalidad };

type Props = {
  cursos: CursoBuscable[];
  estado?: 'cargando' | 'listo' | 'error';
  /** Ids de los cursos que el alumno tiene guardados en su espacio. */
  guardados?: Array<CursoBuscable['id']>;
  /** Se llama al pulsar "Guardar en mi espacio", tanto para guardar como para quitar. */
  onGuardar: (curso: CursoBuscable) => void;
  /** Con qué filtros arranca (por ejemplo, lo que se buscó en la portada). */
  inicial?: Partial<FiltrosCursos>;
  porPagina?: number;
};

const MODALIDADES: { valor: Modalidad; texto: string }[] = [
  { valor: '', texto: 'Todos' },
  { valor: 'Online', texto: 'Online' },
  { valor: 'Presencial', texto: 'Presencial' },
];

// Busca igual con tilde o sin ella
const sinTildes = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// "SSCS0208 Atención sociosanitaria" se enseña sin el código
const sinCodigo = (titulo: string) => titulo.replace(/^[A-Z]{4}\d{4}\S*\s*[-–:.]?\s*/, '') || titulo;
const lugarDe = (c: CursoBuscable) => (c.provincia || c.localidad || '').trim();
// Un curso mixto tiene parte en el aula, así que cuenta como presencial
const esDeModalidad = (c: CursoBuscable, m: Modalidad) => !m || (m === 'Online' ? c.modalidad === 'Online' : c.modalidad !== 'Online');

export default function CourseSearchSection({ cursos, estado = 'listo', guardados = [], onGuardar, inicial, porPagina = 12 }: Props) {
  const [texto, setTexto] = useState(inicial?.texto ?? '');
  const [area, setArea] = useState(inicial?.area ?? '');
  const [provincia, setProvincia] = useState(inicial?.provincia ?? '');
  const [modalidad, setModalidad] = useState<Modalidad>(inicial?.modalidad ?? '');
  const [visibles, setVisibles] = useState(porPagina);
  const idTitulo = useId();

  // Solo se ofrecen las áreas y provincias que tienen algún curso
  const areas = useMemo(() => [...new Set(cursos.map(c => c.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [cursos]);
  const provincias = useMemo(
    () => [...new Set(cursos.filter(c => c.modalidad !== 'Online').map(lugarDe).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [cursos],
  );

  const filtrados = useMemo(() => {
    const q = sinTildes(texto.trim());
    return cursos.filter(c =>
      (!area || c.categoria === area) &&
      (!provincia || (c.modalidad !== 'Online' && lugarDe(c) === provincia)) &&
      esDeModalidad(c, modalidad) &&
      (!q || [c.titulo, c.categoria, c.localidad, c.provincia, c.centro_nombre, c.descripcion].some(v => sinTildes(v).includes(q)))
    );
  }, [cursos, texto, area, provincia, modalidad]);

  // Al cambiar la búsqueda se vuelve a la primera tanda
  useEffect(() => { setVisibles(porPagina); }, [texto, area, provincia, modalidad, porPagina]);

  const hayFiltros = !!(texto.trim() || area || provincia || modalidad);
  const quitarFiltros = () => { setTexto(''); setArea(''); setProvincia(''); setModalidad(''); };
  const elegidos = new Set(guardados.map(String));

  return (
    <section className="cursos-b" id="buscar-cursos" aria-labelledby={idTitulo}>
      <div className="cursos-b-ancho">
        <header className="cursos-b-cabecera">
          <h2 id={idTitulo}>Encuentra tu curso.</h2>
          <p>Busca por lo que quieres aprender y elige dónde y cómo estudiarlo.</p>
        </header>

        <form className="cursos-b-barra" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            aria-label="Buscar cursos"
            placeholder="Qué quieres aprender"
            value={texto}
            maxLength={80}
            onChange={(e) => setTexto(e.target.value)}
          />
        </form>

        <div className="cursos-b-filtros">
          <select className={`cursos-b-pastilla${area ? ' puesta' : ''}`} aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Área: todas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className={`cursos-b-pastilla${provincia ? ' puesta' : ''}`} aria-label="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)}>
            <option value="">Provincia: todas</option>
            {provincias.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <div className="cursos-b-modalidad" role="group" aria-label="Modalidad">
            {MODALIDADES.map(m => (
              <button key={m.texto} type="button" aria-pressed={modalidad === m.valor} onClick={() => setModalidad(m.valor)}>{m.texto}</button>
            ))}
          </div>

          {hayFiltros && <button type="button" className="cursos-b-quitar" onClick={quitarFiltros}>Quitar filtros</button>}
        </div>

        <p className="cursos-b-resumen" aria-live="polite">
          {estado === 'cargando' && 'Cargando cursos...'}
          {estado === 'error' && 'No se han podido cargar los cursos. Vuelve a intentarlo en un momento.'}
          {estado === 'listo' && (filtrados.length === 1 ? '1 curso' : `${filtrados.length} cursos`)}
        </p>

        {estado === 'listo' && filtrados.length === 0 && (
          <div className="cursos-b-vacio">
            <strong>No hay cursos con esa búsqueda.</strong>
            <span>Prueba con otra palabra o quita algún filtro.</span>
            {hayFiltros && <button type="button" className="cursos-b-boton" onClick={quitarFiltros}>Ver todos los cursos</button>}
          </div>
        )}

        {estado === 'listo' && filtrados.length > 0 && (
          <ul className="cursos-b-rejilla">
            {filtrados.slice(0, visibles).map(c => {
              const elegido = elegidos.has(String(c.id));
              const lugar = c.modalidad === 'Online' ? '' : lugarDe(c);
              const datos = [c.modalidad, lugar, c.duracion_horas ? `${c.duracion_horas} horas` : ''].filter(Boolean);
              return (
                <li key={c.id} className="cursos-b-tarjeta">
                  <span className="cursos-b-area">{c.categoria}</span>
                  <h3><Link to={`/curso/${c.id}`}>{sinCodigo(c.titulo)}</Link></h3>
                  {c.centro_nombre && <p className="cursos-b-centro">{c.centro_nombre}</p>}
                  <p className="cursos-b-datos">{datos.join(' · ')}</p>
                  <div className="cursos-b-acciones">
                    {/* Pedir plaza se hace en la ficha, que es donde está el formulario del centro */}
                    <Link to={`/curso/${c.id}#pedir`} className="cursos-b-boton">Pedir plaza</Link>
                    <button type="button" className="cursos-b-boton claro" aria-pressed={elegido} onClick={() => onGuardar(c)}>
                      {elegido ? 'Guardado' : 'Guardar en mi espacio'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {estado === 'listo' && filtrados.length > visibles && (
          <div className="cursos-b-mas">
            <button type="button" className="cursos-b-boton" onClick={() => setVisibles(v => v + porPagina)}>Ver más cursos</button>
          </div>
        )}
      </div>
    </section>
  );
}
