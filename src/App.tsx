import React, { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  MapPin, 
  Users, 
  Plus, 
  Download, 
  Phone, 
  Mail, 
  CheckCircle, 
  X, 
  Play, 
  Pause, 
  Edit, 
  Check, 
  BarChart3,
  Calendar,
  Settings,
  MessageSquare,
  Shield,
  Globe,
  Building,
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' && window.location.port !== '3000' 
  ? 'http://localhost:3000/api' 
  : '/api';

const cleanLocalidad = (loc: string) => {
  if (!loc) return '';
  return loc.split(/[\/,;-]/)[0].trim();
};

// --- LOGO ---
export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={`logo-container ${light ? 'logo-light' : ''}`} style={{ textDecoration: 'none', display: 'inline-flex' }}>
      <span className="logo-text">cursenda<span className="logo-dot">.</span></span>
    </Link>
  );
}

// Mapa de Google que solo se carga si el visitante lo pide (Google pone cookies)
function MapaGoogle({ titulo, src }: { titulo: string; src: string }) {
  const [visible, setVisible] = useState(false);

  if (!visible) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', height: '100%', minHeight: '200px', backgroundColor: 'var(--bg)', color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
        <MapPin size={28} style={{ color: 'var(--accent)' }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVisible(true)}>Ver mapa</button>
        <span>Se cargará Google Maps, que puede usar sus propias cookies.</span>
      </div>
    );
  }

  return (
    <iframe
      title={titulo}
      width="100%"
      height="100%"
      frameBorder="0"
      scrolling="no"
      marginHeight={0}
      marginWidth={0}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ border: 0 }}
    ></iframe>
  );
}

// Fotos de Unsplash guardadas en public/images/cursos (licencia Unsplash): Jeff Siepman (hostelería),
// Age Cymru (sanidad), Centre for Ageing Better (logística), Compagnons (informática), Vitaly Gariev (administración)
export const getCourseImage = (categoria: string) => {
  const mapping: { [key: string]: string } = {
    'Informática': '/images/cursos/informatica.webp',
    'Sanidad': '/images/cursos/sanidad.webp',
    'Logística': '/images/cursos/logistica.webp',
    'Hostelería': '/images/cursos/hosteleria.webp',
    'Administración': '/images/cursos/administracion.webp'
  };
  return mapping[categoria] || '/images/cursos/generica.webp';
};

// Título de la pestaña del navegador
const useTitulo = (titulo?: string | null) => {
  useEffect(() => {
    if (titulo) document.title = titulo;
  }, [titulo]);
};

// --- AJUSTES DE LA WEB ---
// Lo que se puede cambiar desde el panel de administrador. Esto es lo que sale si no se ha cambiado nada.
const AJUSTES_INICIALES = {
  portada_titulo: 'Aprende un oficio con un curso gratis',
  portada_texto: 'Cursos subvencionados con dinero público que publican las academias. Pides plaza aquí y la academia te llama.',
  academias_titulo: 'Recibe a la gente que quiere plaza en tus cursos',
  academias_texto: 'Publicas tus cursos subvencionados y te llegan las solicitudes a un panel, con su teléfono, para que las llames.',
  pie_texto: 'Cursenda es un portal independiente. No pertenece al SEPE ni a ninguna administración pública.',
  precio_starter: '79',
  precio_pro: '149',
  legal_titular: '',
  legal_nif: '',
  legal_domicilio: '',
  legal_email: 'info@cursenda.es',
  legal_actualizado: '29 de octubre de 2026'
};
type Ajustes = typeof AJUSTES_INICIALES;
const AjustesContexto = createContext<{ ajustes: Ajustes; setAjustes: (a: Ajustes) => void }>({ ajustes: AJUSTES_INICIALES, setAjustes: () => {} });
const useAjustes = () => useContext(AjustesContexto);

// --- PORTAL ALUMNOS ---

// Foto de cada categoría. Solo salen las categorías que tienen cursos publicados.
const FOCO_CATEGORIA: Record<string, string> = {
  'Hostelería': '50% 30%',
  'Sanidad': '60% 25%',
  'Logística': '45% 30%',
  'Administración': '55% 25%'
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// La academia escribe la fecha a mano ("15 de enero de 2027", "Inmediata"...).
// Si no se entiende o ya ha pasado, el curso va al grupo "Otras fechas" con su texto tal cual.
function inicioDe(curso: any): { grupo: string; orden: number } {
  const texto = String(curso.fecha_inicio || '').toLowerCase();
  if (texto.includes('inmediat')) return { grupo: 'Empiezan ya', orden: 0 };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let fecha: Date | null = null;
  const conMes = texto.match(new RegExp(`(\\d{1,2})\\s+de\\s+(${MESES.join('|')})(?:\\s+(?:de(?:l)?\\s+)?(\\d{4}))?`));
  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (conMes) {
    const mes = MESES.indexOf(conMes[2]);
    fecha = new Date(conMes[3] ? Number(conMes[3]) : hoy.getFullYear(), mes, Number(conMes[1]));
    if (!conMes[3] && fecha < hoy) fecha.setFullYear(fecha.getFullYear() + 1);
  } else if (iso) {
    fecha = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  if (!fecha || fecha < hoy) return { grupo: 'Otras fechas', orden: Number.MAX_SAFE_INTEGER };
  return { grupo: `Empiezan en ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`, orden: fecha.getTime() };
}

const ordenarPorInicio = (cursos: any[]) => [...cursos].sort((a, b) => inicioDe(a).orden - inicioDe(b).orden);

const plazasLibres = (curso: any) => Math.max(0, curso.plazas - curso.plazas_cubiertas);
const textoPlazas = (curso: any) => {
  const libres = plazasLibres(curso);
  if (libres === 0) return 'Sin plazas libres';
  return libres === 1 ? '1 plaza libre' : `${libres} plazas libres`;
};
const textoModalidad = (curso: any) => {
  if (curso.modalidad === 'Online') return 'Online';
  return `${curso.modalidad === 'Mixta' ? 'Mixto' : 'Presencial'} en ${curso.localidad}`;
};
// Los certificados de profesionalidad llevan un código de 4 letras y 4 números (IFCD0210)
const codigoCertificado = (titulo: string) => titulo.match(/^([A-Z]{4}\d{4})\b/)?.[1] || null;
const tituloSinCodigo = (titulo: string) => titulo.replace(/^[A-Z]{4}\d{4}\s*[-–]\s*/, '');

function useCursosPublicos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  useEffect(() => {
    fetch(`${API_BASE}/public/cursos`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(datos => { setCursos(datos); setEstado('listo'); })
      .catch(() => setEstado('error'));
  }, []);
  return { cursos, estado };
}

function CabeceraPublica() {
  return (
    <header className="pub-barra">
      <Logo light={true} />
      <nav>
        <Link to="/cursos" className="pub-solo-ancho">Cursos</Link>
        <Link to="/centros">Soy una academia</Link>
      </nav>
    </header>
  );
}

function PiePublico() {
  const { ajustes } = useAjustes();
  return (
    <footer className="pub-pie">
      <div className="pub-ancho">
        <p>{ajustes.pie_texto}</p>
        <nav>
          <Link to="/legal/aviso-legal">Aviso legal</Link>
          <Link to="/legal/privacidad">Privacidad</Link>
          <Link to="/legal/cookies">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}

function FilaCurso({ curso }: { curso: any }) {
  const codigo = codigoCertificado(curso.titulo);
  return (
    <article className="pub-curso">
      <Link to={`/curso/${curso.id}`} className="pub-curso-foto" tabIndex={-1} aria-hidden="true">
        <img src={getCourseImage(curso.categoria)} alt="" loading="lazy" style={{ objectPosition: FOCO_CATEGORIA[curso.categoria] }} />
      </Link>
      <div>
        <p className="pub-curso-inicio">{curso.fecha_inicio}</p>
        <h3><Link to={`/curso/${curso.id}`}>{tituloSinCodigo(curso.titulo)}</Link></h3>
        <p className="pub-curso-datos">{textoModalidad(curso)}, {curso.duracion_horas} horas.{codigo ? ` Certificado ${codigo}.` : ''}</p>
      </div>
      <div className="pub-curso-lado">
        <span>{textoPlazas(curso)}</span>
        <Link to={`/curso/${curso.id}`} className="pub-boton">Ver curso</Link>
      </div>
    </article>
  );
}

function AvisoCursos({ estado }: { estado: string }) {
  if (estado === 'cargando') return <p className="pub-aviso">Cargando cursos...</p>;
  if (estado === 'error') {
    return <p className="pub-aviso">No se han podido cargar los cursos. <button type="button" className="pub-enlace" onClick={() => window.location.reload()}>Volver a intentarlo</button></p>;
  }
  return <p className="pub-aviso">Ahora mismo no hay cursos publicados.</p>;
}

function AlumnosHome() {
  useTitulo('Cursenda · Cursos gratis subvencionados');
  const { ajustes } = useAjustes();
  const navigate = useNavigate();
  const { cursos, estado } = useCursosPublicos();
  const [busqueda, setBusqueda] = useState('');
  const [activa, setActiva] = useState(0);
  const [pausada, setPausada] = useState(false);

  // Una franja por cada categoría con cursos: las que más cursos tienen, primero
  const categorias = Object.entries(
    cursos.reduce((grupos: Record<string, any[]>, curso) => {
      (grupos[curso.categoria] = grupos[curso.categoria] || []).push(curso);
      return grupos;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length).slice(0, 6);

  // Las fotos se van abriendo solas hasta que la persona toca alguna
  useEffect(() => {
    if (pausada || categorias.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const turno = setInterval(() => setActiva(i => (i + 1) % categorias.length), 4500);
    return () => clearInterval(turno);
  }, [pausada, categorias.length]);

  const proximos = ordenarPorInicio(cursos).slice(0, 5);

  return (
    <div className="pub">
      <div className="pub-arriba">
        <CabeceraPublica />
        <div className="pub-portada pub-ancho">
          <h1>{ajustes.portada_titulo}</h1>
          <div>
            <p>{ajustes.portada_texto}</p>
            <form className="pub-buscador" onSubmit={(e) => { e.preventDefault(); navigate(`/cursos?q=${encodeURIComponent(busqueda.trim())}`); }}>
              <input aria-label="Qué quieres estudiar" placeholder="Qué quieres estudiar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <button type="submit">Buscar</button>
            </form>
          </div>
        </div>
        {categorias.length > 0 && (
          <nav className="pub-franjas" aria-label="Cursos por oficio">
            {categorias.map(([categoria, lista], i) => {
              const siguiente = ordenarPorInicio(lista)[0];
              return (
                <Link
                  key={categoria}
                  to={`/cursos?categoria=${encodeURIComponent(categoria)}`}
                  className={`pub-franja ${i === activa ? 'activa' : ''}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                  onMouseEnter={() => { setPausada(true); setActiva(i); }}
                  onFocus={() => { setPausada(true); setActiva(i); }}
                >
                  <img src={getCourseImage(categoria)} alt="" style={{ objectPosition: FOCO_CATEGORIA[categoria] }} />
                  <span className="pub-franja-texto">
                    <strong>{categoria}</strong>
                    <span className="pub-franja-mas">
                      <span>
                        <span className="pub-franja-curso">{lista.length === 1 ? tituloSinCodigo(siguiente.titulo) : `${lista.length} cursos. El próximo: ${tituloSinCodigo(siguiente.titulo)}`}</span>
                        <span className="pub-franja-ver">{lista.length === 1 ? 'Ver el curso' : 'Ver los cursos'}</span>
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <main className="pub-ancho pub-seccion">
        <h2 className="pub-titulo">Próximos cursos</h2>
        {proximos.length === 0 ? <AvisoCursos estado={estado} /> : proximos.map(curso => <FilaCurso key={curso.id} curso={curso} />)}
        {cursos.length > proximos.length && (
          <p className="pub-ver-todos"><Link to="/cursos" className="pub-boton">Ver los {cursos.length} cursos</Link></p>
        )}
      </main>

      <section className="pub-academias">
        <div className="pub-ancho">
          <div>
            <h2>¿Tienes una academia?</h2>
            <p>Publica tus cursos y recibe aquí a la gente que pide plaza, con su teléfono. El primer mes es gratis y luego cuesta desde {ajustes.precio_starter} € al mes más IVA.</p>
            <p className="pub-academias-enlaces"><Link to="/centros">Ver cómo funciona</Link><Link to="/centros/login">Entrar al panel</Link></p>
          </div>
          <div className="pub-ficha">
            <span className="pub-ficha-ejemplo">Ejemplo de solicitud en el panel</span>
            <strong>Lucía Navarro</strong> 600 100 205
            <p>Creación y gestión de microempresas</p>
            <p className="pub-ficha-nota">Le he enviado por WhatsApp la lista de documentos. Trae el DARDE el jueves.</p>
          </div>
        </div>
      </section>
      <PiePublico />
    </div>
  );
}

const OPCIONES_SITUACION = [
  { valor: 'Desempleados', texto: 'Estoy en paro' },
  { valor: 'Ocupados', texto: 'Estoy trabajando' }
];

function AlumnosLista() {
  useTitulo('Cursos gratis · Cursenda');
  const { cursos, estado } = useCursosPublicos();
  const [params, setParams] = useSearchParams();
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [situaciones, setSituaciones] = useState<string[]>([]);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const busqueda = params.get('q') || '';
  const categoria = params.get('categoria') || '';

  const cambiarParam = (nombre: string, valor: string) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(nombre, valor); else nuevos.delete(nombre);
    setParams(nuevos, { replace: true });
  };
  const alternar = (lista: string[], valor: string) => lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor];

  // Solo se ofrecen los filtros que dan algún resultado
  const categorias = [...new Set(cursos.map(c => c.categoria))].sort();
  const modalidadesDisponibles = ['Presencial', 'Online', 'Mixta'].filter(m => cursos.some(c => c.modalidad === m));
  const hayCursosPorSituacion = cursos.some(c => c.dirigido_a !== 'Todos');

  // Busca igual con tilde o sin ella
  const normalizar = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const texto = normalizar(busqueda.trim());
  const filtrados = cursos.filter(c =>
    (!categoria || c.categoria === categoria) &&
    (!modalidades.length || modalidades.includes(c.modalidad)) &&
    (!situaciones.length || c.dirigido_a === 'Todos' || situaciones.includes(c.dirigido_a)) &&
    (!texto || [c.titulo, c.localidad, c.categoria, c.centro_nombre, c.descripcion].some(v => normalizar(v).includes(texto)))
  );

  const grupos: { titulo: string; cursos: any[] }[] = [];
  ordenarPorInicio(filtrados).forEach(curso => {
    const titulo = inicioDe(curso).grupo;
    const grupo = grupos.find(g => g.titulo === titulo);
    if (grupo) grupo.cursos.push(curso); else grupos.push({ titulo, cursos: [curso] });
  });

  const hayFiltros = !!(texto || categoria || modalidades.length || situaciones.length);
  const quitarFiltros = () => { setParams({}, { replace: true }); setModalidades([]); setSituaciones([]); };

  return (
    <div className="pub">
      <div className="pub-arriba">
        <CabeceraPublica />
        <div className="pub-ancho pub-lista-cabeza">
          <h1>Todos los cursos</h1>
          <div className="pub-buscador">
            <input aria-label="Qué quieres estudiar" placeholder="Qué quieres estudiar" value={busqueda} onChange={(e) => cambiarParam('q', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pub-ancho">
        {categorias.length > 1 && (
          <div className="pub-oficios" role="group" aria-label="Filtrar por oficio">
            {categorias.map(c => (
              <button key={c} type="button" className="pub-oficio" aria-pressed={categoria === c} onClick={() => cambiarParam('categoria', categoria === c ? '' : c)}>
                <img src={getCourseImage(c)} alt="" style={{ objectPosition: FOCO_CATEGORIA[c] }} />
                <span>{c}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pub-lista">
          <aside className="pub-filtros">
            <button type="button" className="pub-filtros-boton" aria-expanded={filtrosAbiertos} onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}>
              {filtrosAbiertos ? 'Ocultar filtros' : 'Filtrar por modalidad y situación'}
            </button>
            <div className={filtrosAbiertos ? 'abiertos' : ''}>
              {modalidadesDisponibles.length > 1 && (
                <fieldset>
                  <legend>Cómo es el curso</legend>
                  {modalidadesDisponibles.map(m => (
                    <label key={m}><input type="checkbox" checked={modalidades.includes(m)} onChange={() => setModalidades(alternar(modalidades, m))} />{m === 'Mixta' ? 'Mixto' : m}</label>
                  ))}
                </fieldset>
              )}
              {hayCursosPorSituacion && (
                <fieldset>
                  <legend>Tu situación</legend>
                  {OPCIONES_SITUACION.map(o => (
                    <label key={o.valor}><input type="checkbox" checked={situaciones.includes(o.valor)} onChange={() => setSituaciones(alternar(situaciones, o.valor))} />{o.texto}</label>
                  ))}
                </fieldset>
              )}
            </div>
          </aside>

          <main>
            {estado !== 'listo' || cursos.length === 0 ? <AvisoCursos estado={estado} /> : (
              <>
                <p className="pub-resumen">
                  <span>{filtrados.length === 1 ? '1 curso' : `${filtrados.length} cursos`}</span>
                  {hayFiltros && <button type="button" className="pub-enlace" onClick={quitarFiltros}>Quitar filtros</button>}
                </p>
                {grupos.map(grupo => (
                  <section key={grupo.titulo}>
                    <h2 className="pub-titulo">{grupo.titulo}</h2>
                    {grupo.cursos.map(curso => <FilaCurso key={curso.id} curso={curso} />)}
                  </section>
                ))}
                {filtrados.length === 0 && (
                  <p className="pub-aviso">No hay cursos con esos filtros. <button type="button" className="pub-enlace" onClick={quitarFiltros}>Quítalos para ver todos</button></p>
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <PiePublico />
    </div>
  );
}

function AlumnosDetalle() {
  const { id } = useParams();
  const [curso, setCurso] = useState<any>(null);
  useTitulo(curso ? `${tituloSinCodigo(curso.titulo)} · Cursenda` : null);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/public/cursos/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(datos => {
        setCurso(datos);
        // Registrar visita
        if (datos) fetch(`${API_BASE}/public/cursos/${id}/visita`, { method: 'POST' });
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setEnviando(true);
    try {
      const res = await fetch(`${API_BASE}/public/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curso_id: id, nombre, email, telefono, rgpd })
      });
      const data = await res.json();
      if (res.ok) setSubmitSuccess(true);
      else setSubmitError(data.error || 'No se ha podido enviar la solicitud.');
    } catch (err) {
      setSubmitError('No se ha podido enviar. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="pub"><div className="pub-arriba"><CabeceraPublica /></div><p className="pub-aviso pub-ancho">Cargando el curso...</p></div>;
  if (!curso) return <NoEncontrada />;

  const codigo = codigoCertificado(curso.titulo);
  const libres = plazasLibres(curso);
  const localidadMapa = cleanLocalidad(curso.localidad);
  const dirigidoA: Record<string, string> = { Desempleados: 'Personas en paro', Ocupados: 'Personas que trabajan', Todos: 'Personas en paro o que trabajan' };

  return (
    <div className="pub">
      <div className="pub-arriba"><CabeceraPublica /></div>
      <section className="pub-curso-portada">
        <img src={getCourseImage(curso.categoria)} alt="" style={{ objectPosition: FOCO_CATEGORIA[curso.categoria] }} />
        <div className="pub-ancho">
          <Link to="/cursos" className="pub-volver">Volver a los cursos</Link>
          <h1>{tituloSinCodigo(curso.titulo)}</h1>
          <p>{codigo ? `Certificado de profesionalidad ${codigo}. ` : ''}Lo imparte {curso.centro_nombre}.</p>
        </div>
      </section>

      <div className="pub-ancho">
        <dl className="pub-datos">
          <div><dt>Empieza</dt><dd>{curso.fecha_inicio}</dd></div>
          <div><dt>Duración</dt><dd>{curso.duracion_horas} horas</dd></div>
          <div><dt>Modalidad</dt><dd>{textoModalidad(curso)}</dd></div>
          <div><dt>Plazas libres</dt><dd>{libres} de {curso.plazas}</dd></div>
          <div><dt>Para</dt><dd>{dirigidoA[curso.dirigido_a] || curso.dirigido_a}</dd></div>
        </dl>

        <div className="pub-detalle">
          <div>
            <section>
              <h2>De qué trata</h2>
              <p>{curso.descripcion}</p>
            </section>
            <section>
              <h2>Qué pasa cuando pides plaza</h2>
              <p>{curso.centro_nombre} recibe tus datos y te llama. Con esa llamada te confirma si cumples los requisitos del curso y qué documentos necesitas.</p>
            </section>
            {curso.modalidad !== 'Online' && (
              <section>
                <h2>Dónde es</h2>
                <div className="pub-mapa">
                  <MapaGoogle titulo="Mapa de ubicación" src={`https://maps.google.com/maps?q=${encodeURIComponent(`${curso.centro_nombre || 'Academia'}, ${localidadMapa}, España`)}&t=&z=16&ie=UTF8&iwloc=&output=embed`} />
                </div>
              </section>
            )}
          </div>

          <aside className="pub-pedir" id="pedir">
            {submitSuccess ? (
              <div className="pub-gracias">
                <h2>Solicitud enviada</h2>
                <p>{curso.centro_nombre} ya tiene tus datos y te llamará al {telefono}.</p>
                <p><Link to="/cursos">Ver más cursos</Link></p>
              </div>
            ) : libres === 0 ? (
              <div>
                <h2>Sin plazas libres</h2>
                <p>Este curso ya no tiene plazas libres.</p>
                <p><Link to={`/cursos?categoria=${encodeURIComponent(curso.categoria)}`}>Ver otros cursos de {curso.categoria}</Link></p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2>Pide tu plaza</h2>
                <p>El curso es gratis y pedir plaza no te compromete a nada.</p>
                {submitError && <p className="pub-error" role="alert">{submitError}</p>}
                <label>Nombre y apellidos<input required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
                <label>Teléfono<input required type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
                <label>Correo<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                <label className="pub-rgpd">
                  <input required type="checkbox" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} />
                  <span>Acepto que mis datos se entreguen a {curso.centro_nombre} para gestionar mi plaza (<Link to="/legal/privacidad" target="_blank">política de privacidad</Link>).</span>
                </label>
                <button type="submit" className="pub-boton pub-boton-pedir" disabled={enviando}>{enviando ? 'Enviando...' : 'Pedir plaza'}</button>
              </form>
            )}
          </aside>
        </div>
      </div>

      {!submitSuccess && libres > 0 && (
        <div className="pub-barra-movil"><span>{textoPlazas(curso)}</span><a href="#pedir" className="pub-boton pub-boton-pedir">Pedir plaza</a></div>
      )}
      <PiePublico />
    </div>
  );
}

// --- PORTAL COMERCIAL (Landing Centros) ---
const FUNCIONES_PANEL = [
  { titulo: 'Publicas tus cursos', texto: 'Con fechas, horas, plazas y a quién van dirigidos. Puedes pausarlos cuando se llenen.' },
  { titulo: 'Recibes las solicitudes', texto: 'Cada persona que pide plaza te llega con su nombre, teléfono, correo y el curso que quiere.' },
  { titulo: 'Contactas en un clic', texto: 'Abres WhatsApp o el correo con un mensaje ya escrito a partir de tus plantillas.' },
  { titulo: 'Apuntas cómo va cada una', texto: 'Llamado, interesado, matriculado o descartado, con tus notas guardadas en su ficha.' },
  { titulo: 'Trabajas con tu equipo', texto: 'Invitas a tus compañeros con su propia cuenta y eliges qué puede hacer cada uno.' },
  { titulo: 'Pones los cursos en tu web', texto: 'Copias un código y tus cursos salen también en la web de tu academia.' },
  { titulo: 'Sacas tus datos', texto: 'Descargas las solicitudes en un archivo CSV que se abre con Excel.' },
  { titulo: 'Ves qué funciona', texto: 'Visitas y solicitudes de cada curso, para saber cuáles necesitan más gente.' }
];

const PREGUNTAS_ACADEMIAS = [
  { pregunta: '¿Necesito tarjeta para probarlo?', respuesta: 'No. El primer mes es gratis y no se pide ningún dato de pago. Solo pones la tarjeta si decides seguir.' },
  { pregunta: '¿Qué pasa cuando termina el mes gratis?', respuesta: 'Eliges un plan desde tu panel y todo sigue igual. Si no lo haces, tus cursos dejan de mostrarse, pero tus datos se guardan por si decides volver.' },
  { pregunta: '¿Tiene permanencia?', respuesta: 'No. Se paga mes a mes y puedes darte de baja cuando quieras desde tu panel.' },
  { pregunta: '¿Quién ve las solicitudes?', respuesta: 'Solo tu academia. Entran tú y las personas de tu equipo a las que invites, cada una con su contraseña.' }
];

function LandingCentros() {
  useTitulo('Cursenda para academias · Recibe solicitudes para tus cursos');
  const { ajustes } = useAjustes();
  const [nombreCentro, setNombreCentro] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Si llega con /centros#acceso, baja hasta el formulario
  useEffect(() => {
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await fetch(`${API_BASE}/public/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_centro: nombreCentro, nombre_contacto: contacto, email, telefono, rgpd })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se ha podido enviar. Vuelve a intentarlo.');
      }
    } catch (err) {
      setError('No se ha podido enviar. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pub">
      <div className="pub-arriba">
        <header className="pub-barra">
          <Logo light={true} />
          <nav>
            <a href="#precios" className="pub-solo-ancho">Precios</a>
            <Link to="/" className="pub-solo-ancho">Ver los cursos</Link>
            <Link to="/centros/login">Entrar</Link>
          </nav>
        </header>
        <div className="pub-ancho pub-aca-portada">
          <h1>{ajustes.academias_titulo}</h1>
          <p>{ajustes.academias_texto}</p>
          <p className="pub-aca-acciones"><a href="#acceso" className="pub-boton pub-boton-pedir">Probar un mes gratis</a><Link to="/centros/login">Ya tengo cuenta</Link></p>
          <img className="pub-aca-panel" src="/images/panel-solicitudes.jpg" alt="Panel de Cursenda con la lista de solicitudes de plaza" width="1600" height="1000" />
        </div>
      </div>

      <section className="pub-ancho pub-aca-seccion" id="como-funciona">
        <h2 className="pub-titulo">Lo que puedes hacer en el panel</h2>
        <div className="pub-aca-funciones">
          {FUNCIONES_PANEL.map(f => (
            <div key={f.titulo}>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pub-aca-precios" id="precios">
        <div className="pub-ancho">
          <h2>Precios</h2>
          <p>El primer mes es gratis en cualquier plan. Los precios no incluyen IVA.</p>
          <div className="pub-aca-planes">
            <div>
              <h3>Starter</h3>
              <p className="pub-aca-precio">{ajustes.precio_starter} € <span>al mes</span></p>
              <p>Hasta 5 cursos activos a la vez.</p>
            </div>
            <div>
              <h3>Pro</h3>
              <p className="pub-aca-precio">{ajustes.precio_pro} € <span>al mes</span></p>
              <p>Cursos activos sin límite.</p>
            </div>
            <div>
              <h3>Varios centros</h3>
              <p className="pub-aca-precio">A medida</p>
              <p>Si tienes una red de centros, pide acceso y lo hablamos.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pub-ancho pub-aca-seccion pub-aca-final">
        <div>
          <h2 className="pub-titulo">Preguntas</h2>
          {PREGUNTAS_ACADEMIAS.map(p => (
            <details key={p.pregunta} className="pub-pregunta">
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </div>

        <div className="pub-pedir" id="acceso">
          {success ? (
            <div className="pub-gracias">
              <h2>Solicitud enviada</h2>
              <p>Te escribiremos a {email} para crear la cuenta de {nombreCentro}.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit}>
              <h2>Prueba un mes gratis</h2>
              <p>Déjanos tus datos y te enviamos un enlace para crear la cuenta de tu academia.</p>
              {error && <p className="pub-error" role="alert">{error}</p>}
              <label>Nombre de la academia<input required value={nombreCentro} onChange={(e) => setNombreCentro(e.target.value)} /></label>
              <label>Tu nombre<input required autoComplete="name" value={contacto} onChange={(e) => setContacto(e.target.value)} /></label>
              <label>Correo<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Teléfono<input required type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
              <label className="pub-rgpd">
                <input required type="checkbox" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} />
                <span>Acepto que Cursenda use estos datos para contactarme (<Link to="/legal/privacidad" target="_blank">política de privacidad</Link>).</span>
              </label>
              <button type="submit" className="pub-boton pub-boton-pedir" disabled={enviando}>{enviando ? 'Enviando...' : 'Pedir acceso'}</button>
            </form>
          )}
        </div>
      </section>
      <PiePublico />
    </div>
  );
}

// --- PORTAL COMERCIAL: LOGIN ---
function LoginCentros({ onLogin }: { onLogin: (user: any) => void }) {
  useTitulo('Entrar al panel · Cursenda');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Rellena el correo y la contraseña.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        onLogin(data);
        navigate('/centros/dashboard');
      } else {
        setError(data.error || 'No se ha podido entrar.');
      }
    } catch (err) {
      setError('Error de red. Inténtelo de nuevo.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 className="auth-title">Entrar al panel</h2>
        <p className="auth-subtitle">Para academias que publican sus cursos en Cursenda.</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input 
              type="email" 
              className="form-control" 
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Entrar</button>
        </form>

        <div className="auth-links">
          <Link to="/centros/recuperar" className="auth-link">He olvidado mi contraseña</Link>
          <Link to="/centros#acceso" className="auth-link">Aún no tengo cuenta</Link>
        </div>
      </div>
    </div>
  );
}

// --- PORTAL COMERCIAL: RECUPERAR / ACTIVAR ---
function RecuperarCentros() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Campos recuperación estándar
  const [email, setEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  // Campos activación invitación
  const [nombreCentro, setNombreCentro] = useState('');
  const [password, setPassword] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);


  const [recoveryError, setRecoveryError] = useState('');

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!email) return;

    try {
      const res = await fetch(`${API_BASE}/auth/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setRecoverySent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setRecoveryError(data.error || 'No se pudo enviar la petición. Inténtelo de nuevo.');
      }
    } catch (err) {
      setRecoveryError('Error de red. Inténtelo de nuevo.');
    }
  };

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');

    if (!nombreCentro.trim() || !password.trim()) {
      setActivationError('El nombre del centro y la contraseña son obligatorios.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          nombre: nombreCentro,
          password,
          nombre_contacto: contacto,
          telefono
        })
      });
      const data = await res.json();

      if (res.ok) {
        setActivationSuccess(true);
        setTimeout(() => {
          window.location.href = '/centros/dashboard';
        }, 2000);
      } else {
        setActivationError(data.error || 'Error al activar la cuenta');
      }
    } catch (err) {
      setActivationError('Error de red. Inténtelo de nuevo.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>

        {token ? (
          // Vista activación de cuenta por invitación
          <div>
            <h2 className="auth-title">Activa tu cuenta</h2>
            <p className="auth-subtitle">Pon los datos de tu academia para entrar al panel.</p>

            {activationSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--primary)' }}>Cuenta activada</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Te llevamos a tu panel...</p>
              </div>
            ) : (
              <form onSubmit={handleActivationSubmit}>
                {activationError && (
                  <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    {activationError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nombre del centro *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: Aula Central"
                    value={nombreCentro}
                    onChange={(e) => setNombreCentro(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña de acceso *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Contraseña segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre de contacto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Persona encargada"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Teléfono del centro</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Ej: 910000000"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Activar cuenta y acceder</button>
              </form>
            )}
          </div>
        ) : (
          // Vista recuperación contraseña estándar
          <div>
            <h2 className="auth-title">Recuperar la contraseña</h2>
            
            {recoverySent ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--primary)' }}>Petición recibida</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Si el correo está registrado, te enviaremos un enlace para crear una contraseña nueva.</p>
                <Link to="/centros/login" className="btn btn-secondary btn-sm" style={{ marginTop: '1.5rem' }}>Volver a entrar</Link>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit}>
                <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>Escribe tu correo y te mandaremos un enlace para crear una contraseña nueva.</p>

                {recoveryError && (
                  <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    {recoveryError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Correo electrónico</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Pedir enlace</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- PÁGINAS LEGALES ---
// Datos del titular de la web. Lo que esté vacío no se muestra.
// Hay que rellenarlos antes de empezar a cobrar.

function LegalPage({ tipo }: { tipo: 'aviso-legal' | 'privacidad' | 'cookies' }) {
  const { ajustes } = useAjustes();
  const d = { titular: ajustes.legal_titular, nif: ajustes.legal_nif, domicilio: ajustes.legal_domicilio, email: ajustes.legal_email, dominio: 'cursenda.es', actualizado: ajustes.legal_actualizado };
  const titulos = { 'aviso-legal': 'Aviso legal', privacidad: 'Política de privacidad', cookies: 'Política de cookies' };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${titulos[tipo]} · Cursenda`;
  }, [tipo]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', backgroundColor: 'var(--white)', borderBottom: '1px solid var(--lines)' }}>
        <Logo />
        <Link to="/" className="btn btn-secondary btn-sm">← Volver</Link>
      </nav>
      <article className="legal-page">
        <h1>{titulos[tipo]}</h1>
        <p className="legal-updated">Última actualización: {d.actualizado}</p>

        {tipo === 'aviso-legal' && (
          <>
            <h2>Titular de la web</h2>
            {d.titular ? (
              <>
                <p>En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE), estos son los datos del titular de {d.dominio}:</p>
                <ul>
                  <li><strong>Titular:</strong> {d.titular}</li>
                  {d.nif && <li><strong>NIF:</strong> {d.nif}</li>}
                  {d.domicilio && <li><strong>Domicilio:</strong> {d.domicilio}</li>}
                  <li><strong>Email:</strong> {d.email}</li>
                </ul>
              </>
            ) : (
              <p>Cursenda es un proyecto en fase de pruebas. Los datos completos del titular se publicarán aquí antes de empezar a ofrecer servicios de pago. Mientras tanto, puede escribirnos a <strong>{d.email}</strong>.</p>
            )}
            <h2>Qué es Cursenda</h2>
            <p>Cursenda es un buscador independiente de cursos subvencionados. No imparte formación ni concede las subvenciones: los cursos los publican y gestionan los centros de formación, que son los responsables de su contenido, de los requisitos de acceso y de la matrícula.</p>
            <p>Cursenda no es un organismo público ni está vinculado al SEPE ni a las comunidades autónomas.</p>
            <h2>Uso de la web</h2>
            <p>Quien use esta web se compromete a dar datos verdaderos y a no usarla para fines ilícitos o que puedan dañar el servicio o a terceros.</p>
            <h2>Responsabilidad</h2>
            <p>Intentamos que la información de los cursos sea correcta, pero la publica cada centro. Ante cualquier duda sobre un curso, plazas o requisitos, consulte directamente con el centro.</p>
            <h2>Propiedad intelectual</h2>
            <p>El diseño, los textos y el código de la web pertenecen a su titular. Las fotografías son de Unsplash y se usan según su licencia.</p>
            <h2>Ley aplicable</h2>
            <p>Esta web se rige por la legislación española.</p>
          </>
        )}

        {tipo === 'privacidad' && (
          <>
            <h2>Quién trata sus datos</h2>
            <p>
              {d.titular ? <><strong>{d.titular}</strong>{d.nif && `, con NIF ${d.nif}`}{d.domicilio && ` y domicilio en ${d.domicilio}`}.</> : 'El responsable del proyecto Cursenda.'}
              {' '}Puede escribirnos a <strong>{d.email}</strong>.
            </p>

            <h2>Qué datos recogemos y para qué</h2>
            <ul>
              <li><strong>Si pide plaza en un curso:</strong> nombre, email y teléfono. Los usamos para hacérselos llegar al centro que imparte el curso, que se pondrá en contacto con usted. A partir de ese momento el centro también es responsable del tratamiento de sus datos para gestionar su matrícula.</li>
              <li><strong>Si es una academia y pide acceso:</strong> nombre del centro, persona de contacto, email y teléfono, para contactarle y enseñarle la plataforma.</li>
              <li><strong>Si tiene cuenta de centro:</strong> los datos de su cuenta y de su equipo, para darle acceso al panel y prestarle el servicio.</li>
            </ul>

            <h2>Base legal</h2>
            <p>Su consentimiento, que da al marcar la casilla del formulario, y en el caso de los centros con cuenta, el contrato del servicio. Puede retirar su consentimiento cuando quiera.</p>

            <h2>Cuánto tiempo los guardamos</h2>
            <p>Las solicitudes de plaza se guardan mientras el centro las necesite para gestionar la matrícula y, como máximo, 2 años. Las solicitudes de demo, hasta 1 año si no se contrata el servicio. Los datos de cuentas, mientras la cuenta esté activa.</p>

            <h2>Quién más los ve</h2>
            <p>Si pide plaza, el centro de formación del curso. Si una academia contrata un plan, el pago lo gestiona Stripe, que recibe los datos de facturación y de la tarjeta. No vendemos datos ni los usamos para publicidad. La web está alojada en un servidor propio en la Unión Europea.</p>

            <h2>Sus derechos</h2>
            <p>Puede pedir ver, corregir o borrar sus datos, oponerse a su uso, limitarlo o llevárselos a otro sitio escribiendo a {d.email}. Si cree que no los tratamos bien, puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p>

            <h2>Seguridad</h2>
            <p>Los datos viajan cifrados, las contraseñas se guardan cifradas y las copias de seguridad también lo están.</p>
          </>
        )}

        {tipo === 'cookies' && (
          <>
            <h2>Qué cookies usamos</h2>
            <p>Esta web solo usa una cookie técnica, necesaria para que los centros puedan entrar en su panel:</p>
            <ul>
              <li><strong>token</strong>: mantiene la sesión iniciada. Dura 1 día. Solo se crea si inicia sesión.</li>
            </ul>
            <p>Las cookies técnicas no necesitan su consentimiento. No usamos cookies de publicidad ni de analítica.</p>

            <h2>Servicios de terceros</h2>
            <p>En las fichas de los cursos puede ver la ubicación en Google Maps. El mapa no se carga hasta que pulsa "Ver mapa"; si lo hace, Google puede usar sus propias cookies según su política de privacidad.</p>
            <p>Las fuentes y las fotografías se sirven desde nuestro propio servidor, sin servicios de terceros.</p>

            <h2>Cómo borrarlas</h2>
            <p>Puede borrar las cookies desde la configuración de su navegador o cerrando sesión en el panel.</p>
          </>
        )}
      </article>
    </div>
  );
}

// --- PÁGINA NO ENCONTRADA ---
function NoEncontrada() {
  useTitulo('Página no encontrada · Cursenda');
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 className="auth-title">No encontramos esta página</h2>
        <p className="auth-subtitle">El enlace está mal o el curso ya no está publicado.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link to="/cursos" className="btn btn-primary btn-sm">Ver los cursos</Link>
          <Link to="/centros" className="btn btn-secondary btn-sm">Soy una academia</Link>
        </div>
      </div>
    </div>
  );
}

// --- PORTAL COMERCIAL: CONTRASEÑA NUEVA CON ENLACE ---
function RestablecerCentros() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [valido, setValido] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState(false);

  useEffect(() => {
    if (!token) { setValido(false); return; }
    fetch(`${API_BASE}/auth/restablecer/${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setValido(!!d.valido))
      .catch(() => setValido(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }

    try {
      const res = await fetch(`${API_BASE}/auth/restablecer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setHecho(true);
      else setError(data.error || 'No se pudo cambiar la contraseña.');
    } catch (err) {
      setError('Error de red. Inténtelo de nuevo.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 className="auth-title">Contraseña nueva</h2>

        {valido === null && <p className="auth-subtitle">Comprobando el enlace...</p>}

        {valido === false && (
          <div style={{ textAlign: 'center' }}>
            <p className="auth-subtitle">Este enlace no es válido o ya ha caducado.</p>
            <Link to="/centros/recuperar" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>Pedir otro enlace</Link>
          </div>
        )}

        {valido && hecho && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
            <h4 style={{ color: 'var(--primary)' }}>Contraseña cambiada</h4>
            <Link to="/centros/login" className="btn btn-primary btn-sm" style={{ marginTop: '1.5rem' }}>Iniciar sesión</Link>
          </div>
        )}

        {valido && !hecho && (
          <form onSubmit={handleSubmit}>
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>Elige una contraseña de al menos 8 caracteres.</p>
            {error && (
              <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{error}</div>
            )}
            <div className="form-group">
              <label className="form-label">Contraseña nueva</label>
              <input type="password" className="form-control" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Repite la contraseña</label>
              <input type="password" className="form-control" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Guardar contraseña</button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- PORTAL COMERCIAL: UNIRSE AL EQUIPO DE UN CENTRO ---
function UnirseCentros({ onLogin }: { onLogin: (user: any) => void }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [invitacion, setInvitacion] = useState<any>(undefined);
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setInvitacion(null); return; }
    fetch(`${API_BASE}/auth/invitacion-miembro/${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setInvitacion(d))
      .catch(() => setInvitacion(null));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) { setError('Escribe tu nombre.'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }

    try {
      const res = await fetch(`${API_BASE}/auth/activar-miembro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nombre, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onLogin(data);
        navigate('/centros/dashboard');
      } else {
        setError(data.error || 'No se pudo activar la cuenta.');
      }
    } catch (err) {
      setError('Error de red. Inténtelo de nuevo.');
    }
  };

  const rolTexto = invitacion?.rol === 'colaborador' ? 'Colaborador' : 'Gestor';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Logo />
        </div>
        <h2 className="auth-title">Unirse al equipo</h2>

        {invitacion === undefined && <p className="auth-subtitle">Comprobando la invitación...</p>}

        {invitacion === null && (
          <div style={{ textAlign: 'center' }}>
            <p className="auth-subtitle">Esta invitación no es válida o ya ha caducado. Pide a la persona responsable de tu academia que te envíe otra.</p>
          </div>
        )}

        {invitacion && (
          <form onSubmit={handleSubmit}>
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
              Le han invitado a <strong>{invitacion.centro_nombre}</strong> como <strong>{rolTexto}</strong>. Su usuario será <strong>{invitacion.email}</strong>.
            </p>
            {error && (
              <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{error}</div>
            )}
            <div className="form-group">
              <label className="form-label">Tu nombre</label>
              <input type="text" className="form-control" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Contraseña (mínimo 8 caracteres)</label>
              <input type="password" className="form-control" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crear mi cuenta</button>
          </form>
        )}
      </div>
    </div>
  );
}

// SQLite guarda las fechas en UTC sin zona ("2026-10-29 10:00:00")
const parseFecha = (valor: string) => {
  if (!valor) return new Date(NaN);
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor) ? new Date(valor.replace(' ', 'T') + 'Z') : new Date(valor);
};

const formatFechaHora = (valor: string) => {
  const d = parseFecha(valor);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
};

// "hace 5 min", "hace 3 h", "hace 2 días"...
const haceCuanto = (valor: string) => {
  const d = parseFecha(valor);
  if (isNaN(d.getTime())) return '';
  const min = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return `el ${d.toLocaleDateString('es-ES')}`;
};

// Planes (los mismos precios que en la página para centros)
const planesCon = (ajustes: Ajustes) => [
  { id: 'starter', nombre: 'Starter', precio: `${ajustes.precio_starter} € / mes + IVA`, descripcion: 'Hasta 5 cursos activos a la vez.' },
  { id: 'pro', nombre: 'Pro', precio: `${ajustes.precio_pro} € / mes + IVA`, descripcion: 'Cursos activos sin límite.' },
  { id: 'custom', nombre: 'Custom', precio: 'A medida', descripcion: 'Para redes de varios centros.' }
];

const textoEstadoSuscripcion = (centro: any, pagos?: any) => {
  const estado = centro?.suscripcion_estado;
  if (estado === 'activa') return 'Activa';
  if (estado === 'impago') return 'Pago pendiente: revisa tu tarjeta';
  if (estado === 'cancelada') return 'Cancelada';
  if (estado === 'prueba') {
    if (!centro?.acceso) return 'Prueba terminada';
    const dias = pagos?.dias_prueba;
    return dias !== undefined ? `Prueba gratis: ${dias} ${dias === 1 ? 'día' : 'días'} restantes` : 'Prueba gratis';
  }
  return 'Sin suscripción';
};

// Aviso arriba del panel: días de prueba que quedan o prueba terminada
function AvisoSuscripcion({ user, pagos, esPropietario, onIrAPlan, enPlan }: { user: any; pagos: any; esPropietario: boolean; onIrAPlan: () => void; enPlan: boolean }) {
  if (!user || user.rol === 'admin') return null;

  if (!user.acceso) {
    return (
      <div className="alert-box alert-error" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}>
          <strong>Tu mes de prueba ha terminado.</strong>{' '}
          {esPropietario
            ? 'Tus cursos no se muestran en la web y el panel queda bloqueado hasta que contrates un plan. Tus datos siguen guardados.'
            : 'Pide a la persona responsable de tu academia que contrate un plan para seguir usando Cursenda.'}
        </span>
              </div>
    );
  }

  if (user.suscripcion_estado === 'impago' && esPropietario) {
    return (
      <div className="alert-box alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}><strong>No hemos podido cobrar tu suscripción.</strong> Revisa tu tarjeta para no perder el acceso.</span>
        {!enPlan && <button type="button" className="btn btn-primary btn-sm" onClick={onIrAPlan}>Revisar pago</button>}
      </div>
    );
  }

  if (user.suscripcion_estado === 'prueba' && !user.tiene_suscripcion && esPropietario && pagos && pagos.dias_prueba <= 7) {
    return (
      <div className="alert-box alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}>
          Te {pagos.dias_prueba === 1 ? 'queda 1 día' : `quedan ${pagos.dias_prueba} días`} de prueba gratis. Elige un plan para que tus cursos sigan en la web.
        </span>
        {!enPlan && <button type="button" className="btn btn-primary btn-sm" onClick={onIrAPlan}>Ver planes</button>}
      </div>
    );
  }

  return null;
}

// Ventana para copiar un enlace (invitaciones, contraseña nueva)
function EnlaceModal({ titulo, texto, enlace, onClose }: { titulo: string; texto: string; enlace: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch (err) {
      setCopiado(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 59, 51, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '520px', border: '1px solid var(--lines)', padding: '1.75rem', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--primary)' }}>{titulo}</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{texto}</p>
        <input className="form-control" readOnly value={enlace} onFocus={(e) => e.target.select()} style={{ fontSize: '0.8125rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar enlace'}</button>
        </div>
      </div>
    </div>
  );
}

const getInitials = (nombre: string) => {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

const getAvatarBg = (nombre: string) => {
  const charCode = nombre.charCodeAt(0) || 0;
  const colors = ['#0C3B33', '#082A24', '#C9962E', '#2E5C53', '#5E3E0C'];
  return colors[charCode % colors.length];
};

function DashboardAdmin({ onLogout }: { user: any; onLogout: () => void }) {
  const { ajustes, setAjustes } = useAjustes();
  const [formAjustes, setFormAjustes] = useState<Ajustes>(ajustes);
  const [ajustesEstado, setAjustesEstado] = useState('');
  useEffect(() => { setFormAjustes(ajustes); }, [ajustes]);
  const [tab, setTab] = useState<'inicio' | 'academias' | 'cursos' | 'solicitudes' | 'demos' | 'recuperaciones' | 'ajustes'>('inicio');
  const [academias, setAcademias] = useState<any[]>([]);
  const [demos, setDemos] = useState<any[]>([]);
  const [recuperaciones, setRecuperaciones] = useState<any[]>([]);
  const [enlaceGenerado, setEnlaceGenerado] = useState<{ para: string; enlace: string } | null>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal Academias
  const [showAcademiaModal, setShowAcademiaModal] = useState(false);
  const [selectedAcademia, setSelectedAcademia] = useState<any>(null);
  const [formAcademiaNombre, setFormAcademiaNombre] = useState('');
  const [formAcademiaEmail, setFormAcademiaEmail] = useState('');
  const [formAcademiaPlan, setFormAcademiaPlan] = useState('starter');
  const [formAcademiaContacto, setFormAcademiaContacto] = useState('');
  const [formAcademiaTelefono, setFormAcademiaTelefono] = useState('');
  const [formAcademiaError, setFormAcademiaError] = useState('');

  // Modal Curso (Moderación)
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<any>(null);
  const [formCursoTitulo, setFormCursoTitulo] = useState('');
  const [formCursoCategoria, setFormCursoCategoria] = useState('Informática');
  const [formCursoModalidad, setFormCursoModalidad] = useState('Online');
  const [formCursoLocalidad, setFormCursoLocalidad] = useState('');
  const [formCursoDuracion, setFormCursoDuracion] = useState('');
  const [formCursoPlazas, setFormCursoPlazas] = useState('');
  const [formCursoPlazasCubiertas, setFormCursoPlazasCubiertas] = useState('');
  const [formCursoFechaInicio, setFormCursoFechaInicio] = useState('');
  const [formCursoDirigidoA, setFormCursoDirigidoA] = useState('Todos');
  const [formCursoDescripcion, setFormCursoDescripcion] = useState('');
  const [formCursoEstado, setFormCursoEstado] = useState('publicado');
  const [formCursoError, setFormCursoError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar centros
      const resC = await fetch(`${API_BASE}/admin/centros`);
      const dataC = await resC.json();
      if (resC.ok) setAcademias(dataC);

      // Cargar cursos
      const resK = await fetch(`${API_BASE}/admin/cursos`);
      const dataK = await resK.json();
      if (resK.ok) setCursos(dataK);

      // Cargar solicitudes
      const resS = await fetch(`${API_BASE}/admin/solicitudes`);
      const dataS = await resS.json();
      if (resS.ok) setSolicitudes(dataS);

      // Peticiones de demo y de recuperar contraseña
      const resD = await fetch(`${API_BASE}/admin/demos`);
      if (resD.ok) setDemos(await resD.json());
      const resR = await fetch(`${API_BASE}/admin/recuperaciones`);
      if (resR.ok) setRecuperaciones(await resR.json());

    } catch (err) {
      console.error(err);
      setError('Error al cargar datos del panel de administrador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEstadoDemo = async (id: number, estado: string) => {
    const res = await fetch(`${API_BASE}/admin/demos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    if (res.ok) setDemos(demos.map(d => d.id === id ? { ...d, estado } : d));
  };

  const handleEnlaceRecuperacion = async (url: string, para: string, peticionId?: number) => {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se pudo crear el enlace');
      return;
    }
    setEnlaceGenerado({ para, enlace: data.enlace });
    if (peticionId) setRecuperaciones(recuperaciones.map(r => r.id === peticionId ? { ...r, atendida: 1 } : r));
  };

  const handleReiniciarDemo = async () => {
    if (!window.confirm('¿Dejar la cuenta demo como nueva? Se borra lo que se haya cambiado en ella y se cargan los datos de ejemplo.')) return;
    const res = await fetch(`${API_BASE}/admin/reiniciar-demo`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se pudo reiniciar la demo');
      return;
    }
    alert('Demo reiniciada. Ya puedes enseñarla.');
    loadData();
  };

  const handleAmpliarPrueba = async (ac: any) => {
    if (!window.confirm(`¿Dar 30 días más de prueba gratis a ${ac.nombre}?`)) return;
    const res = await fetch(`${API_BASE}/admin/centros/${ac.id}/ampliar-prueba`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dias: 30 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se pudo ampliar la prueba');
      return;
    }
    setAcademias(academias.map(a => a.id === ac.id ? { ...a, ...data } : a));
  };

  const handleDescartarRecuperacion = async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/recuperaciones/${id}/descartar`, { method: 'POST' });
    if (res.ok) setRecuperaciones(recuperaciones.map(r => r.id === id ? { ...r, atendida: 1 } : r));
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
      onLogout();
      navigate('/centros/login');
    } catch (err) {
      console.error(err);
    }
  };

  // Crear/Editar Academia
  // Deja pasar el mes gratis desde la petición del formulario y da el enlace para enviárselo
  const handleGuardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    setAjustesEstado('');
    const { legal_actualizado, ...cambios } = formAjustes;
    try {
      const res = await fetch(`${API_BASE}/admin/ajustes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAjustesEstado(data.error || 'No se han podido guardar los cambios.');
        return;
      }
      setAjustes({ ...AJUSTES_INICIALES, ...data });
      setAjustesEstado('guardado');
    } catch (err) {
      setAjustesEstado('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const campoAjuste = (clave: keyof Ajustes, etiqueta: string, largo = false) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`aj-${clave}`}>{etiqueta}</label>
      {largo
        ? <textarea id={`aj-${clave}`} rows={3} className="form-control" value={formAjustes[clave]} onChange={(e) => setFormAjustes({ ...formAjustes, [clave]: e.target.value })} />
        : <input id={`aj-${clave}`} className="form-control" value={formAjustes[clave]} onChange={(e) => setFormAjustes({ ...formAjustes, [clave]: e.target.value })} />}
    </div>
  );

  const handleCrearCuentaDemo = async (d: any) => {
    if (!window.confirm(`¿Crear la cuenta de ${d.nombre_centro}? Empieza hoy su mes gratis.`)) return;
    const res = await fetch(`${API_BASE}/admin/demos/${d.id}/crear-cuenta`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se ha podido crear la cuenta');
      return;
    }
    setEnlaceGenerado({ para: d.email, enlace: data.enlace });
    loadData();
  };

  const handleEstadoCurso = async (c: any) => {
    const res = await fetch(`${API_BASE}/admin/cursos/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, estado: c.estado === 'publicado' ? 'pausado' : 'publicado' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se ha podido cambiar el curso');
      return;
    }
    loadData();
  };

  const handleDeleteSolicitud = async (s: any) => {
    if (!window.confirm(`¿Eliminar la solicitud de ${s.nombre}? No se puede deshacer.`)) return;
    const res = await fetch(`${API_BASE}/admin/solicitudes/${s.id}`, { method: 'DELETE' });
    if (res.ok) setSolicitudes(solicitudes.filter(x => x.id !== s.id));
    else alert('No se ha podido eliminar la solicitud');
  };

  const handleOpenAcademiaModal = (ac?: any) => {
    setSelectedAcademia(ac || null);
    if (ac) {
      setFormAcademiaNombre(ac.nombre);
      setFormAcademiaEmail(ac.email);
      setFormAcademiaPlan(ac.plan);
      setFormAcademiaContacto(ac.nombre_contacto || '');
      setFormAcademiaTelefono(ac.telefono || '');
    } else {
      setFormAcademiaNombre('');
      setFormAcademiaEmail('');
      setFormAcademiaPlan('starter');
      setFormAcademiaContacto('');
      setFormAcademiaTelefono('');
    }
    setFormAcademiaError('');
    setShowAcademiaModal(true);
  };

  const handleSaveAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAcademiaError('');

    const payload: any = {
      nombre: formAcademiaNombre,
      email: formAcademiaEmail,
      plan: formAcademiaPlan,
      nombre_contacto: formAcademiaContacto,
      telefono: formAcademiaTelefono
    };
    try {
      const url = selectedAcademia ? `${API_BASE}/admin/centros/${selectedAcademia.id}` : `${API_BASE}/admin/centros`;
      const method = selectedAcademia ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const guardada = await res.json().catch(() => ({}));
        setShowAcademiaModal(false);
        if (!selectedAcademia && guardada.id) await handleEnlaceRecuperacion(`${API_BASE}/admin/centros/${guardada.id}/enlace-recuperacion`, guardada.email);
        loadData();
      } else {
        const errData = await res.json();
        setFormAcademiaError(errData.error || 'Error al guardar la academia');
      }
    } catch (err) {
      setFormAcademiaError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleDeleteAcademia = async (id: number) => {
    if (!window.confirm('¿Eliminar esta academia con todos sus cursos y solicitudes? No se puede deshacer.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/centros/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar la academia');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Abrir Moderación de Curso
  const handleOpenCursoModal = (c: any) => {
    setSelectedCurso(c);
    setFormCursoTitulo(c.titulo);
    setFormCursoCategoria(c.categoria);
    setFormCursoModalidad(c.modalidad);
    setFormCursoLocalidad(c.localidad);
    setFormCursoDuracion(c.duracion_horas.toString());
    setFormCursoPlazas(c.plazas.toString());
    setFormCursoPlazasCubiertas(c.plazas_cubiertas.toString());
    setFormCursoFechaInicio(c.fecha_inicio);
    setFormCursoDirigidoA(c.dirigido_a);
    setFormCursoDescripcion(c.descripcion);
    setFormCursoEstado(c.estado);
    setFormCursoError('');
    setShowCursoModal(true);
  };

  const handleSaveCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormCursoError('');

    if (!formCursoTitulo || !formCursoLocalidad || !formCursoDuracion || !formCursoPlazas || !formCursoFechaInicio || !formCursoDescripcion) {
      setFormCursoError('Todos los campos son obligatorios.');
      return;
    }

    const payload = {
      titulo: formCursoTitulo,
      categoria: formCursoCategoria,
      modalidad: formCursoModalidad,
      localidad: formCursoLocalidad,
      duracion_horas: parseInt(formCursoDuracion),
      plazas: parseInt(formCursoPlazas),
      plazas_cubiertas: parseInt(formCursoPlazasCubiertas || '0'),
      fecha_inicio: formCursoFechaInicio,
      dirigido_a: formCursoDirigidoA,
      descripcion: formCursoDescripcion,
      estado: formCursoEstado
    };

    try {
      const res = await fetch(`${API_BASE}/admin/cursos/${selectedCurso.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCursoModal(false);
        loadData();
      } else {
        const errData = await res.json();
        setFormCursoError(errData.error || 'Error al guardar el curso');
      }
    } catch (err) {
      setFormCursoError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleDeleteCurso = async (id: number) => {
    if (!window.confirm('¿Eliminar este curso y sus solicitudes? No se puede deshacer.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/cursos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar el curso');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Datos para las pantallas
  const academiasReales = academias.filter(a => a.rol !== 'admin');
  const totalCursosPublicados = cursos.filter(c => c.estado === 'publicado').length;
  const academiasPagando = academiasReales.filter(a => a.suscripcion_estado === 'activa');
  // Sin IVA. Custom es a medida y no se suma.
  const ingresosMes = academiasPagando.reduce((suma, a) => suma + (a.plan === 'pro' ? Number(ajustes.precio_pro) : a.plan === 'starter' ? Number(ajustes.precio_starter) : 0), 0);
  const demosNuevas = demos.filter(d => (d.estado || 'nueva') === 'nueva');
  const recuperacionesPendientes = recuperaciones.filter(r => !r.atendida);
  const diasDePrueba = (a: any) => {
    const fin = parseFecha(a.prueba_hasta);
    return fin ? Math.ceil((fin.getTime() - Date.now()) / 86400000) : 0;
  };
  const enPrueba = (a: any) => a.suscripcion_estado === 'prueba' && !a.es_demo;
  const pruebasAcabando = academiasReales.filter(a => enPrueba(a) && diasDePrueba(a) > 0 && diasDePrueba(a) <= 7);
  const pruebasTerminadas = academiasReales.filter(a => enPrueba(a) && diasDePrueba(a) <= 0);

  const contiene = (texto: string, ...campos: any[]) => {
    const limpio = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return !texto.trim() || campos.some(c => limpio(c).includes(limpio(texto.trim())));
  };
  const academiasVistas = academiasReales.filter(a => contiene(busqueda, a.nombre, a.email, a.nombre_contacto, a.telefono));
  const cursosVistos = cursos.filter(c => contiene(busqueda, c.titulo, c.centro_nombre, c.localidad, c.categoria));
  const solicitudesVistas = solicitudes.filter(s => contiene(busqueda, s.nombre, s.email, s.telefono, s.curso_titulo, s.centro_nombre));

  const irA = (destino: typeof tab) => { setTab(destino); setBusqueda(''); };
  const estadoAcademia = (a: any) => {
    if (a.es_demo) return 'Cuenta demo';
    if (enPrueba(a)) {
      const dias = diasDePrueba(a);
      return dias > 0 ? `Prueba: ${dias === 1 ? 'queda 1 día' : `quedan ${dias} días`}` : 'Prueba terminada';
    }
    return textoEstadoSuscripcion(a);
  };

  const pendientes = [
    ...demosNuevas.map(d => ({ clave: `d${d.id}`, texto: `${d.nombre_centro} ha pedido acceso`, destino: 'demos' as const })),
    ...recuperacionesPendientes.map(r => ({ clave: `r${r.id}`, texto: `${r.email} necesita una contraseña nueva`, destino: 'recuperaciones' as const })),
    ...pruebasAcabando.map(a => ({ clave: `a${a.id}`, texto: `A ${a.nombre} le ${diasDePrueba(a) === 1 ? 'queda 1 día' : `quedan ${diasDePrueba(a)} días`} de prueba`, destino: 'academias' as const })),
    ...pruebasTerminadas.map(a => ({ clave: `t${a.id}`, texto: `${a.nombre} ha terminado la prueba y no ha contratado`, destino: 'academias' as const }))
  ];

  const MENU: { id: typeof tab; texto: string; icono: React.ReactNode; aviso?: number }[] = [
    { id: 'inicio', texto: 'Resumen', icono: <BarChart3 size={18} /> },
    { id: 'academias', texto: 'Academias', icono: <Building size={18} /> },
    { id: 'cursos', texto: 'Cursos', icono: <BookOpen size={18} /> },
    { id: 'solicitudes', texto: 'Solicitudes', icono: <Users size={18} /> },
    { id: 'demos', texto: 'Peticiones de acceso', icono: <Mail size={18} />, aviso: demosNuevas.length },
    { id: 'recuperaciones', texto: 'Contraseñas', icono: <Shield size={18} />, aviso: recuperacionesPendientes.length },
    { id: 'ajustes', texto: 'Textos y datos', icono: <Settings size={18} /> }
  ];

  return (
    <div className="dashboard-layout admin">
      <aside className="sidebar">
        <div>
          <Logo light={true} />
          <ul className="nav-menu">
            {MENU.map(m => (
              <li key={m.id} className={`nav-item ${tab === m.id ? 'active' : ''}`}>
                <button type="button" onClick={() => irA(m.id)}>
                  {m.icono}
                  <span>{m.texto}</span>
                  {!!m.aviso && <span className="nav-badge">{m.aviso}</span>}
                </button>
              </li>
            ))}
            <li className="nav-item">
              <a href="/" target="_blank" rel="noopener"><Globe size={18} /><span>Ver la web</span></a>
            </li>
          </ul>
        </div>
        <button type="button" onClick={handleLogout} className="btn-logout"><X size={16} /><span>Cerrar sesión</span></button>
      </aside>

      <main className="dashboard-content">
        {loading ? <p>Cargando...</p> : error ? <div className="alert-box alert-error" role="alert">{error}</div> : (
          <>
            {tab === 'inicio' && (
              <div>
                <h1 className="admin-titulo">Resumen</h1>
                <div className="admin-cifras">
                  <button type="button" onClick={() => irA('academias')}><span>Academias, sin la demo</span><strong>{academiasReales.filter(a => !a.es_demo).length}</strong></button>
                  <button type="button" onClick={() => irA('academias')}><span>Pagando</span><strong>{academiasPagando.length}</strong></button>
                  <div><span>Ingresos al mes, sin IVA</span><strong>{ingresosMes} €</strong></div>
                  <button type="button" onClick={() => irA('cursos')}><span>Cursos publicados</span><strong>{totalCursosPublicados}</strong></button>
                  <button type="button" onClick={() => irA('solicitudes')}><span>Solicitudes</span><strong>{solicitudes.length}</strong></button>
                </div>
                <div className="admin-columnas">
                  <section>
                    <h2>Por hacer</h2>
                    {pendientes.length === 0 ? <p className="admin-vacio">No tienes nada pendiente.</p> : (
                      <ul className="admin-pendientes">
                        {pendientes.map(p => <li key={p.clave}><button type="button" onClick={() => irA(p.destino)}>{p.texto}</button></li>)}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h2>Cuenta demo</h2>
                    <p className="admin-vacio">Se pone como nueva sola cada noche a las 4:00. Reiníciala antes de enseñarla en una academia.</p>
                    <button type="button" onClick={handleReiniciarDemo} className="btn btn-secondary btn-sm">Reiniciar demo</button>
                  </section>
                </div>
              </div>
            )}

            {tab === 'academias' && (
              <div>
                <div className="admin-cabecera">
                  <h1 className="admin-titulo">Academias</h1>
                  <input className="form-control" aria-label="Buscar academia" placeholder="Buscar academia" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  <button type="button" onClick={() => handleOpenAcademiaModal()} className="btn btn-primary"><Plus size={16} /><span>Nueva academia</span></button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Academia</th><th>Contacto</th><th>Plan</th><th>Situación</th><th></th></tr></thead>
                    <tbody>
                      {academiasVistas.map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.nombre}</strong><div className="admin-dato">{a.email}</div></td>
                          <td>{a.nombre_contacto || 'Sin nombre'}<div className="admin-dato">{a.telefono || 'Sin teléfono'}</div></td>
                          <td style={{ textTransform: 'capitalize' }}>{a.plan}</td>
                          <td>{estadoAcademia(a)}</td>
                          <td>
                            <div className="admin-acciones">
                              <button type="button" onClick={() => handleOpenAcademiaModal(a)} className="btn btn-secondary btn-sm">Editar</button>
                              <button type="button" onClick={() => handleEnlaceRecuperacion(`${API_BASE}/admin/centros/${a.id}/enlace-recuperacion`, a.email)} className="btn btn-secondary btn-sm">Enlace de contraseña</button>
                              {enPrueba(a) && <button type="button" onClick={() => handleAmpliarPrueba(a)} className="btn btn-secondary btn-sm">30 días más</button>}
                              {!a.es_demo && <button type="button" onClick={() => handleDeleteAcademia(a.id)} className="btn btn-secondary btn-sm admin-borrar">Eliminar</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {academiasVistas.length === 0 && <tr><td colSpan={5} className="admin-vacio">No hay academias.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'cursos' && (
              <div>
                <div className="admin-cabecera">
                  <h1 className="admin-titulo">Cursos</h1>
                  <input className="form-control" aria-label="Buscar curso" placeholder="Buscar curso o academia" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Curso</th><th>Dónde</th><th>Plazas libres</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {cursosVistos.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.titulo}</strong><div className="admin-dato">{c.centro_nombre}</div></td>
                          <td>{c.modalidad}<div className="admin-dato">{c.localidad}</div></td>
                          <td>{Math.max(0, c.plazas - c.plazas_cubiertas)} de {c.plazas}</td>
                          <td>{c.estado === 'publicado' ? 'Publicado' : 'Pausado'}</td>
                          <td>
                            <div className="admin-acciones">
                              {c.estado === 'publicado' && <a href={`/curso/${c.id}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">Ver</a>}
                              <button type="button" onClick={() => handleEstadoCurso(c)} className="btn btn-secondary btn-sm">{c.estado === 'publicado' ? 'Pausar' : 'Publicar'}</button>
                              <button type="button" onClick={() => handleOpenCursoModal(c)} className="btn btn-secondary btn-sm">Editar</button>
                              <button type="button" onClick={() => handleDeleteCurso(c.id)} className="btn btn-secondary btn-sm admin-borrar">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {cursosVistos.length === 0 && <tr><td colSpan={5} className="admin-vacio">No hay cursos.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'solicitudes' && (
              <div>
                <div className="admin-cabecera">
                  <h1 className="admin-titulo">Solicitudes</h1>
                  <input className="form-control" aria-label="Buscar solicitud" placeholder="Buscar persona, curso o academia" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Persona</th><th>Curso</th><th>Academia</th><th>Fecha</th><th></th></tr></thead>
                    <tbody>
                      {solicitudesVistas.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.nombre}</strong><div className="admin-dato">{s.telefono}<br />{s.email}</div></td>
                          <td>{s.curso_titulo}</td>
                          <td>{s.centro_nombre}</td>
                          <td>{formatFechaHora(s.fecha_creacion)}</td>
                          <td><button type="button" onClick={() => handleDeleteSolicitud(s)} className="btn btn-secondary btn-sm admin-borrar">Eliminar</button></td>
                        </tr>
                      ))}
                      {solicitudesVistas.length === 0 && <tr><td colSpan={5} className="admin-vacio">No hay solicitudes.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'demos' && (
              <div>
                <h1 className="admin-titulo">Peticiones de acceso</h1>
                <p className="admin-intro">Academias que han rellenado el formulario para probar Cursenda. Al crear la cuenta empieza su mes gratis y te doy un enlace para que se lo envíes.</p>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Academia</th><th>Contacto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {demos.map(d => (
                        <tr key={d.id}>
                          <td><strong>{d.nombre_centro}</strong></td>
                          <td>{d.nombre_contacto}<div className="admin-dato"><a href={`tel:${d.telefono}`}>{d.telefono}</a><br /><a href={`mailto:${d.email}`}>{d.email}</a></div></td>
                          <td>{formatFechaHora(d.fecha_creacion)}</td>
                          <td>
                            <select className="form-control" aria-label={`Estado de ${d.nombre_centro}`} value={d.estado || 'nueva'} onChange={(e) => handleEstadoDemo(d.id, e.target.value)}>
                              <option value="nueva">Nueva</option>
                              <option value="contactada">Contactada</option>
                              <option value="descartada">Descartada</option>
                            </select>
                          </td>
                          <td><button type="button" onClick={() => handleCrearCuentaDemo(d)} className="btn btn-primary btn-sm">Crear cuenta</button></td>
                        </tr>
                      ))}
                      {demos.length === 0 && <tr><td colSpan={5} className="admin-vacio">Todavía no hay peticiones.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'recuperaciones' && (
              <div>
                <h1 className="admin-titulo">Contraseñas</h1>
                <p className="admin-intro">Personas que han pulsado "He olvidado mi contraseña". Crea el enlace y envíaselo.</p>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Correo</th><th>Cuenta</th><th>Fecha</th><th></th></tr></thead>
                    <tbody>
                      {recuperaciones.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.email}</strong></td>
                          <td>{r.centro_nombre || r.miembro_de || 'No hay ninguna cuenta con este correo'}</td>
                          <td>{formatFechaHora(r.fecha_creacion)}</td>
                          <td>
                            {r.atendida ? 'Atendida' : (
                              <div className="admin-acciones">
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleEnlaceRecuperacion(`${API_BASE}/admin/recuperaciones/${r.id}/enlace`, r.email, r.id)}>Crear enlace</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDescartarRecuperacion(r.id)}>Descartar</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {recuperaciones.length === 0 && <tr><td colSpan={4} className="admin-vacio">No hay peticiones.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'ajustes' && (
              <form onSubmit={handleGuardarAjustes} className="admin-ajustes">
                <h1 className="admin-titulo">Textos y datos</h1>
                <p className="admin-intro">Lo que cambies aquí se ve en la web al guardar. Si dejas un campo vacío, vuelve el texto por defecto.</p>
                <section>
                  <h2>Portada</h2>
                  {campoAjuste('portada_titulo', 'Titular')}
                  {campoAjuste('portada_texto', 'Texto', true)}
                </section>
                <section>
                  <h2>Página para academias</h2>
                  {campoAjuste('academias_titulo', 'Titular')}
                  {campoAjuste('academias_texto', 'Texto', true)}
                </section>
                <section>
                  <h2>Precios</h2>
                  <p className="admin-intro admin-aviso">Esto cambia los precios que se ven en la web. Lo que se cobra está en Stripe: si cambias un precio aquí, cámbialo también allí.</p>
                  <div className="admin-dos">
                    {campoAjuste('precio_starter', 'Starter, € al mes sin IVA')}
                    {campoAjuste('precio_pro', 'Pro, € al mes sin IVA')}
                  </div>
                </section>
                <section>
                  <h2>Datos legales</h2>
                  <p className="admin-intro">Salen en el aviso legal y la política de privacidad. Hay que rellenarlos antes de empezar a cobrar.</p>
                  {campoAjuste('legal_titular', 'Titular (nombre o empresa)')}
                  <div className="admin-dos">
                    {campoAjuste('legal_nif', 'NIF o CIF')}
                    {campoAjuste('legal_email', 'Correo de contacto')}
                  </div>
                  {campoAjuste('legal_domicilio', 'Domicilio')}
                </section>
                <section>
                  <h2>Pie de página</h2>
                  {campoAjuste('pie_texto', 'Texto', true)}
                </section>
                <div className="admin-guardar">
                  <button type="submit" className="btn btn-primary">Guardar cambios</button>
                  {ajustesEstado === 'guardado' ? <span role="status">Guardado</span> : ajustesEstado && <span role="alert" className="admin-error">{ajustesEstado}</span>}
                </div>
              </form>
            )}
          </>
        )}
      </main>

      {enlaceGenerado && (
        <EnlaceModal
          titulo="Enlace para poner la contraseña"
          texto={`Envíale este enlace a ${enlaceGenerado.para}. Caduca en 24 horas y solo sirve una vez.`}
          enlace={enlaceGenerado.enlace}
          onClose={() => setEnlaceGenerado(null)}
        />
      )}

      {showAcademiaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedAcademia ? 'Editar academia' : 'Nueva academia'}</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowAcademiaModal(false)} className="btn-close-modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveAcademia}>
              <div className="admin-modal-cuerpo">
                {formAcademiaError && <div className="alert-box alert-error" role="alert">{formAcademiaError}</div>}
                <div className="form-group"><label className="form-label" htmlFor="ac-nombre">Nombre de la academia *</label><input id="ac-nombre" required className="form-control" value={formAcademiaNombre} onChange={(e) => setFormAcademiaNombre(e.target.value)} /></div>
                <div className="form-group"><label className="form-label" htmlFor="ac-email">Correo de acceso *</label><input id="ac-email" required type="email" className="form-control" value={formAcademiaEmail} onChange={(e) => setFormAcademiaEmail(e.target.value)} /></div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ac-plan">Plan</label>
                  <select id="ac-plan" className="form-control" value={formAcademiaPlan} onChange={(e) => setFormAcademiaPlan(e.target.value)}>
                    {planesCon(ajustes).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.precio})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label" htmlFor="ac-contacto">Persona de contacto</label><input id="ac-contacto" className="form-control" value={formAcademiaContacto} onChange={(e) => setFormAcademiaContacto(e.target.value)} /></div>
                <div className="form-group"><label className="form-label" htmlFor="ac-tel">Teléfono</label><input id="ac-tel" type="tel" className="form-control" value={formAcademiaTelefono} onChange={(e) => setFormAcademiaTelefono(e.target.value)} /></div>
                {!selectedAcademia && <p className="admin-dato">Al guardar empieza su mes gratis y te doy un enlace para que ponga su contraseña.</p>}
              </div>
              <div className="admin-modal-pie">
                <button type="button" onClick={() => setShowAcademiaModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCursoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Editar curso</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowCursoModal(false)} className="btn-close-modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCurso}>
              <div className="admin-modal-cuerpo">
                {formCursoError && <div className="alert-box alert-error" role="alert">{formCursoError}</div>}
                <div className="form-group"><label className="form-label" htmlFor="cu-titulo">Título *</label><input id="cu-titulo" required className="form-control" value={formCursoTitulo} onChange={(e) => setFormCursoTitulo(e.target.value)} /></div>
                <div className="admin-dos">
                  <div className="form-group"><label className="form-label" htmlFor="cu-cat">Categoría</label><select id="cu-cat" className="form-control" value={formCursoCategoria} onChange={(e) => setFormCursoCategoria(e.target.value)}>{['Informática', 'Sanidad', 'Logística', 'Hostelería', 'Administración', 'Otros'].map(c => <option key={c}>{c}</option>)}</select></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-mod">Modalidad</label><select id="cu-mod" className="form-control" value={formCursoModalidad} onChange={(e) => setFormCursoModalidad(e.target.value)}>{['Presencial', 'Online', 'Mixta'].map(c => <option key={c}>{c}</option>)}</select></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-loc">Localidad *</label><input id="cu-loc" required className="form-control" value={formCursoLocalidad} onChange={(e) => setFormCursoLocalidad(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-horas">Horas *</label><input id="cu-horas" required type="number" min="1" className="form-control" value={formCursoDuracion} onChange={(e) => setFormCursoDuracion(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-plazas">Plazas *</label><input id="cu-plazas" required type="number" min="1" className="form-control" value={formCursoPlazas} onChange={(e) => setFormCursoPlazas(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-cub">Plazas ya cubiertas</label><input id="cu-cub" type="number" min="0" className="form-control" value={formCursoPlazasCubiertas} onChange={(e) => setFormCursoPlazasCubiertas(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-fecha">Fecha de inicio *</label><input id="cu-fecha" required className="form-control" value={formCursoFechaInicio} onChange={(e) => setFormCursoFechaInicio(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label" htmlFor="cu-para">Dirigido a</label><select id="cu-para" className="form-control" value={formCursoDirigidoA} onChange={(e) => setFormCursoDirigidoA(e.target.value)}>{['Todos', 'Desempleados', 'Ocupados'].map(c => <option key={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label" htmlFor="cu-est">Estado</label><select id="cu-est" className="form-control" value={formCursoEstado} onChange={(e) => setFormCursoEstado(e.target.value)}><option value="publicado">Publicado</option><option value="pausado">Pausado</option></select></div>
                <div className="form-group"><label className="form-label" htmlFor="cu-desc">Descripción *</label><textarea id="cu-desc" required rows={4} className="form-control" value={formCursoDescripcion} onChange={(e) => setFormCursoDescripcion(e.target.value)} /></div>
              </div>
              <div className="admin-modal-pie">
                <button type="button" onClick={() => setShowCursoModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCentros({ user, onLogout }: { user: any; onLogout: () => void }) {
  const { ajustes } = useAjustes();
  if (user?.rol === 'admin') {
    return <DashboardAdmin user={user} onLogout={onLogout} />;
  }

  const [tabElegida, setTab] = useState<'cursos' | 'solicitudes' | 'stats' | 'plan' | 'plantillas' | 'personal' | 'integraciones' | 'configuracion'>('cursos');
  // Sin suscripción ni prueba, lo único que queda abierto es la pantalla de pago
  const bloqueado = !user?.acceso;
  const tab: string = bloqueado ? (!user?.usuario?.rol || user.usuario.rol === 'propietario' ? 'plan' : 'ninguna') : tabElegida;
  const [cursos, setCursos] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaveSuccess, setWebhookSaveSuccess] = useState(false);
  const [webhookError, setWebhookError] = useState('');

  // Configuración del Centro
  const [confRazonSocial, setConfRazonSocial] = useState(user?.nombre || '');
  const [confCif, setConfCif] = useState(user?.cif || '');
  const [confTelefono, setConfTelefono] = useState(user?.telefono || '');
  const [confDireccion, setConfDireccion] = useState(user?.direccion || '');
  const [confWeb, setConfWeb] = useState(user?.web || '');
  const [confError, setConfError] = useState('');
  const confEmail = user?.email || '';
  const [confSaveSuccess, setConfSaveSuccess] = useState(false);

  // Quién ha entrado y qué puede hacer
  const rolUsuario: 'propietario' | 'gestor' | 'colaborador' = user?.usuario?.rol || 'propietario';
  const esPropietario = rolUsuario === 'propietario';
  const puedeEditar = rolUsuario !== 'colaborador';
  const tabsPermitidas = bloqueado
    ? (esPropietario ? ['plan'] : [])
    : esPropietario
      ? ['cursos', 'solicitudes', 'plantillas', 'stats', 'plan', 'personal', 'integraciones', 'configuracion']
      : ['cursos', 'solicitudes', 'plantillas', 'stats'];

  // Plantillas de mensajes (guardadas en el servidor)
  const [templates, setTemplates] = useState<any[]>([]);
  const plantillaDesdeApi = (p: any) => ({ id: p.id, titulo: p.titulo, canal: p.tipo === 'email' ? 'Email' : 'WhatsApp', contenido: p.texto });

  // Estados para gestión de plantillas
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formTemplateTitulo, setFormTemplateTitulo] = useState('');
  const [formTemplateCanal, setFormTemplateCanal] = useState('WhatsApp');
  const [formTemplateContenido, setFormTemplateContenido] = useState('');
  const [formTemplateError, setFormTemplateError] = useState('');

  // Estados para feedback de copiado
  const [copiedTemplateId, setCopiedTemplateId] = useState<number | null>(null);

  // Gestión de Personal (equipo del centro)
  const [team, setTeam] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState('gestor');
  const [inviteError, setInviteError] = useState('');
  const [enlaceEquipo, setEnlaceEquipo] = useState<{ titulo: string; texto: string; enlace: string } | null>(null);

  // Estados modales
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<any>(null); // null = crear, objeto = editar
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadNotes, setLeadNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Filtros de leads
  const [solicitudSearch, setSolicitudSearch] = useState('');
  const [solicitudStatusFilter, setSolicitudStatusFilter] = useState<'todos' | 'nuevos' | 'gestionados'>('todos');

  // Formulario Curso
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState('Informática');
  const [formModalidad, setFormModalidad] = useState('Online');
  const [formLocalidad, setFormLocalidad] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formPlazas, setFormPlazas] = useState('');
  const [formPlazasCubiertas, setFormPlazasCubiertas] = useState('0');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formDirigidoA, setFormDirigidoA] = useState('Todos');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  // Cargar datos
  const loadCursos = async () => {
    try {
      const res = await fetch(`${API_BASE}/cursos`);
      if (res.ok) {
        const data = await res.json();
        setCursos(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSolicitudes = async () => {
    try {
      const res = await fetch(`${API_BASE}/solicitudes`);
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/estadisticas`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadFacturas = async () => {
    try {
      const res = await fetch(`${API_BASE}/facturas`);
      if (res.ok) {
        const data = await res.json();
        setFacturas(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadApiSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/centro/api-settings`);
      if (res.ok) {
        const data = await res.json();
        setWebhookUrl(data.webhook_url || '');
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleSaveWebhook = async () => {
    try {
      const res = await fetch(`${API_BASE}/centro/api-settings/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });
      if (res.ok) {
        setWebhookError('');
        setWebhookSaveSuccess(true);
        setTimeout(() => setWebhookSaveSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setWebhookError(data.error || 'No se ha podido guardar.');
      }
    } catch (err) {
      setWebhookError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const loadPlantillas = async () => {
    try {
      const res = await fetch(`${API_BASE}/plantillas`);
      if (res.ok) setTemplates((await res.json()).map(plantillaDesdeApi));
    } catch (err) {
      console.error(err);
    }
  };

  const ROL_TEXTO: Record<string, string> = {
    propietario: 'Propietario',
    gestor: 'Gestor (cursos y solicitudes)',
    colaborador: 'Colaborador (solo solicitudes)'
  };
  const ESTADO_TEXTO: Record<string, string> = { activo: 'Activo', pendiente: 'Invitación pendiente', desactivado: 'Desactivado' };

  const loadEquipo = async () => {
    try {
      const res = await fetch(`${API_BASE}/equipo`);
      if (!res.ok) return;
      const data = await res.json();
      setTeam([
        { id: 0, nombre: data.propietario.nombre, email: data.propietario.email, rol: 'propietario', estado: 'activo', esPropietario: true },
        ...data.miembros.map((m: any) => ({ ...m, nombre: m.nombre || '—' }))
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/centros/login');
      return;
    }
    loadCursos();
    loadSolicitudes();
    loadStats();
    loadPlantillas();
    if (esPropietario) {
      loadFacturas();
      loadApiSettings();
      loadEquipo();
      loadPagos();
    }
    // Sin prueba ni suscripción, directo a "Plan y facturas"
    if (user && !user.acceso && esPropietario) setTab('plan');
  }, [user]);

  // Manejar cursos
  const handleOpenCursoModal = (curso: any = null) => {
    setSelectedCurso(curso);
    if (curso) {
      setFormTitulo(curso.titulo);
      setFormCategoria(curso.categoria);
      setFormModalidad(curso.modalidad);
      setFormLocalidad(curso.localidad);
      setFormDuracion(curso.duracion_horas.toString());
      setFormPlazas(curso.plazas.toString());
      setFormPlazasCubiertas(curso.plazas_cubiertas.toString());
      setFormFechaInicio(curso.fecha_inicio);
      setFormDirigidoA(curso.dirigido_a);
      setFormDescripcion(curso.descripcion);
    } else {
      setFormTitulo('');
      setFormCategoria('Informática');
      setFormModalidad('Online');
      setFormLocalidad('');
      setFormDuracion('');
      setFormPlazas('');
      setFormPlazasCubiertas('0');
      setFormFechaInicio('');
      setFormDirigidoA('Todos');
      setFormDescripcion('');
    }
    setFormError('');
    setShowCursoModal(true);
  };

  const handleSaveCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitulo || !formLocalidad || !formDuracion || !formPlazas || !formFechaInicio || !formDescripcion) {
      setFormError('Todos los campos obligatorios (*) deben ser rellenados.');
      return;
    }

    if (formModalidad === 'Presencial' || formModalidad === 'Mixta') {
      const locLower = formLocalidad.trim().toLowerCase();
      const invalidTerms = ['online', 'remoto', 'virtual', 'internet', 'no presencial', 'distancia', 'remota', 'pantalla', 'cualquiera'];
      if (invalidTerms.some(term => locLower.includes(term)) || locLower === '') {
        setFormError('Si el curso es presencial o mixto, pon una localidad real, no "Online" ni "Remoto".');
        return;
      }
    }

    const payload = {
      titulo: formTitulo,
      categoria: formCategoria,
      modalidad: formModalidad,
      localidad: formLocalidad,
      duracion_horas: parseInt(formDuracion),
      plazas: parseInt(formPlazas),
      plazas_cubiertas: parseInt(formPlazasCubiertas || '0'),
      fecha_inicio: formFechaInicio,
      dirigido_a: formDirigidoA,
      descripcion: formDescripcion
    };

    try {
      const url = selectedCurso ? `${API_BASE}/cursos/${selectedCurso.id}` : `${API_BASE}/cursos`;
      const method = selectedCurso ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCursoModal(false);
        loadCursos();
        loadStats();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Error al guardar el curso');
      }
    } catch (err) {
      setFormError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleOpenTemplateModal = (template?: any) => {
    setSelectedTemplate(template || null);
    if (template) {
      setFormTemplateTitulo(template.titulo);
      setFormTemplateCanal(template.canal);
      setFormTemplateContenido(template.contenido);
    } else {
      setFormTemplateTitulo('');
      setFormTemplateCanal('WhatsApp');
      setFormTemplateContenido('');
    }
    setFormTemplateError('');
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTemplateError('');

    if (!formTemplateTitulo.trim() || !formTemplateContenido.trim()) {
      setFormTemplateError('El título y el contenido son campos requeridos.');
      return;
    }

    try {
      const res = await fetch(selectedTemplate ? `${API_BASE}/plantillas/${selectedTemplate.id}` : `${API_BASE}/plantillas`, {
        method: selectedTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formTemplateTitulo,
          tipo: formTemplateCanal === 'Email' ? 'email' : 'whatsapp',
          texto: formTemplateContenido
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormTemplateError(data.error || 'No se pudo guardar la plantilla.');
        return;
      }
      const guardada = plantillaDesdeApi(data);
      setTemplates(selectedTemplate ? templates.map(t => t.id === guardada.id ? guardada : t) : [...templates, guardada]);
      setShowTemplateModal(false);
    } catch (err) {
      setFormTemplateError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    const res = await fetch(`${API_BASE}/plantillas/${id}`, { method: 'DELETE' });
    if (res.ok) setTemplates(templates.filter(t => t.id !== id));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail) return;

    try {
      const res = await fetch(`${API_BASE}/equipo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rol: inviteRol })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(data.error || 'No se pudo crear la invitación.');
        return;
      }
      setEnlaceEquipo({
        titulo: 'Invitación creada',
        texto: `Envíale este enlace a ${inviteEmail} para que cree su cuenta. Caduca en 7 días.`,
        enlace: data.enlace
      });
      setInviteEmail('');
      loadEquipo();
    } catch (err) {
      setInviteError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleRemoveTeamMember = async (id: number) => {
    const member = team.find(t => t.id === id);
    if (!member || member.esPropietario) return;
    if (!window.confirm(`¿Eliminar a ${member.nombre !== '—' ? member.nombre : member.email}?`)) return;
    const res = await fetch(`${API_BASE}/equipo/${id}`, { method: 'DELETE' });
    if (res.ok) loadEquipo();
  };

  const handleToggleMiembro = async (member: any) => {
    const res = await fetch(`${API_BASE}/equipo/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: member.estado === 'desactivado' })
    });
    if (res.ok) loadEquipo();
  };

  const handleEnlaceMiembro = async (member: any) => {
    const res = await fetch(`${API_BASE}/equipo/${member.id}/enlace-recuperacion`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'No se pudo crear el enlace');
      return;
    }
    setEnlaceEquipo({
      titulo: 'Enlace para contraseña nueva',
      texto: `Envíale este enlace a ${member.email}. Caduca en 24 horas y solo sirve una vez.`,
      enlace: data.enlace
    });
  };

  const handleToggleCursoEstado = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/cursos/${id}/toggle-estado`, { method: 'POST' });
      if (res.ok) {
        loadCursos();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'No se ha podido cambiar el estado del curso.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manejar Leads
  const handleOpenLeadModal = async (lead: any) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
    setNewNoteText('');
    // Por defecto, la primera plantilla de WhatsApp
    setPlantillaContacto(templates.find(t => t.canal === 'WhatsApp')?.id ?? '');
    
    try {
      const res = await fetch(`${API_BASE}/solicitudes/${lead.id}/notas`);
      if (res.ok) {
        const data = await res.json();
        setLeadNotes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Contactar desde la ficha: plantilla rellenada con los datos del alumno
  const [plantillaContacto, setPlantillaContacto] = useState<number | ''>('');

  const rellenarPlantilla = (texto: string, lead: any) => texto
    .replace(/\[Nombre\]/g, (lead.nombre || '').split(' ')[0])
    .replace(/\[Curso\]/g, lead.curso_titulo || '')
    .replace(/\[Centro\]/g, user?.nombre || '')
    .replace(/\[Fecha\]/g, lead.curso_fecha || '');

  // wa.me necesita el número con prefijo de país y sin espacios
  const telefonoWhatsApp = (tel: string) => {
    const digitos = String(tel || '').replace(/\D/g, '').replace(/^00/, '');
    return /^[6789]\d{8}$/.test(digitos) ? '34' + digitos : digitos;
  };

  const guardarNota = async (texto: string) => {
    const res = await fetch(`${API_BASE}/solicitudes/${selectedLead.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto })
    });
    if (res.ok) {
      const nueva = await res.json();
      setLeadNotes(prev => [nueva, ...prev]);
      loadSolicitudes();
    }
  };

  const handleContactar = (canal: 'whatsapp' | 'email') => {
    const lead = selectedLead;
    const plantilla = templates.find(t => t.id === plantillaContacto);
    const texto = plantilla ? rellenarPlantilla(plantilla.contenido, lead) : '';

    if (canal === 'whatsapp') {
      window.open(`https://wa.me/${telefonoWhatsApp(lead.telefono)}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`, '_blank', 'noopener');
    } else {
      const asunto = `Su solicitud de plaza: ${lead.curso_titulo}`;
      window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(asunto)}${texto ? `&body=${encodeURIComponent(texto)}` : ''}`;
    }
    guardarNota(`Contactado por ${canal === 'whatsapp' ? 'WhatsApp' : 'email'}${plantilla ? ` con la plantilla "${plantilla.titulo}"` : ''}.`);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/solicitudes/${selectedLead.id}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: newNoteText })
      });
      
      if (res.ok) {
        setNewNoteText('');
        // Recargar notas del lead
        const resNotes = await fetch(`${API_BASE}/solicitudes/${selectedLead.id}/notas`);
        const notesData = await resNotes.json();
        setLeadNotes(notesData);

        // Recargar solicitudes para reflejar estado "gestionado"
        loadSolicitudes();
        loadStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Código del widget para la web del centro
  const [widgetCopiado, setWidgetCopiado] = useState(false);
  const codigoWidget = `<div id="cursenda-cursos"></div>\n<script src="${window.location.origin}/widget.js" data-centro="${user?.id}" async></script>`;

  // Pagos con Stripe
  const [pagos, setPagos] = useState<any>(null);
  const [pagoError, setPagoError] = useState('');
  const [pagoCargando, setPagoCargando] = useState(false);
  const [pagoAviso, setPagoAviso] = useState<'ok' | 'cancelado' | null>(null);

  const loadPagos = async () => {
    try {
      const res = await fetch(`${API_BASE}/pagos/estado`);
      if (res.ok) setPagos(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Al volver de Stripe: avisar y esperar a que llegue la confirmación
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pago = params.get('pago');
    if (pago !== 'ok' && pago !== 'cancelado') return;
    setPagoAviso(pago);
    setTab('plan');
    window.history.replaceState({}, '', '/centros/dashboard');
    if (pago === 'ok') {
      let intentos = 0;
      const t = setInterval(() => {
        intentos++;
        loadPagos();
        loadFacturas();
        if (intentos >= 5) clearInterval(t);
      }, 2000);
      return () => clearInterval(t);
    }
  }, []);

  const irAStripe = async (url: string, body?: any) => {
    setPagoError('');
    setPagoCargando(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setPagoError(data.error || 'No se pudo abrir la página de pago.');
    } catch (err) {
      setPagoError('No se ha podido conectar. Vuelve a intentarlo.');
    }
    setPagoCargando(false);
  };

  const handleContratar = (plan: string) => irAStripe(`${API_BASE}/pagos/checkout`, { plan });
  const handlePortal = () => irAStripe(`${API_BASE}/pagos/portal`);

  // Cerrar Sesión
  const handleLogoutClick = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
      if (res.ok) {
        onLogout();
        navigate('/centros');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Contar solicitudes sin gestionar
  const countNuevas = solicitudes.filter(sol => !sol.gestionado).length;

  const solicitudesPorMes = () => {
    const hoy = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
      const total = solicitudes.filter(s => {
        const creada = parseFecha(s.fecha_creacion);
        return creada && creada.getFullYear() === fecha.getFullYear() && creada.getMonth() === fecha.getMonth();
      }).length;
      return { mes: fecha.toLocaleDateString('es-ES', { month: 'short' }), total };
    });
    const maximo = Math.max(1, ...meses.map(m => m.total));
    return meses.map(m => ({ ...m, altura: (m.total / maximo) * 100 }));
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar fijo */}
      <aside className="sidebar">
        <div>
          <Logo />
          <ul className="nav-menu">
            {tabsPermitidas.includes('cursos') && (
            <li className={`nav-item ${tab === 'cursos' ? 'active' : ''}`}>
              <button onClick={() => setTab('cursos')}>
                <BookOpen size={18} />
                <span>Mis cursos</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('solicitudes') && (
            <li className={`nav-item ${tab === 'solicitudes' ? 'active' : ''}`}>
              <button onClick={() => setTab('solicitudes')}>
                <Users size={18} />
                <span>Solicitudes</span>
                {countNuevas > 0 && <span className="nav-badge">{countNuevas}</span>}
              </button>
            </li>
            )}
            {tabsPermitidas.includes('plantillas') && (
            <li className={`nav-item ${tab === 'plantillas' ? 'active' : ''}`}>
              <button onClick={() => setTab('plantillas')}>
                <MessageSquare size={18} />
                <span>Plantillas</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('stats') && (
            <li className={`nav-item ${tab === 'stats' ? 'active' : ''}`}>
              <button onClick={() => setTab('stats')}>
                <BarChart3 size={18} />
                <span>Estadísticas</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('plan') && (
            <li className={`nav-item ${tab === 'plan' ? 'active' : ''}`}>
              <button onClick={() => setTab('plan')}>
                <Calendar size={18} />
                <span>Plan y facturas</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('personal') && (
            <li className={`nav-item ${tab === 'personal' ? 'active' : ''}`}>
              <button onClick={() => setTab('personal')}>
                <Shield size={18} />
                <span>Equipo</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('integraciones') && (
            <li className={`nav-item ${tab === 'integraciones' ? 'active' : ''}`}>
              <button onClick={() => setTab('integraciones')}>
                <Globe size={18} />
                <span>Tu web</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('configuracion') && (
            <li className={`nav-item ${tab === 'configuracion' ? 'active' : ''}`}>
              <button onClick={() => setTab('configuracion')}>
                <Settings size={18} />
                <span>Configuración</span>
              </button>
            </li>
            )}
          </ul>
        </div>

        <div className="sidebar-bottom">
          <div className="center-profile-summary">
            <div className="center-profile-name">{user?.nombre || 'Mi Centro'}</div>
            {esPropietario ? (
              <div className="center-profile-plan">Suscripción: {user?.plan || 'Starter'}</div>
            ) : (
              <div className="center-profile-plan">{user?.usuario?.nombre} · {ROL_TEXTO[rolUsuario]}</div>
            )}
          </div>
          <button onClick={handleLogoutClick} className="btn-logout">
            <X size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="dashboard-content">
        <AvisoSuscripcion user={user} pagos={pagos} esPropietario={esPropietario} onIrAPlan={() => setTab('plan')} enPlan={tab === 'plan'} />
        {/* TAB: MIS CURSOS */}
        {tab === 'cursos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Mis cursos</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Publica y pausa los cursos de tu academia.</p>
              </div>
              {puedeEditar && (
                <button onClick={() => handleOpenCursoModal()} className="btn btn-primary">
                  <Plus size={18} />
                  <span>Publicar curso</span>
                </button>
              )}
            </div>

            {/* Tarjetas de Métricas */}
            <div className="metrics-grid">
              <div className="metric-card metric-highlight">
                <div className="metric-header-row">
                  <span className="metric-label">Solicitudes en los últimos 7 días</span>
                  <span className="metric-icon-box"><Users size={20} /></span>
                </div>
                <span className="metric-value">{stats?.solicitudes_nuevas_semana || 0}</span>
              </div>
              <div className="metric-card">
                <div className="metric-header-row">
                  <span className="metric-label">Cursos publicados</span>
                  <span className="metric-icon-box"><BookOpen size={20} /></span>
                </div>
                <span className="metric-value">{cursos.filter(c => c.estado === 'publicado').length}</span>
              </div>
              <div className="metric-card">
                <div className="metric-header-row">
                  <span className="metric-label">Visitas a tus cursos</span>
                  <span className="metric-icon-box"><BarChart3 size={20} /></span>
                </div>
                <span className="metric-value">{stats?.visitas_totales || 0}</span>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Tabla de Cursos */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">Tus cursos</h3>
                </div>
                
                {cursos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Todavía no tienes cursos. Publica el primero.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Localidad</th>
                        <th>Inicio</th>
                        <th>Solicitudes</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursos.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{c.titulo}</td>
                          <td>{c.localidad}</td>
                          <td>{c.fecha_inicio}</td>
                          <td><strong>{c.solicitudes_count || 0}</strong></td>
                          <td>
                            <span className={`badge ${c.estado === 'publicado' ? 'badge-published' : 'badge-paused'}`}>
                              {c.estado === 'publicado' ? 'Publicado' : 'Pausado'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: puedeEditar ? 'flex' : 'none', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleToggleCursoEstado(c.id)} 
                                className="btn btn-secondary btn-sm"
                                title={c.estado === 'publicado' ? 'Pausar publicación' : 'Publicar curso'}
                                style={{ display: 'flex', alignItems: 'center' }}
                              >
                                {c.estado === 'publicado' ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <button 
                                onClick={() => handleOpenCursoModal(c)} 
                                className="btn btn-secondary btn-sm"
                                title="Editar curso"
                                style={{ display: 'flex', alignItems: 'center' }}
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Feed de Actividad Reciente */}
              <div className="activity-card">
                <h3 className="activity-title">Últimas solicitudes</h3>
                <ul className="activity-feed-list">
                  {solicitudes.length === 0 && <li className="activity-item"><div className="activity-text">Todavía no hay solicitudes.</div></li>}
                  {solicitudes.slice(0, 5).map((s) => (
                    <li key={s.id} className="activity-item">
                      <div className="activity-dot"></div>
                      <div>
                        <div className="activity-text">{s.nombre}: {s.curso_titulo}</div>
                        <span className="activity-time">{haceCuanto(s.fecha_creacion)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SOLICITUDES */}
        {tab === 'solicitudes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Solicitudes</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Las personas que han pedido plaza en tus cursos.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, maxWidth: '520px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar por nombre, curso o correo" 
                  value={solicitudSearch}
                  onChange={(e) => setSolicitudSearch(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <select 
                  className="form-control" 
                  value={solicitudStatusFilter} 
                  onChange={(e) => setSolicitudStatusFilter(e.target.value as any)}
                  style={{ width: '160px' }}
                >
                  <option value="todos">Todas</option>
                  <option value="nuevos">Sólo Nuevos</option>
                  <option value="gestionados">Sólo Gestionados</option>
                </select>
              </div>

              <a href={`${API_BASE}/solicitudes/export`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Download size={18} />
                <span>Exportar CSV</span>
              </a>
            </div>

            {/* Tabla de Solicitudes */}
            <div className="table-container">
              {solicitudes.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h3 className="empty-state-title">Aún no tienes solicitudes</h3>
                  <p className="empty-state-desc">Aparecerán aquí cuando alguien pida plaza en uno de tus cursos.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Curso</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes
                      .filter(s => {
                        const matchesSearch = s.nombre.toLowerCase().includes(solicitudSearch.toLowerCase()) || 
                                              s.email.toLowerCase().includes(solicitudSearch.toLowerCase()) || 
                                              s.telefono.includes(solicitudSearch) ||
                                              s.curso_titulo.toLowerCase().includes(solicitudSearch.toLowerCase());
                        if (solicitudStatusFilter === 'nuevos') return matchesSearch && !s.gestionado;
                        if (solicitudStatusFilter === 'gestionados') return matchesSearch && s.gestionado;
                        return matchesSearch;
                      })
                      .map((s) => (
                      <tr key={s.id} style={!s.gestionado ? { backgroundColor: 'rgba(201, 150, 46, 0.03)' } : undefined}>
                        <td>
                          <div className="student-row-cell">
                            <div 
                              className="student-avatar" 
                              style={{ backgroundColor: getAvatarBg(s.nombre) }}
                            >
                              {getInitials(s.nombre)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600' }}>{s.nombre}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                <Phone size={10} style={{ display: 'inline', marginRight: '4px' }} /> <a href={`tel:${s.telefono}`} className="enlace-telefono">{s.telefono}</a> | <Mail size={10} style={{ display: 'inline', marginRight: '4px' }} /> {s.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--primary)' }}>{s.curso_titulo}</td>
                        <td>{new Date(s.fecha_creacion).toLocaleDateString('es-ES')}</td>
                        <td>
                          {(() => {
                            const status = s.estado_detalle || (s.gestionado ? 'Llamado' : 'Nuevo');
                            const getStatusStyles = (st: string) => {
                              switch (st) {
                                case 'Nuevo':
                                  return { backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' };
                                case 'Llamado':
                                  return { backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#fde68a' };
                                case 'Interesado':
                                  return { backgroundColor: '#dbeafe', color: '#2563eb', borderColor: '#bfdbfe' };
                                case 'Matriculado':
                                  return { backgroundColor: '#d1fae5', color: '#059669', borderColor: '#6ee7b7' };
                                case 'Descartado':
                                  return { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' };
                                default:
                                  return { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' };
                              }
                            };
                            const styles = getStatusStyles(status);
                            return (
                              <select
                                value={status}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  try {
                                    const res = await fetch(`${API_BASE}/solicitudes/${s.id}/estado`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ estado_detalle: val })
                                    });
                                    if (res.ok) {
                                      loadSolicitudes();
                                      loadStats();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                style={{
                                  ...styles,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="Nuevo">Nuevo</option>
                                <option value="Llamado">Llamado</option>
                                <option value="Interesado">Interesado</option>
                                <option value="Matriculado">Matriculado</option>
                                <option value="Descartado">Descartado</option>
                              </select>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => handleOpenLeadModal(s)} 
                              className="btn btn-primary btn-sm"
                            >
                              Contactar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB: ESTADÍSTICAS */}
        {tab === 'stats' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Estadísticas</h1>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Visitas</span>
                <span className="metric-value">{stats?.visitas_totales || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Solicitudes</span>
                <span className="metric-value">{stats?.solicitudes_totales || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Visitas que piden plaza</span>
                <span className="metric-value">
                  {stats?.visitas_totales > 0 
                    ? `${((stats.solicitudes_totales / stats.visitas_totales) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Visitas por curso</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {cursos.map((c) => {
                    const pct = stats?.visitas_totales > 0 ? (c.visitas / stats.visitas_totales) * 100 : 0;
                    return (
                      <div key={c.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                          <span><strong>{c.titulo}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>{c.visitas} visitas</span>
                        </div>
                        <div className="plazas-bar-bg" style={{ height: '10px', borderRadius: '5px' }}>
                          <div className="plazas-bar-fill" style={{ width: `${Math.max(2, pct)}%`, height: '100%', borderRadius: '5px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Solicitudes por mes</h3>
                <div className="grafica-meses">
                  {solicitudesPorMes().map((m) => (
                    <div key={m.mes}>
                      <span className="grafica-valor">{m.total}</span>
                      <div className="grafica-barra" style={{ height: `${m.altura}%` }}></div>
                      <span className="grafica-mes">{m.mes}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLAN Y FACTURAS */}
        {tab === 'plan' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Plan y facturas</h1>

            {pagoAviso === 'ok' && (
              <div className="alert-box alert-info">
                <CheckCircle size={20} />
                <span>Suscripción activada. Puede tardar unos segundos en aparecer aquí.</span>
              </div>
            )}
            {pagoAviso === 'cancelado' && (
              <div className="alert-box alert-warning">
                <span>No se ha completado el pago. Puedes volver a intentarlo cuando quieras.</span>
              </div>
            )}
            {pagoError && (
              <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{pagoError}</div>
            )}
            {pagos?.modo_prueba && (
              <div className="alert-box alert-warning" style={{ fontSize: '0.8125rem' }}>
                <span><strong>Stripe en modo pruebas:</strong> no se cobra de verdad. Use la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.</span>
              </div>
            )}

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
              {/* Estado de la suscripción */}
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Tu suscripción</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--lines-light)', gap: '1rem' }}>
                  <span>Estado:</span>
                  <strong style={{ color: user?.acceso ? 'var(--success-text)' : 'var(--error-text)', textAlign: 'right' }}>
                    {textoEstadoSuscripcion(user, pagos)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--lines-light)' }}>
                  <span>Plan:</span>
                  <strong style={{ textTransform: 'uppercase', color: 'var(--accent)' }}>{user?.plan || 'starter'}</strong>
                </div>

                {user?.tiene_suscripcion ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginBottom: '1.5rem' }}>
                      <span>{user?.suscripcion_estado === 'prueba' ? 'Primer cobro:' : 'Próxima renovación:'}</span>
                      <strong>{new Date(user?.fecha_renovacion).toLocaleDateString('es-ES')}</strong>
                    </div>
                    <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={pagoCargando} onClick={handlePortal}>
                      {pagoCargando ? 'Abriendo...' : 'Gestionar pago'}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                      Cambie la tarjeta o el plan, descargue facturas o dé de baja la suscripción.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', margin: '1.5rem 0 0.5rem' }}>Elige tu plan</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {pagos?.dias_prueba > 2
                        ? `Si añades tu tarjeta ahora, no se te cobrará nada hasta que acabe la prueba (${new Date(String(pagos.prueba_hasta).replace(' ', 'T') + 'Z').toLocaleDateString('es-ES')}). Puedes cancelar cuando quieras.`
                        : 'El cobro es mensual y puedes cancelar cuando quieras.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                      {planesCon(ajustes).map((pl) => (
                        <div key={pl.id} style={{ border: `1px solid ${pl.id === 'pro' ? 'var(--accent)' : 'var(--lines)'}`, padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                          <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.875rem' }}>Plan {pl.nombre}</h5>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0', flex: 1 }}>{pl.descripcion}</p>
                          <div style={{ fontWeight: 'bold', fontSize: '0.875rem', margin: '0.5rem 0' }}>{pl.precio}</div>
                          {pl.id === 'custom' ? (
                            <a href={`mailto:${ajustes.legal_email}?subject=Plan%20Custom%20Cursenda`} className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>Contactar</a>
                          ) : (
                            <button type="button" disabled={pagoCargando || !pagos?.configurado} onClick={() => handleContratar(pl.id)} className={`btn ${pl.id === 'pro' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ width: '100%' }}>
                              Contratar {pl.nombre}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {pagos && !pagos.configurado && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                        El pago con tarjeta todavía no está activo. Para contratar, escríbenos a <a href={`mailto:${ajustes.legal_email}`}>{ajustes.legal_email}</a>.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Historial de Facturas */}
              <div className="table-container" style={{ overflow: 'hidden' }}>
                <div className="table-header">
                  <h3 className="table-title">Facturas</h3>
                </div>
                {facturas.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Todavía no hay facturas.</div>
                ) : (
                  <table style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((f) => (
                        <tr key={f.id}>
                          <td>
                            {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.numero}</a> : f.numero}
                            {f.estado === 'pendiente' && <span className="badge badge-paused" style={{ marginLeft: '0.5rem' }}>Pendiente</span>}
                          </td>
                          <td>{f.fecha}</td>
                          <td><strong>{Number(f.importe).toFixed(2)} €</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLANTILLAS */}
        {tab === 'plantillas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Plantillas</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mensajes ya escritos para contactar con quien pide plaza.</p>
              </div>
              {puedeEditar && (
                <button onClick={() => handleOpenTemplateModal()} className="btn btn-primary">
                  <Plus size={18} />
                  <span>Nueva plantilla</span>
                </button>
              )}
            </div>
            
            <div className="alert-box alert-info">
              <MessageSquare size={20} />
              <span>Desde la ficha de cada solicitud, eliges una plantilla y se abre WhatsApp o tu correo con el mensaje escrito. [Nombre], [Curso], [Centro] y [Fecha] se cambian solos por sus datos.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {templates.map((t) => (
                <div key={t.id} className="table-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '280px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>{t.titulo}</h3>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexShrink: 0 }}>
                        <span className="badge badge-published" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>{t.canal}</span>
                        <button 
                          onClick={() => handleOpenTemplateModal(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px', display: puedeEditar ? 'flex' : 'none', alignItems: 'center' }}
                          title="Editar plantilla"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-text)', padding: '2px', display: puedeEditar ? 'flex' : 'none', alignItems: 'center' }}
                          title="Eliminar plantilla"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: '1.45', backgroundColor: '#FAF9F6', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--lines)', overflowY: 'auto', maxHeight: '120px' }}>{t.contenido}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(t.contenido);
                      setCopiedTemplateId(t.id);
                      setTimeout(() => setCopiedTemplateId(null), 2000);
                    }} 
                    className={`btn ${copiedTemplateId === t.id ? 'btn-success' : 'btn-secondary'} btn-sm`} 
                    style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                  >
                    {copiedTemplateId === t.id ? (
                      <>
                        <Check size={14} />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <span>Copiar texto</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: PERSONAL */}
        {tab === 'personal' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Equipo</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Las personas que pueden entrar al panel de tu academia.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '2rem' }}>
              {/* Tabla de Gestores */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">Equipo de {confRazonSocial || user?.nombre}</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((t) => (
                      <tr key={t.esPropietario ? 'propietario' : t.id}>
                        <td style={{ fontWeight: '600' }}>{t.nombre}</td>
                        <td>{t.email}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: '500' }}>{ROL_TEXTO[t.rol] || t.rol}</td>
                        <td>
                          <span className={`badge ${t.estado === 'activo' ? 'badge-published' : 'badge-paused'}`}>
                            {ESTADO_TEXTO[t.estado] || t.estado}
                          </span>
                        </td>
                        <td>
                          {!t.esPropietario ? (
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              {t.estado !== 'pendiente' && (
                                <button onClick={() => handleEnlaceMiembro(t)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                                  Contraseña
                                </button>
                              )}
                              {t.estado !== 'pendiente' && (
                                <button onClick={() => handleToggleMiembro(t)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                                  {t.estado === 'desactivado' ? 'Activar' : 'Desactivar'}
                                </button>
                              )}
                              <button 
                                onClick={() => handleRemoveTeamMember(t.id)} 
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--error-text)', padding: '2px 8px', fontSize: '0.75rem' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formulario Invitación */}
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Invitar a alguien</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Se crea un enlace para que esa persona ponga su contraseña. Envíaselo por email o WhatsApp.</p>
                {inviteError && (
                  <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    {inviteError}
                  </div>
                )}
                <form onSubmit={handleInvite}>
                  <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="ejemplo@centro.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Rol del usuario</label>
                    <select className="form-control" value={inviteRol} onChange={(e) => setInviteRol(e.target.value)}>
                      <option value="gestor">Gestor: cursos, solicitudes y plantillas</option>
                      <option value="colaborador">Colaborador: solo solicitudes</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crear invitación</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {enlaceEquipo && (
          <EnlaceModal titulo={enlaceEquipo.titulo} texto={enlaceEquipo.texto} enlace={enlaceEquipo.enlace} onClose={() => setEnlaceEquipo(null)} />
        )}

        {/* TAB: INTEGRACIONES */}
        {tab === 'integraciones' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Tu web</h1>

            {/* Widget para la web del centro */}
            <div className="table-container" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Tus cursos en tu web</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '60ch' }}>
                Pega este código en la página de tu web donde quieras mostrar tus cursos. Se actualiza solo cuando publicas o pausas un curso, y las solicitudes te llegan a este panel.
              </p>
              <textarea
                className="form-control"
                readOnly
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                value={codigoWidget}
                onFocus={(e) => e.target.select()}
              />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(codigoWidget).then(() => { setWidgetCopiado(true); setTimeout(() => setWidgetCopiado(false), 2000); }).catch(() => {}); }}>
                  {widgetCopiado ? 'Copiado' : 'Copiar código'}
                </button>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Si tu web la lleva otra persona, envíale este código.</span>
              </div>
            </div>

            <div className="table-container" style={{ padding: '2rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Aviso a otro programa</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '60ch' }}>Si usas otro programa para tus alumnos, pon aquí su dirección de aviso (webhook) y le enviaremos los datos de cada solicitud nueva. Si no sabes qué es, no lo necesitas.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '560px' }}>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://"
                  aria-label="Dirección de aviso"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button onClick={handleSaveWebhook} className="btn btn-primary btn-sm">Guardar</button>
                  {webhookSaveSuccess && <span style={{ fontSize: '0.8125rem', color: 'var(--success-text)', fontWeight: 600 }}>Guardado</span>}
                  {webhookError && <span role="alert" style={{ fontSize: '0.8125rem', color: 'var(--error-text)' }}>{webhookError}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Configuración</h1>

            <div className="table-container" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Datos de tu academia</h3>
              
              {confSaveSuccess && (
                <div className="alert-box alert-info" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                  Cambios guardados.
                </div>
              )}

              {confError && (
                <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{confError}</div>
              )}
              <form onSubmit={async (e) => {
                e.preventDefault();
                setConfError('');
                try {
                  const res = await fetch(`${API_BASE}/centro/perfil`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: confRazonSocial, cif: confCif, telefono: confTelefono, direccion: confDireccion, web: confWeb })
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setConfError(data.error || 'No se pudieron guardar los cambios.');
                    return;
                  }
                  setConfSaveSuccess(true);
                  setTimeout(() => setConfSaveSuccess(false), 3000);
                } catch (err) {
                  setConfError('No se ha podido conectar. Vuelve a intentarlo.');
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Nombre de la academia</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={confRazonSocial}
                    onChange={(e) => setConfRazonSocial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CIF o NIF</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={confCif}
                      onChange={(e) => setConfCif(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={confTelefono}
                      onChange={(e) => setConfTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={confDireccion}
                    onChange={(e) => setConfDireccion(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Web</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      value={confWeb}
                      onChange={(e) => setConfWeb(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo de acceso</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={confEmail}
                      readOnly
                      title="Es el usuario para entrar. Para cambiarlo, escribe a soporte."
                      style={{ backgroundColor: 'var(--bg)' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Guardar cambios</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CURSO: CREAR/EDITAR */}
      {showCursoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{selectedCurso ? 'Editar curso' : 'Publicar curso'}</h3>
              <button onClick={() => setShowCursoModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCurso}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Título del curso *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: IFCD0210 - Desarrollo de aplicaciones web"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoría *</label>
                    <select className="form-control" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                      <option value="Informática">Informática</option>
                      <option value="Sanidad">Sanidad</option>
                      <option value="Logística">Logística</option>
                      <option value="Administración">Administración</option>
                      <option value="Hostelería">Hostelería</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modalidad *</label>
                    <select className="form-control" value={formModalidad} onChange={(e) => setFormModalidad(e.target.value)}>
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                      <option value="Mixta">Mixta</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Localidad *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Madrid o Remoto"
                      value={formLocalidad}
                      onChange={(e) => setFormLocalidad(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duración en horas *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 300"
                      value={formDuracion}
                      onChange={(e) => setFormDuracion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Plazas *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 20"
                      value={formPlazas}
                      onChange={(e) => setFormPlazas(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plazas ya cubiertas</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 5"
                      value={formPlazasCubiertas}
                      onChange={(e) => setFormPlazasCubiertas(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fecha de inicio *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: 15 de enero de 2027 o Inmediata"
                      value={formFechaInicio}
                      onChange={(e) => setFormFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dirigido a *</label>
                    <select className="form-control" value={formDirigidoA} onChange={(e) => setFormDirigidoA(e.target.value)}>
                      <option value="Todos">Todos</option>
                      <option value="Desempleados">Desempleados</option>
                      <option value="Ocupados">Ocupados</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción del curso *</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    placeholder="Qué se aprende, requisitos y titulación"
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCursoModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE LEAD / CONTACTO */}
      {showLeadModal && selectedLead && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Solicitud</h3>
              <button onClick={() => setShowLeadModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: '1.5rem', backgroundColor: '#FAF9F6', padding: '1rem', borderRadius: '6px', border: '1px solid var(--lines)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Alumno</span>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--primary)' }}>{selectedLead.nombre}</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Teléfono: <a href={`tel:${selectedLead.telefono}`}><strong>{selectedLead.telefono}</strong></a></div>
                  <div style={{ fontSize: '0.875rem' }}>Email: <a href={`mailto:${selectedLead.email}`}><strong>{selectedLead.email}</strong></a></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Curso solicitado</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedLead.curso_titulo}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Recibida el {formatFechaHora(selectedLead.fecha_creacion)}</div>
                </div>
              </div>

              {/* Contactar en un clic */}
              <div className="contactar-alumno">
                <label className="form-label" htmlFor="plantilla-contacto">Contactar con una plantilla</label>
                <select
                  id="plantilla-contacto"
                  className="form-control"
                  value={plantillaContacto}
                  onChange={(e) => setPlantillaContacto(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Sin plantilla (mensaje en blanco)</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                </select>
                {plantillaContacto !== '' && (
                  <p className="contactar-vista-previa">
                    {rellenarPlantilla(templates.find(t => t.id === plantillaContacto)?.contenido || '', selectedLead)}
                  </p>
                )}
                <div className="contactar-botones">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleContactar('whatsapp')}>
                    <MessageSquare size={16} /> WhatsApp
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleContactar('email')}>
                    <Mail size={16} /> Email
                  </button>
                  <a href={`tel:${selectedLead.telefono}`} className="btn btn-secondary btn-sm">
                    <Phone size={16} /> Llamar
                  </a>
                </div>
              </div>

              {/* Agregar Nota */}
              <form onSubmit={handleAddNote} style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Añadir una nota</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Ej: Llamado hoy. No responde, volver a llamar mañana."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ float: 'right' }}>Guardar nota</button>
                <div style={{ clear: 'both' }}></div>
              </form>

              {/* Historial */}
              <div className="contact-history">
                <h4 className="contact-history-title">Notas</h4>
                <div className="notes-timeline">
                  {leadNotes.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center' }}>Todavía no hay notas.</div>
                  ) : (
                    leadNotes.map((note) => (
                      <div key={note.id} className="note-item">
                        <div className="note-header">
                          <span>{formatFechaHora(note.fecha_creacion)}</span>
                        </div>
                        <div className="note-text">{note.texto}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowLeadModal(false)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLANTILLA: CREAR/EDITAR */}
      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedTemplate ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate}>
              <div className="modal-body">
                {formTemplateError && (
                  <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    {formTemplateError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: Primer contacto WhatsApp"
                    value={formTemplateTitulo}
                    onChange={(e) => setFormTemplateTitulo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Canal *</label>
                  <select 
                    className="form-control" 
                    value={formTemplateCanal} 
                    onChange={(e) => setFormTemplateCanal(e.target.value)}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mensaje *</label>
                  <textarea 
                    className="form-control" 
                    rows={6} 
                    placeholder="Puedes usar [Nombre], [Curso], [Centro] y [Fecha]"
                    value={formTemplateContenido}
                    onChange={(e) => setFormTemplateContenido(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar plantilla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- APP COMPONENT WITH ROUTING ---
function App() {
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES);
  useEffect(() => {
    fetch(`${API_BASE}/public/ajustes`)
      .then(res => res.ok ? res.json() : {})
      .then(datos => setAjustes({ ...AJUSTES_INICIALES, ...datos }))
      .catch(() => {});
  }, []);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Comprobar si hay sesión iniciada al cargar
  const checkSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="pantalla-carga" role="status">
        <span className="logo-text">cursenda<span className="logo-dot">.</span></span>
        <span className="pantalla-carga-texto">Cargando…</span>
      </div>
    );
  }

  return (
    <AjustesContexto.Provider value={{ ajustes, setAjustes }}>
    <BrowserRouter>
      <Routes>
        {/* Alumnos */}
        <Route path="/" element={<AlumnosHome />} />
        <Route path="/cursos" element={<AlumnosLista />} />
        <Route path="/curso/:id" element={<AlumnosDetalle />} />

        {/* Centros */}
        <Route path="/centros" element={<LandingCentros />} />
        <Route path="/centros/login" element={<LoginCentros onLogin={handleLogin} />} />
        <Route path="/centros/recuperar" element={<RecuperarCentros />} />
        <Route path="/centros/restablecer" element={<RestablecerCentros />} />

        {/* Legal */}
        <Route path="/legal/aviso-legal" element={<LegalPage tipo="aviso-legal" />} />
        <Route path="/legal/privacidad" element={<LegalPage tipo="privacidad" />} />
        <Route path="/legal/cookies" element={<LegalPage tipo="cookies" />} />

        <Route path="*" element={<NoEncontrada />} />
        <Route path="/centros/unirse" element={<UnirseCentros onLogin={handleLogin} />} />
        <Route 
          path="/centros/dashboard" 
          element={<DashboardCentros user={currentUser} onLogout={handleLogout} />} 
        />
      </Routes>
    </BrowserRouter>
    </AjustesContexto.Provider>
  );
}

export default App;
