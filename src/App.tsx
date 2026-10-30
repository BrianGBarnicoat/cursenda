import React, { useState, useEffect } from 'react';
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
  HelpCircle, 
  BarChart3,
  Calendar,
  Settings,
  Code,
  MessageSquare,
  Shield,
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
  return (
    <footer className="pub-pie">
      <div className="pub-ancho">
        <p>Cursenda es un portal independiente. No pertenece al SEPE ni a ninguna administración pública.</p>
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
          <h1>Aprende un oficio con un curso gratis</h1>
          <div>
            <p>Cursos subvencionados con dinero público que publican las academias. Pides plaza aquí y la academia te llama.</p>
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
            <p>Publica tus cursos y recibe aquí a la gente que pide plaza, con su teléfono. El primer mes es gratis y luego cuesta desde 79 € al mes más IVA.</p>
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
function LandingCentros() {
  useTitulo('Cursenda para centros · Llene las plazas de sus cursos subvencionados');
  const [nombreCentro, setNombreCentro] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Estados para Demostración Interactiva (Búsqueda Inteligente)
  const [demoSearch, setDemoSearch] = useState('');
  const [demoFilter, setDemoFilter] = useState('Informática');
  const demoCourses = [
    { code: 'IFCD0210', title: 'Desarrollo de Aplicaciones con Tecnologías Web', cat: 'Informática', duration: '510h', mode: 'Online', desc: 'Curso de programación web oficial.' },
    { code: 'SANT0208', title: 'Atención Sociosanitaria a Personas Dependientes', cat: 'Sanidad', duration: '450h', mode: 'Presencial', desc: 'Certificado oficial obligatorio para residencias.' },
    { code: 'COML0309', title: 'Organización y Gestión de Almacenes', cat: 'Logística', duration: '390h', mode: 'Presencial', desc: 'Gestión logística y control de stock ERP.' },
    { code: 'HOTR0608', title: 'Servicios de Restaurante y Sumillería', cat: 'Hostelería', duration: '580h', mode: 'Presencial', desc: 'Coctelería, sumillería y gestión de sala.' },
    { code: 'ADGD0210', title: 'Creación y Gestión de Microempresas', cat: 'Administración', duration: '520h', mode: 'Mixta', desc: 'Dirección de Pymes y contabilidad oficial.' }
  ];
  
  // Estado para Simulador ROI
  const [vacantes, setVacantes] = useState(10);
  const [subvencion, setSubvencion] = useState(1800);

  // Estado para Mapa Interactivo de España
  const [selectedRegion, setSelectedRegion] = useState<'madrid' | 'cataluna' | 'andalucia' | 'valencia' | 'paisvasco'>('madrid');
  const regionDetails = {
    madrid: { name: 'Comunidad de Madrid', leads: 1842, category: 'Informática (42%)', density: 'Muy Alta' },
    cataluna: { name: 'Cataluña', leads: 1495, category: 'Sanidad (38%)', density: 'Alta' },
    andalucia: { name: 'Andalucía', leads: 2105, category: 'Hostelería (45%)', density: 'Muy Alta' },
    valencia: { name: 'Comunidad Valenciana', leads: 980, category: 'Logística (35%)', density: 'Media-Alta' },
    paisvasco: { name: 'País Vasco', leads: 760, category: 'Informática (40%)', density: 'Media' }
  };

  // Observer para revelar elementos al hacer scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    const elements = document.querySelectorAll('.reveal, .reveal-scale, .reveal-left');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
      observer.disconnect();
    };
  }, [selectedRegion, activeFaq]);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombreCentro.trim() || !contacto.trim() || !email.trim() || !telefono.trim()) {
      setError('Por favor, rellene todos los campos obligatorios.');
      return;
    }

    if (!rgpd) {
      setError('Debe aceptar la política de privacidad y protección de datos.');
      return;
    }

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
        setError(data.error || 'No se pudo enviar la solicitud. Inténtelo de nuevo.');
      }
    } catch (err) {
      setError('Error de red. Inténtelo de nuevo.');
    }
  };

  return (
    <div>
      <nav className="landing-navbar">
        <Logo />
        <ul className="landing-nav-links">
          <li><a href="#como-funciona" className="landing-nav-link">Cómo funciona</a></li>
          <li><a href="#planes" className="landing-nav-link">Planes</a></li>
          <li><a href="#faq" className="landing-nav-link">Preguntas frecuentes</a></li>
        </ul>
        <Link to="/centros/login" className="btn btn-primary btn-sm">Acceso Centros</Link>
      </nav>

      <header className="centros-hero">
        <div className="centros-hero-texto">
          <h1>Llene las plazas vacías de sus cursos subvencionados</h1>
          <p>Publique sus cursos en Cursenda y reciba en su panel a los alumnos interesados, con su teléfono y su email, en cuanto piden plaza.</p>
          <div className="centros-hero-acciones">
            <a href="#demo" className="btn btn-accent">Probar 30 días gratis</a>
            <a href="#planes" className="btn btn-secondary">Ver precios</a>
          </div>
          <ul className="centros-hero-garantias">
            <li><Check size={16} /> Sin tarjeta para probar</li>
            <li><Check size={16} /> Sin permanencia</li>
            <li><Shield size={16} /> Datos en servidores de la UE</li>
          </ul>
        </div>
        <div className="centros-hero-panel" aria-hidden="true">
          <img src="/images/panel-solicitudes.webp" alt="" width="1600" height="1000" />
          <div className="centros-hero-aviso">
            <span className="centros-hero-aviso-punto"></span>
            <div>
              <strong>Nueva solicitud de plaza</strong>
              <span>Laura Fernández · IFCD0210 Desarrollo Web</span>
            </div>
          </div>
        </div>
      </header>

      <div id="como-funciona" className="landing-section">
        <h2 className="landing-section-title">Cómo funciona Cursenda</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-container"><BookOpen size={32} /></div>
            <h3>1. Publique sus cursos</h3>
            <p>Suba el título, modalidad, localidad y descripción de los cursos gratuitos que tiene programados.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-container"><Users size={32} /></div>
            <h3>2. Reciba las solicitudes</h3>
            <p>Los alumnos interesados piden plaza en la ficha del curso y a usted le llegan al momento su nombre, teléfono y email.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-container"><CheckCircle size={32} /></div>
            <h3>3. Cierre sus matrículas</h3>
            <p>Contacte rápido a los alumnos desde el panel de control privado de su centro y complete su expediente.</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN: DEMO INTERACTIVA Y ROI */}
      <div className="landing-section reveal" style={{ borderTop: '1px solid var(--lines)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          
          <h2 style={{ fontSize: '2.25rem', color: 'var(--primary)', textAlign: 'center', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Herramientas de Venta y Simulación</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto' }}>
            Pruebe el potencial de Cursenda. Compruebe la demanda de alumnos en su zona y calcule el impacto económico de cubrir sus plazas vacantes.
          </p>

          <div className="sales-tools-grid">
            
            {/* CALCULADORA DE ROI */}
            <div className="table-container reveal-scale" style={{ padding: '2.5rem' }}>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Simulador de Retorno (ROI)</h3>
              
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Plazas vacías al año:</span>
                  <strong style={{ color: 'var(--accent)' }}>{vacantes} alumnos</strong>
                </label>
                <input 
                  type="range" 
                  min="2" 
                  max="50" 
                  value={vacantes} 
                  onChange={(e) => setVacantes(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subvención media por alumno del SEPE:</span>
                  <strong style={{ color: 'var(--accent)' }}>{subvencion} €</strong>
                </label>
                <input 
                  type="range" 
                  min="500" 
                  max="4500" 
                  step="100"
                  value={subvencion} 
                  onChange={(e) => setSubvencion(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--lines)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                  <span>Ingresos perdidos actuales por vacantes:</span>
                  <strong style={{ color: 'var(--error-text)' }}>{(vacantes * subvencion).toLocaleString('es-ES')} €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                  <span>Coste anual de Cursenda (Plan Starter):</span>
                  <strong>948 €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', color: 'var(--primary)', borderTop: '1px solid var(--lines)', paddingTop: '1rem' }}>
                  <span>Ingreso neto recuperado:</span>
                  <strong style={{ color: 'var(--success-text)', fontSize: '1.5rem', fontWeight: '800' }}>{Math.max(0, (vacantes * subvencion) - 948).toLocaleString('es-ES')} €</strong>
                </div>
              </div>
            </div>

            {/* DEMO BÚSQUEDA INTELIGENTE */}
            <div className="table-container reveal-scale stagger-1" style={{ padding: '2.5rem' }}>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Demostración de Búsqueda Inteligente</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Simulación interactiva de cómo los alumnos encuentran sus cursos.</p>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {['Informática', 'Sanidad', 'Logística', 'Hostelería'].map((cat) => (
                  <button 
                    key={cat} 
                    type="button"
                    className="btn btn-secondary btn-sm" 
                    style={demoFilter === cat ? { backgroundColor: 'var(--primary)', color: 'var(--white)', borderColor: 'var(--primary)', borderRadius: '16px' } : { borderRadius: '16px' }}
                    onClick={() => {
                      setDemoFilter(cat);
                      setDemoSearch('');
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Escriba un código oficial (Ej: IFCD0210)..."
                  value={demoSearch}
                  onChange={(e) => {
                    setDemoSearch(e.target.value);
                    setDemoFilter('');
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '180px', overflowY: 'auto' }}>
                {demoCourses
                  .filter(c => {
                    if (demoSearch) {
                      return c.code.toLowerCase().includes(demoSearch.toLowerCase()) || c.title.toLowerCase().includes(demoSearch.toLowerCase());
                    }
                    return c.cat === demoFilter;
                  })
                  .map((c) => (
                    <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--lines)', borderRadius: '6px', backgroundColor: '#FAF9F6', fontSize: '0.8125rem' }}>
                      <div>
                        <strong>{c.code}</strong> - {c.title}
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.75rem' }}>{c.desc}</div>
                      </div>
                      <span className="badge badge-published" style={{ alignSelf: 'center' }}>{c.mode}</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>

          {/* MAPA INTERACTIVO DE DEMANDA EN ESPAÑA */}
          <div className="table-container sales-map-grid reveal stagger-2">
            <div>
              <h3 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '1rem' }}>Mapa de Demanda Estudiantil <span className="badge badge-paused" style={{ fontSize: '0.6875rem', verticalAlign: 'middle' }}>Ejemplo</span></h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
                Así verá la demanda por zonas cuando tenga sus cursos publicados. Las cifras de este ejemplo son ilustrativas.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {['madrid', 'cataluna', 'andalucia'].map((reg) => (
                    <button 
                      key={reg}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={selectedRegion === reg ? { backgroundColor: 'var(--primary)', color: 'var(--white)', borderColor: 'var(--primary)' } : {}}
                      onClick={() => setSelectedRegion(reg as any)}
                    >
                      {regionDetails[reg as keyof typeof regionDetails].name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {['valencia', 'paisvasco'].map((reg) => (
                    <button 
                      key={reg}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={selectedRegion === reg ? { backgroundColor: 'var(--primary)', color: 'var(--white)', borderColor: 'var(--primary)' } : {}}
                      onClick={() => setSelectedRegion(reg as any)}
                    >
                      {regionDetails[reg as keyof typeof regionDetails].name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--lines)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Candidatos (ejemplo)</span>
                  <strong style={{ fontSize: '1.5rem', color: 'var(--accent)', fontWeight: '800' }}>{regionDetails[selectedRegion].leads.toLocaleString('es-ES')} alumnos</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Categoría Estrella</span>
                  <strong style={{ fontSize: '1.125rem', color: 'var(--primary)', fontWeight: '700' }}>{regionDetails[selectedRegion].category}</strong>
                </div>
              </div>
            </div>

            {/* SVG GRÁFICO DEL MAPA DE ESPAÑA SIMPLIFICADO */}
            <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#FAF9F6', padding: '2rem', borderRadius: '8px', border: '1px solid var(--lines)', overflow: 'hidden' }}>
              <svg viewBox="0 0 400 300" style={{ width: '100%', height: 'auto', maxHeight: '250px' }}>
                <path d="M 50,80 L 100,50 L 150,30 L 250,20 L 320,40 L 350,100 L 320,180 L 260,250 L 180,280 L 100,270 L 60,200 L 30,120 Z" fill="#E2E0D8" opacity="0.3" stroke="var(--lines)" strokeWidth="2" strokeDasharray="4 4" />
                
                <line x1="200" y1="130" x2="310" y2="90" stroke="var(--lines)" strokeWidth="1" />
                <line x1="200" y1="130" x2="200" y2="240" stroke="var(--lines)" strokeWidth="1" />
                <line x1="200" y1="130" x2="290" y2="180" stroke="var(--lines)" strokeWidth="1" />
                <line x1="200" y1="130" x2="220" y2="40" stroke="var(--lines)" strokeWidth="1" />

                {/* NODO MADRID */}
                <circle 
                  cx="200" cy="130" r={selectedRegion === 'madrid' ? 18 : 12} 
                  fill={selectedRegion === 'madrid' ? 'var(--accent)' : 'var(--primary)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
                  onClick={() => setSelectedRegion('madrid')}
                />
                <text x="200" y="160" textAnchor="middle" style={{ fontSize: '10px', fontWeight: '700', fill: 'var(--primary)', pointerEvents: 'none' }}>Madrid</text>

                {/* NODO BARCELONA */}
                <circle 
                  cx="310" cy="90" r={selectedRegion === 'cataluna' ? 18 : 12} 
                  fill={selectedRegion === 'cataluna' ? 'var(--accent)' : 'var(--primary)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
                  onClick={() => setSelectedRegion('cataluna')}
                />
                <text x="310" y="70" textAnchor="middle" style={{ fontSize: '10px', fontWeight: '700', fill: 'var(--primary)', pointerEvents: 'none' }}>Barcelona</text>

                {/* NODO ANDALUCIA */}
                <circle 
                  cx="200" cy="240" r={selectedRegion === 'andalucia' ? 18 : 12} 
                  fill={selectedRegion === 'andalucia' ? 'var(--accent)' : 'var(--primary)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
                  onClick={() => setSelectedRegion('andalucia')}
                />
                <text x="200" y="270" textAnchor="middle" style={{ fontSize: '10px', fontWeight: '700', fill: 'var(--primary)', pointerEvents: 'none' }}>Sevilla</text>

                {/* NODO VALENCIA */}
                <circle 
                  cx="290" cy="180" r={selectedRegion === 'valencia' ? 18 : 12} 
                  fill={selectedRegion === 'valencia' ? 'var(--accent)' : 'var(--primary)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
                  onClick={() => setSelectedRegion('valencia')}
                />
                <text x="300" y="200" textAnchor="middle" style={{ fontSize: '10px', fontWeight: '700', fill: 'var(--primary)', pointerEvents: 'none' }}>Valencia</text>

                {/* NODO PAIS VASCO */}
                <circle 
                  cx="220" cy="40" r={selectedRegion === 'paisvasco' ? 18 : 12} 
                  fill={selectedRegion === 'paisvasco' ? 'var(--accent)' : 'var(--primary)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} 
                  onClick={() => setSelectedRegion('paisvasco')}
                />
                <text x="220" y="25" textAnchor="middle" style={{ fontSize: '10px', fontWeight: '700', fill: 'var(--primary)', pointerEvents: 'none' }}>Bilbao</text>
              </svg>
            </div>
          </div>

        </div>
      </div>

      <div id="planes" className="landing-section reveal" style={{ backgroundColor: '#FAF9F6', padding: '5rem 2rem', borderTop: '1px solid var(--lines)', borderBottom: '1px solid var(--lines)', maxWidth: '100%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 className="landing-section-title">Planes flexibles para su centro</h2>
          <div className="pricing-grid">
            <div className="price-card reveal-scale stagger-1">
              <div className="price-name">Plan Starter</div>
              <div className="price-amount">79€ <span>/ mes + IVA</span></div>
              <ul className="price-features">
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Hasta 5 cursos activos</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Gestión de leads e historial</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Exportación CSV</li>
                <li className="price-feature disabled"><X size={16} style={{ color: 'var(--error-text)' }} /> Estadísticas detalladas</li>
              </ul>
              <Link to="/centros/login" className="btn btn-secondary" style={{ marginTop: 'auto' }}>Comenzar ahora</Link>
            </div>

            <div className="price-card popular reveal-scale stagger-2">
              <div className="popular-badge">Recomendado</div>
              <div className="price-name">Plan Pro</div>
              <div className="price-amount">149€ <span>/ mes + IVA</span></div>
              <ul className="price-features">
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Cursos activos ilimitados</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Gestión de leads e historial</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Exportación CSV</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Estadísticas detalladas de visitas</li>
              </ul>
              <Link to="/centros/login" className="btn btn-primary" style={{ marginTop: 'auto' }}>Comenzar ahora</Link>
            </div>

            <div className="price-card reveal-scale stagger-3">
              <div className="price-name">Plan Custom</div>
              <div className="price-amount">A Medida <span></span></div>
              <ul className="price-features">
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Redes de centros</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Integración API directa</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Gestor de cuentas dedicado</li>
                <li className="price-feature"><Check size={16} style={{ color: 'var(--success-text)' }} /> Acuerdos de nivel de servicio (SLA)</li>
              </ul>
              <a href="#demo" className="btn btn-secondary" style={{ marginTop: 'auto' }}>Contactar soporte</a>
            </div>
          </div>
        </div>
      </div>

      <div id="faq" className="landing-section">
        <h2 className="landing-section-title">Preguntas Frecuentes</h2>
        <div className="faq-list">
          <div className="faq-item reveal stagger-1" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              className="faq-toggle"
              onClick={() => toggleFaq(0)}
            >
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>¿Tiene permanencia el servicio?</span>
              <span className={`faq-icon ${activeFaq === 0 ? 'open' : ''}`}>+</span>
            </button>
            <div className={`faq-body ${activeFaq === 0 ? 'open' : ''}`}>
              <p className="faq-answer">No. La suscripción es mensual y puede cambiar de plan o darse de baja cuando quiera desde su panel, sin penalización.</p>
            </div>
          </div>

          <div className="faq-item reveal stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              className="faq-toggle"
              onClick={() => toggleFaq(1)}
            >
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>¿Cómo reciben los alumnos la información?</span>
              <span className={`faq-icon ${activeFaq === 1 ? 'open' : ''}`}>+</span>
            </button>
            <div className={`faq-body ${activeFaq === 1 ? 'open' : ''}`}>
              <p className="faq-answer">Los alumnos ven la ficha del curso en Cursenda y piden plaza con un formulario. La solicitud aparece al momento en su panel privado, al que solo entra usted y su equipo con su contraseña.</p>
            </div>
          </div>

          <div className="faq-item reveal stagger-3" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              className="faq-toggle"
              onClick={() => toggleFaq(2)}
            >
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>¿Por qué es importante responder rápido?</span>
              <span className={`faq-icon ${activeFaq === 2 ? 'open' : ''}`}>+</span>
            </button>
            <div className={`faq-body ${activeFaq === 2 ? 'open' : ''}`}>
              <p className="faq-answer">Un alumno que pide plaza suele estar mirando varios cursos a la vez. Cuanto antes le llame, más fácil es que se matricule con usted. Las plantillas de WhatsApp y email del panel le ayudan a hacerlo en segundos.</p>
            </div>
          </div>

          <div className="faq-item" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              className="faq-toggle"
              onClick={() => toggleFaq(3)}
            >
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>¿Qué pasa cuando terminan los 30 días gratis?</span>
              <span className={`faq-icon ${activeFaq === 3 ? 'open' : ''}`}>+</span>
            </button>
            <div className={`faq-body ${activeFaq === 3 ? 'open' : ''}`}>
              <p className="faq-answer">Elige un plan desde su panel y todo sigue igual. Si no lo hace, sus cursos dejan de mostrarse, pero sus datos se guardan por si decide volver.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="demo" className="landing-section">
        <h2 className="landing-section-title">Empiece sus 30 días gratis</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '560px', margin: '-1.5rem auto 2rem' }}>Déjenos sus datos y le preparamos la cuenta de su centro. Le enseñamos el panel en una llamada de 15 minutos.</p>
        <div className="demo-form-container">
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
              <h3>Solicitud recibida</h3>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Le escribiremos en menos de 24 horas laborables para preparar su cuenta y enseñarle el panel.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit}>
              {error && (
                <div className="alert-box alert-error">
                  {error}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre del centro de formación</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej: Academia Tecnológica de Madrid"
                  value={nombreCentro}
                  onChange={(e) => setNombreCentro(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre de contacto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: Brian Barnicoat"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="Ej: 600112233"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Ej: contacto@centro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-checkbox-container" style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="rgpd-demo" 
                  checked={rgpd} 
                  onChange={(e) => setRgpd(e.target.checked)} 
                />
                <label htmlFor="rgpd-demo" className="form-checkbox-label">
                  Acepto el <Link to="/legal/aviso-legal" target="_blank">aviso legal</Link> y la <Link to="/legal/privacidad" target="_blank">política de privacidad</Link>. Consiento el tratamiento de mis datos de contacto para la demostración comercial del servicio de Cursenda.
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Quiero probarlo gratis</button>
            </form>
          )}
        </div>
      </div>

      <footer className="landing-footer">
        <div className="footer-content">
          <div>
            <Logo light={true} />
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>SaaS de captación de alumnos para centros de formación en España.</p>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
            <strong>Contacto</strong>
            <p style={{ marginTop: '0.5rem' }}>{DATOS_LEGALES.email}</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Cursenda. Todos los derechos reservados.</span>
          <div className="footer-links">
            <Link to="/legal/aviso-legal" className="footer-link">Aviso Legal</Link>
            <Link to="/legal/privacidad" className="footer-link">Privacidad</Link>
            <Link to="/legal/cookies" className="footer-link">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- PORTAL COMERCIAL: LOGIN ---
function LoginCentros({ onLogin }: { onLogin: (user: any) => void }) {
  useTitulo('Acceso centros · Cursenda');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, rellene todos los campos.');
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
        setError(data.error || 'Error al iniciar sesión');
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
        <h2 className="auth-title">Acceso Centros</h2>
        <p className="auth-subtitle">Gestión de cursos y solicitudes de plaza</p>

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
              placeholder="nombre@centro.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Iniciar sesión</button>
        </form>

        <div className="auth-links">
          <Link to="/centros/recuperar" className="auth-link">¿Olvidó su contraseña?</Link>
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
            <h2 className="auth-title">Activar Cuenta</h2>
            <p className="auth-subtitle">Configure el perfil de su centro de formación para acceder</p>

            {activationSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--primary)' }}>Cuenta activada</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Redirigiendo al panel de control...</p>
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
            <h2 className="auth-title">Restablecer Contraseña</h2>
            
            {recoverySent ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--primary)' }}>Petición recibida</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Si el correo está registrado, el equipo de Cursenda le enviará un enlace para crear una contraseña nueva en menos de 24 horas laborables.</p>
                <Link to="/centros/login" className="btn btn-secondary btn-sm" style={{ marginTop: '1.5rem' }}>Volver al login</Link>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit}>
                <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>Introduzca su correo electrónico y le enviaremos un enlace para crear una contraseña nueva.</p>

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
                    placeholder="ejemplo@centro.com"
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
const DATOS_LEGALES = {
  titular: '',
  nif: '',
  domicilio: '',
  email: 'info@cursenda.es',
  dominio: 'gbarnicoat.uk',
  actualizado: '29 de octubre de 2026'
};

function LegalPage({ tipo }: { tipo: 'aviso-legal' | 'privacidad' | 'cookies' }) {
  const d = DATOS_LEGALES;
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
              <li><strong>Si es un centro y pide una demo:</strong> nombre del centro, persona de contacto, email y teléfono, para contactarle y enseñarle la plataforma.</li>
              <li><strong>Si tiene cuenta de centro:</strong> los datos de su cuenta y de su equipo, para darle acceso al panel y prestarle el servicio.</li>
            </ul>

            <h2>Base legal</h2>
            <p>Su consentimiento, que da al marcar la casilla del formulario, y en el caso de los centros con cuenta, el contrato del servicio. Puede retirar su consentimiento cuando quiera.</p>

            <h2>Cuánto tiempo los guardamos</h2>
            <p>Las solicitudes de plaza se guardan mientras el centro las necesite para gestionar la matrícula y, como máximo, 2 años. Las solicitudes de demo, hasta 1 año si no se contrata el servicio. Los datos de cuentas, mientras la cuenta esté activa.</p>

            <h2>Quién más los ve</h2>
            <p>Solo el centro de formación al que pide plaza. No vendemos datos ni los usamos para publicidad. La web está alojada en un servidor propio en la Unión Europea.</p>

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
        <p className="auth-subtitle">Puede que el enlace esté mal o que el curso ya no esté disponible.</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary btn-sm">Buscar cursos</Link>
          <Link to="/centros" className="btn btn-secondary btn-sm">Soy un centro</Link>
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
            <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>Elija una contraseña de al menos 8 caracteres.</p>
            {error && (
              <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{error}</div>
            )}
            <div className="form-group">
              <label className="form-label">Contraseña nueva</label>
              <input type="password" className="form-control" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Repita la contraseña</label>
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
    if (!nombre.trim()) { setError('Indique su nombre.'); return; }
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
            <p className="auth-subtitle">Esta invitación no es válida o ya ha caducado. Pida al responsable de su centro que le envíe otra.</p>
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
              <label className="form-label">Su nombre</label>
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
const PLANES = [
  { id: 'starter', nombre: 'Starter', precio: '79 € / mes + IVA', descripcion: 'Hasta 5 cursos activos, gestión de leads y exportación CSV.' },
  { id: 'pro', nombre: 'Pro', precio: '149 € / mes + IVA', descripcion: 'Cursos ilimitados y estadísticas detalladas de visitas.' },
  { id: 'custom', nombre: 'Custom', precio: 'A medida', descripcion: 'Redes de centros, integración por API y gestor de cuenta.' }
];

const textoEstadoSuscripcion = (centro: any, pagos?: any) => {
  const estado = centro?.suscripcion_estado;
  if (estado === 'activa') return 'Activa';
  if (estado === 'impago') return 'Pago pendiente: revise su tarjeta';
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
          <strong>Su periodo de prueba ha terminado.</strong>{' '}
          {esPropietario
            ? 'Sus cursos no se muestran en la web y no puede ver las solicitudes hasta que active su suscripción.'
            : 'Pida al responsable del centro que active la suscripción para seguir usando Cursenda.'}
        </span>
        {esPropietario && !enPlan && <button type="button" className="btn btn-primary btn-sm" onClick={onIrAPlan}>Activar suscripción</button>}
      </div>
    );
  }

  if (user.suscripcion_estado === 'impago' && esPropietario) {
    return (
      <div className="alert-box alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}><strong>No hemos podido cobrar su suscripción.</strong> Revise su tarjeta para no perder el acceso.</span>
        {!enPlan && <button type="button" className="btn btn-primary btn-sm" onClick={onIrAPlan}>Revisar pago</button>}
      </div>
    );
  }

  if (user.suscripcion_estado === 'prueba' && !user.tiene_suscripcion && esPropietario && pagos && pagos.dias_prueba <= 7) {
    return (
      <div className="alert-box alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}>
          Le {pagos.dias_prueba === 1 ? 'queda 1 día' : `quedan ${pagos.dias_prueba} días`} de prueba gratis. Elija un plan para no perder sus cursos ni sus solicitudes.
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

function DashboardAdmin({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [tab, setTab] = useState<'inicio' | 'academias' | 'cursos' | 'solicitudes' | 'demos' | 'recuperaciones'>('inicio');
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
  const [formAcademiaPassword, setFormAcademiaPassword] = useState('');
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
    alert('Demo reiniciada. Ya puede enseñarla.');
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
  const handleOpenAcademiaModal = (ac?: any) => {
    setSelectedAcademia(ac || null);
    if (ac) {
      setFormAcademiaNombre(ac.nombre);
      setFormAcademiaEmail(ac.email);
      setFormAcademiaPassword('');
      setFormAcademiaPlan(ac.plan);
      setFormAcademiaContacto(ac.nombre_contacto || '');
      setFormAcademiaTelefono(ac.telefono || '');
    } else {
      setFormAcademiaNombre('');
      setFormAcademiaEmail('');
      setFormAcademiaPassword('');
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

    if (!formAcademiaNombre || !formAcademiaEmail || (!selectedAcademia && !formAcademiaPassword)) {
      setFormAcademiaError('Nombre, correo electrónico y contraseña son obligatorios.');
      return;
    }

    const payload: any = {
      nombre: formAcademiaNombre,
      email: formAcademiaEmail,
      plan: formAcademiaPlan,
      nombre_contacto: formAcademiaContacto,
      telefono: formAcademiaTelefono
    };
    if (formAcademiaPassword) {
      payload.password = formAcademiaPassword;
    }

    try {
      const url = selectedAcademia ? `${API_BASE}/admin/centros/${selectedAcademia.id}` : `${API_BASE}/admin/centros`;
      const method = selectedAcademia ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAcademiaModal(false);
        loadData();
      } else {
        const errData = await res.json();
        setFormAcademiaError(errData.error || 'Error al guardar la academia');
      }
    } catch (err) {
      setFormAcademiaError('Error de red. Inténtelo de nuevo.');
    }
  };

  const handleDeleteAcademia = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta academia? Esta acción es irreversible y eliminará todos sus cursos y solicitudes asociadas.')) {
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
      setFormCursoError('Error de red. Inténtelo de nuevo.');
    }
  };

  const handleDeleteCurso = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este curso? Se eliminarán también las solicitudes de plaza asociadas.')) {
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

  // Cálculo de estadísticas
  const totalAcademias = academias.filter(a => a.rol !== 'admin').length;
  const totalCursos = cursos.length;
  const totalLeads = solicitudes.length;
  // Solo cuentan las academias que ya pagan (sin IVA)
  const totalFacturadoEst = academias
    .filter(a => a.rol !== 'admin' && a.suscripcion_estado === 'activa')
    .reduce((sum, a) => {
      // Custom es a medida, no se suma
      if (a.plan === 'pro') return sum + 149;
      if (a.plan === 'starter') return sum + 79;
      return sum;
    }, 0);

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Sidebar Admin */}
      <aside className="dashboard-sidebar" style={{ width: '260px', backgroundColor: 'var(--primary-dark)', color: 'var(--white)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div className="dashboard-sidebar-header" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo light={true} />
          <span style={{ fontSize: '0.625rem', backgroundColor: 'var(--accent)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Admin</span>
        </div>
        
        <nav className="dashboard-nav" style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            type="button" 
            className={`dashboard-nav-item ${tab === 'inicio' ? 'active' : ''}`}
            onClick={() => setTab('inicio')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'inicio' ? 'rgba(255,255,255,0.08)' : 'none', color: tab === 'inicio' ? 'var(--white)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s ease' }}
          >
            <BarChart3 size={16} />
            <span>Inicio</span>
          </button>
          <button 
            type="button" 
            className={`dashboard-nav-item ${tab === 'academias' ? 'active' : ''}`}
            onClick={() => setTab('academias')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'academias' ? 'rgba(255,255,255,0.08)' : 'none', color: tab === 'academias' ? 'var(--white)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s ease' }}
          >
            <Users size={16} />
            <span>Academias</span>
          </button>
          <button 
            type="button" 
            className={`dashboard-nav-item ${tab === 'cursos' ? 'active' : ''}`}
            onClick={() => setTab('cursos')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'cursos' ? 'rgba(255,255,255,0.08)' : 'none', color: tab === 'cursos' ? 'var(--white)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s ease' }}
          >
            <BookOpen size={16} />
            <span>Moderación Cursos</span>
          </button>
          <button 
            type="button" 
            className={`dashboard-nav-item ${tab === 'solicitudes' ? 'active' : ''}`}
            onClick={() => setTab('solicitudes')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'solicitudes' ? 'rgba(255,255,255,0.08)' : 'none', color: tab === 'solicitudes' ? 'var(--white)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s ease' }}
          >
            <MessageSquare size={16} />
            <span>Solicitudes / Leads</span>
          </button>
          {([
            ['demos', 'Demos pedidas', <Calendar size={16} />, demos.filter(d => d.estado === 'nueva').length],
            ['recuperaciones', 'Recuperar contraseña', <Shield size={16} />, recuperaciones.filter(r => !r.atendida).length]
          ] as const).map(([id, texto, icono, pendientes]) => (
            <button
              key={id}
              type="button"
              className={`dashboard-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: '8px', border: 'none', background: tab === id ? 'rgba(255,255,255,0.08)' : 'none', color: tab === id ? 'var(--white)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.2s ease' }}
            >
              {icono}
              <span style={{ flex: 1 }}>{texto}</span>
              {pendientes > 0 && <span className="nav-badge">{pendientes}</span>}
            </button>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '50%', 
              backgroundColor: 'var(--accent)', color: 'var(--primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem'
            }}>
              AD
            </div>
            <div style={{ textAlign: 'left', overflow: 'hidden' }}>
              <h4 style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--white)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nombre || 'Administrador'}</h4>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--white)' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem', height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)', fontWeight: 800 }}>Panel de Control de Administración</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Control global de academias, cursos y solicitudes registradas en Cursenda</p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Cargando datos globales del sistema...</div>
        ) : error ? (
          <div className="alert-box alert-error" style={{ padding: '1rem', color: 'var(--error-text)' }}>{error}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* TAB: INICIO */}
            {tab === 'inicio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Stats Counters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  <div className="stat-card" style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Academias Registradas</span>
                      <span style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(201,150,46,0.1)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center' }}><Users size={14} /></span>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{totalAcademias}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 700, marginTop: '0.5rem' }}>Plataforma SaaS activa</span>
                  </div>
                  <div className="stat-card" style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cursos Publicados</span>
                      <span style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(12,59,51,0.1)', color: 'var(--primary)', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={14} /></span>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{totalCursos}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 700, marginTop: '0.5rem' }}>Moderación activa</span>
                  </div>
                  <div className="stat-card" style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Solicitudes</span>
                      <span style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(46,92,83,0.1)', color: 'var(--primary-dark)', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={14} /></span>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{totalLeads}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 700, marginTop: '0.5rem' }}>Estudiantes registrados</span>
                  </div>
                  <div className="stat-card" style={{ backgroundColor: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ingresos Est. Mensual</span>
                      <span style={{ display: 'flex', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(94,62,12,0.1)', color: 'var(--accent)', alignItems: 'center', justifyContent: 'center' }}>💰</span>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{totalFacturadoEst} €</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 700, marginTop: '0.5rem' }}>Suscripciones activas</span>
                  </div>
                </div>

                <div style={{ padding: '2rem', backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 1rem', color: 'var(--primary)', fontWeight: 800 }}>🔑 Acceso Directo de Administración</h3>
                  <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    Bienvenido al panel central de Cursenda. Desde aquí puedes autorizar y crear cuentas para nuevas academias que hayan contratado el servicio, actualizar sus planes de suscripción o supervisar y moderar los cursos que publican en la plataforma estudiantil pública.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setTab('academias')} className="btn btn-primary btn-sm">Ver Academias</button>
                    <button type="button" onClick={() => setTab('cursos')} className="btn btn-secondary btn-sm">Moderar Cursos</button>
                    <button type="button" onClick={handleReiniciarDemo} className="btn btn-secondary btn-sm" title="Vuelve a poner la cuenta demo con sus datos de ejemplo">Reiniciar demo</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACADEMIAS */}
            {tab === 'academias' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Gestión de Academias</h3>
                    <p style={{ margin: '0.125rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Da de alta nuevas empresas cuando paguen o actualiza sus suscripciones.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleOpenAcademiaModal()} 
                    className="btn btn-accent btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                  >
                    <Plus size={14} />
                    <span>Crear Academia</span>
                  </button>
                </div>

                <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                  <table className="table-leads" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--lines)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Nombre</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Email</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Plan</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Contacto / Teléfono</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Suscripción</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academias.filter(a => a.rol !== 'admin').map((ac) => (
                        <tr key={ac.id} style={{ borderBottom: '1px solid var(--lines-light)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{ac.nombre}</td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>{ac.email}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px',
                              backgroundColor: ac.plan === 'starter' ? '#e2e8f0' : ac.plan === 'pro' ? 'rgba(201,150,46,0.15)' : 'rgba(12,59,51,0.15)',
                              color: ac.plan === 'starter' ? '#4a5568' : ac.plan === 'pro' ? 'var(--accent)' : 'var(--primary)'
                            }}>
                              {ac.plan}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {ac.nombre_contacto || 'N/D'} {ac.telefono && `(${ac.telefono})`}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontWeight: 600, color: ac.acceso ? 'var(--success-text)' : 'var(--error-text)' }}>{textoEstadoSuscripcion(ac)}</div>
                            <div style={{ fontSize: '0.75rem' }}>
                              {ac.suscripcion_estado === 'prueba' && ac.prueba_hasta
                                ? `Prueba hasta ${formatFechaHora(ac.prueba_hasta).split(' ')[0]}`
                                : ac.tiene_suscripcion ? `Renueva el ${new Date(ac.fecha_renovacion).toLocaleDateString('es-ES')}` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => handleOpenAcademiaModal(ac)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Editar
                              </button>
                              {!ac.tiene_suscripcion && (
                                <button
                                  type="button"
                                  onClick={() => handleAmpliarPrueba(ac)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  title="Dar 30 días más de prueba gratis"
                                >
                                  +30 días
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEnlaceRecuperacion(`${API_BASE}/admin/centros/${ac.id}/enlace-recuperacion`, ac.email)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Crear un enlace para que ponga contraseña nueva"
                              >
                                Contraseña
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteAcademia(ac.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red', borderColor: 'rgba(255,0,0,0.15)' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {academias.filter(a => a.rol !== 'admin').length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay academias registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: MODERACIÓN CURSOS */}
            {tab === 'cursos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Moderación de Cursos</h3>
                  <p style={{ margin: '0.125rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Administra y modera el catálogo completo de cursos activos e inactivos.</p>
                </div>

                <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                  <table className="table-leads" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--lines)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Título / Academia</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Categoría</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Modalidad / Zona</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Vacantes</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Estado</th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursos.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--lines-light)' }}>
                          <td style={{ padding: '1rem' }}>
                            <strong style={{ color: 'var(--primary)', display: 'block' }}>{c.titulo}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Publicado por: {c.centro_nombre}</span>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>{c.categoria}</td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>
                            {c.modalidad} {c.localidad && `(${c.localidad})`}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>
                            {c.plazas_cubiertas} / {c.plazas} plazas
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              fontSize: '0.6875rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                              backgroundColor: c.estado === 'publicado' ? 'rgba(46,117,89,0.1)' : 'rgba(201,150,46,0.1)',
                              color: c.estado === 'publicado' ? 'var(--success-text)' : 'var(--accent)'
                            }}>
                              {c.estado === 'publicado' ? 'Publicado' : 'Pausado'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                type="button" 
                                onClick={() => handleOpenCursoModal(c)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Moderar
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteCurso(c.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red', borderColor: 'rgba(255,0,0,0.15)' }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {cursos.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay cursos creados en la plataforma.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: LEADS / SOLICITUDES */}
            {tab === 'solicitudes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Control de Solicitudes / Leads</h3>
                  <p style={{ margin: '0.125rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Supervisión de todos los estudiantes inscritos en los cursos.</p>
                </div>

                <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
                  <table className="table-leads" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--lines)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Estudiante</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Contacto</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Curso Solicitado</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Academia</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solicitudes.map((sol) => (
                        <tr key={sol.id} style={{ borderBottom: '1px solid var(--lines-light)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{sol.nombre}</td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>
                            <div style={{ fontSize: '0.8125rem' }}>📧 {sol.email}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>📞 {sol.telefono}</div>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>{sol.curso_titulo}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{sol.centro_nombre}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {new Date(sol.fecha_creacion).toLocaleDateString()} {new Date(sol.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                      {solicitudes.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay solicitudes de alumnos registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: DEMOS PEDIDAS */}
            {tab === 'demos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Demos pedidas</h3>
                  <p style={{ margin: '0.125rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Centros que han rellenado el formulario de la página para centros.</p>
                </div>
                <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', overflowX: 'auto' }}>
                  <table className="table-leads" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--lines)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Centro</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Contacto</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Fecha</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demos.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--lines-light)' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{d.nombre_centro}</td>
                          <td style={{ padding: '1rem', color: 'var(--text)' }}>
                            <div>{d.nombre_contacto}</div>
                            <div style={{ fontSize: '0.8125rem' }}><a href={`mailto:${d.email}`}>{d.email}</a></div>
                            <div style={{ fontSize: '0.8125rem' }}><a href={`tel:${d.telefono}`}>{d.telefono}</a></div>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{formatFechaHora(d.fecha_creacion)}</td>
                          <td style={{ padding: '1rem' }}>
                            <select className="form-control" style={{ minWidth: '140px' }} value={d.estado} onChange={(e) => handleEstadoDemo(d.id, e.target.value)}>
                              <option value="nueva">Nueva</option>
                              <option value="contactada">Contactada</option>
                              <option value="descartada">Descartada</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {demos.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Todavía no ha pedido nadie una demo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: RECUPERAR CONTRASEÑA */}
            {tab === 'recuperaciones' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800 }}>Recuperar contraseña</h3>
                  <p style={{ margin: '0.125rem 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Genera el enlace y envíaselo por email o WhatsApp. Caduca en 24 horas y solo sirve una vez.</p>
                </div>
                <div style={{ backgroundColor: 'var(--white)', borderRadius: '16px', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', overflowX: 'auto' }}>
                  <table className="table-leads" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--lines)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Correo</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Cuenta</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Fecha</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recuperaciones.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--lines-light)', opacity: r.atendida ? 0.55 : 1 }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{r.email}</td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                            {r.centro_nombre ? r.centro_nombre : r.miembro_de ? `Equipo de ${r.miembro_de}` : 'No existe ninguna cuenta'}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{formatFechaHora(r.fecha_creacion)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {r.atendida ? 'Atendida' : (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                {(r.centro_nombre || r.miembro_de) && (
                                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleEnlaceRecuperacion(`${API_BASE}/admin/recuperaciones/${r.id}/enlace`, r.email, r.id)}>Crear enlace</button>
                                )}
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDescartarRecuperacion(r.id)}>Descartar</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {recuperaciones.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay peticiones.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {enlaceGenerado && (
        <EnlaceModal
          titulo="Enlace para contraseña nueva"
          texto={`Envíale este enlace a ${enlaceGenerado.para}. Caduca en 24 horas y solo sirve una vez.`}
          enlace={enlaceGenerado.enlace}
          onClose={() => setEnlaceGenerado(null)}
        />
      )}

      {/* Modal: Nueva / Editar Academia */}
      {showAcademiaModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 59, 51, 0.65)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div className="reveal-scale visible" style={{
            backgroundColor: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(8, 42, 36, 0.25)', border: '1px solid var(--lines)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left'
          }}>
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--lines)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 800 }}>
                {selectedAcademia ? 'Editar Academia' : 'Crear Nueva Academia'}
              </h3>
              <button 
                onClick={() => setShowAcademiaModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.375rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAcademia} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formAcademiaError && <div className="alert-box alert-error" style={{ fontSize: '0.8125rem', padding: '0.75rem' }}>{formAcademiaError}</div>}
              
              <div className="form-group">
                <label className="form-label">Razon Social / Nombre Centro *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej: Centro Tecnológico de Sevilla" 
                  value={formAcademiaNombre}
                  onChange={(e) => setFormAcademiaNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo electrónico *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="ejemplo@academia.com" 
                  value={formAcademiaEmail}
                  onChange={(e) => setFormAcademiaEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña {selectedAcademia ? '(dejar vacío para no cambiar)' : '*'}</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={formAcademiaPassword}
                  onChange={(e) => setFormAcademiaPassword(e.target.value)}
                  required={!selectedAcademia}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Plan de Suscripción</label>
                <select 
                  className="form-control"
                  value={formAcademiaPlan}
                  onChange={(e) => setFormAcademiaPlan(e.target.value)}
                >
                  <option value="starter">Starter (79€/mes)</option>
                  <option value="pro">Pro (149€/mes)</option>
                  <option value="custom">Custom (a medida)</option>
                </select>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre de Contacto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: Ana Pérez" 
                    value={formAcademiaContacto}
                    onChange={(e) => setFormAcademiaContacto(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono de Contacto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: 600000000" 
                    value={formAcademiaTelefono}
                    onChange={(e) => setFormAcademiaTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--lines)', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAcademiaModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Academia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Moderación / Edición Curso */}
      {showCursoModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 59, 51, 0.65)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div className="reveal-scale visible" style={{
            backgroundColor: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(8, 42, 36, 0.25)', border: '1px solid var(--lines)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left', maxHeight: '90vh'
          }}>
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--lines)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 800 }}>Moderar Curso</h3>
              <button onClick={() => setShowCursoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.375rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveCurso} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              {formCursoError && <div className="alert-box alert-error" style={{ fontSize: '0.8125rem' }}>{formCursoError}</div>}

              <div className="form-group">
                <label className="form-label">Título del Curso *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formCursoTitulo}
                  onChange={(e) => setFormCursoTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-control" value={formCursoCategoria} onChange={(e) => setFormCursoCategoria(e.target.value)}>
                    <option value="Informática">Informática</option>
                    <option value="Sanidad">Sanidad</option>
                    <option value="Logística">Logística</option>
                    <option value="Hostelería">Hostelería</option>
                    <option value="Administración">Administración</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Modalidad</label>
                  <select className="form-control" value={formCursoModalidad} onChange={(e) => setFormCursoModalidad(e.target.value)}>
                    <option value="Presencial">Presencial</option>
                    <option value="Online">Online</option>
                    <option value="Mixta">Mixta</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Localidad / Zona *</label>
                  <input type="text" className="form-control" value={formCursoLocalidad} onChange={(e) => setFormCursoLocalidad(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duración en Horas *</label>
                  <input type="number" className="form-control" value={formCursoDuracion} onChange={(e) => setFormCursoDuracion(e.target.value)} required />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Plazas Totales *</label>
                  <input type="number" className="form-control" value={formCursoPlazas} onChange={(e) => setFormCursoPlazas(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Plazas Cubiertas *</label>
                  <input type="number" className="form-control" value={formCursoPlazasCubiertas} onChange={(e) => setFormCursoPlazasCubiertas(e.target.value)} required />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio *</label>
                  <input type="text" className="form-control" value={formCursoFechaInicio} onChange={(e) => setFormCursoFechaInicio(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirigido A</label>
                  <input type="text" className="form-control" value={formCursoDirigidoA} onChange={(e) => setFormCursoDirigidoA(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Estado de Moderación</label>
                <select className="form-control" value={formCursoEstado} onChange={(e) => setFormCursoEstado(e.target.value)}>
                  <option value="publicado">Publicado</option>
                  <option value="pausado">Pausado (Ocultar)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <textarea className="form-control" rows={3} value={formCursoDescripcion} onChange={(e) => setFormCursoDescripcion(e.target.value)} required style={{ resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--lines)', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowCursoModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardCentros({ user, onLogout }: { user: any; onLogout: () => void }) {
  if (user?.rol === 'admin') {
    return <DashboardAdmin user={user} onLogout={onLogout} />;
  }

  const [tab, setTab] = useState<'cursos' | 'solicitudes' | 'stats' | 'plan' | 'plantillas' | 'personal' | 'integraciones' | 'configuracion'>('cursos');
  const [cursos, setCursos] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [apiToken, setApiToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaveSuccess, setWebhookSaveSuccess] = useState(false);

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
  const tabsPermitidas = esPropietario
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
  const [copiedApiToken, setCopiedApiToken] = useState(false);
  const [apiRegenSuccess, setApiRegenSuccess] = useState(false);

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
        setApiToken(data.api_token);
        setWebhookUrl(data.webhook_url || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('¿Está seguro de que desea regenerar su clave API? Las integraciones actuales dejarán de funcionar hasta que actualice la clave.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/centro/api-settings/regenerate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApiToken(data.api_token);
        setApiRegenSuccess(true);
        setTimeout(() => setApiRegenSuccess(false), 3000);
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
        setWebhookSaveSuccess(true);
        setTimeout(() => setWebhookSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
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
        setFormError('Para cursos presenciales o mixtos, debe indicar una localidad o dirección física real (no se permite "Online", "Remoto" o similar).');
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
      setFormError('Error de red. Inténtelo de nuevo.');
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
      setFormTemplateError('Error de red. Inténtelo de nuevo.');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta plantilla?')) return;
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
      setInviteError('Error de red. Inténtelo de nuevo.');
    }
  };

  const handleRemoveTeamMember = async (id: number) => {
    const member = team.find(t => t.id === id);
    if (!member || member.esPropietario) return;
    if (!window.confirm(`¿Está seguro de que desea eliminar a ${member.nombre !== '—' ? member.nombre : member.email}?`)) return;
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
    .replace(/\[Centro\]/g, user?.nombre || '');

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

  const handleToggleLeadGestionado = async (lead: any) => {
    try {
      const res = await fetch(`${API_BASE}/solicitudes/${lead.id}/gestionado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gestionado: lead.gestionado ? 0 : 1 })
      });

      if (res.ok) {
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
      setPagoError('Error de red. Inténtelo de nuevo.');
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

  const getDynamicActivity = () => {
    const activity: any[] = [];
    
    // Añadir solicitudes como actividad
    solicitudes.slice(0, 3).forEach(s => {
      activity.push({
        id: `sol-${s.id}`,
        text: `${s.nombre} solicitó plaza en "${s.curso_titulo}"`,
        time: haceCuanto(s.fecha_creacion)
      });
    });

    // Añadir cursos como actividad
    cursos.slice(0, 2).forEach(c => {
      activity.push({
        id: `cur-${c.id}`,
        text: `Curso "${c.titulo}" está en estado ${c.estado}`,
        time: `${c.visitas} visitas totales`
      });
    });

    if (activity.length === 0) {
      activity.push({ id: 1, text: "Sin actividad reciente registrada", time: "ahora" });
    }

    return activity;
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar fijo */}
      <aside className="sidebar">
        <div>
          <Logo />
          <ul className="nav-menu">
            <li className={`nav-item ${tab === 'cursos' ? 'active' : ''}`}>
              <button onClick={() => setTab('cursos')}>
                <BookOpen size={18} />
                <span>Mis cursos</span>
              </button>
            </li>
            <li className={`nav-item ${tab === 'solicitudes' ? 'active' : ''}`}>
              <button onClick={() => setTab('solicitudes')}>
                <Users size={18} />
                <span>Solicitudes</span>
                {countNuevas > 0 && <span className="nav-badge">{countNuevas}</span>}
              </button>
            </li>
            <li className={`nav-item ${tab === 'plantillas' ? 'active' : ''}`}>
              <button onClick={() => setTab('plantillas')}>
                <MessageSquare size={18} />
                <span>Plantillas</span>
              </button>
            </li>
            <li className={`nav-item ${tab === 'stats' ? 'active' : ''}`}>
              <button onClick={() => setTab('stats')}>
                <BarChart3 size={18} />
                <span>Estadísticas</span>
              </button>
            </li>
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
                <span>Gestión Personal</span>
              </button>
            </li>
            )}
            {tabsPermitidas.includes('integraciones') && (
            <li className={`nav-item ${tab === 'integraciones' ? 'active' : ''}`}>
              <button onClick={() => setTab('integraciones')}>
                <Code size={18} />
                <span>Integraciones y API</span>
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administre y publique los cursos ofrecidos por su centro</p>
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
                  <span className="metric-label">Solicitudes Nuevas (Semana)</span>
                  <span className="metric-icon-box"><Users size={20} /></span>
                </div>
                <span className="metric-value">{stats?.solicitudes_nuevas_semana || 0}</span>
              </div>
              <div className="metric-card">
                <div className="metric-header-row">
                  <span className="metric-label">Cursos Publicados</span>
                  <span className="metric-icon-box"><BookOpen size={20} /></span>
                </div>
                <span className="metric-value">{cursos.filter(c => c.estado === 'publicado').length}</span>
              </div>
              <div className="metric-card">
                <div className="metric-header-row">
                  <span className="metric-label">Visitas a las Fichas</span>
                  <span className="metric-icon-box"><BarChart3 size={20} /></span>
                </div>
                <span className="metric-value">{stats?.visitas_totales || 0}</span>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Tabla de Cursos */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">Listado de Cursos</h3>
                </div>
                
                {cursos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tiene ningún curso publicado. Comience publicando su primer curso.</p>
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
                <h3 className="activity-title">Actividad Reciente</h3>
                <ul className="activity-feed-list">
                  {getDynamicActivity().map((act) => (
                    <li key={act.id} className="activity-item">
                      <div className="activity-dot"></div>
                      <div>
                        <div className="activity-text">{act.text}</div>
                        {act.time && <span className="activity-time">{act.time}</span>}
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
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Solicitudes (Leads)</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestione las solicitudes recibidas de alumnos y póngase en contacto rápidamente</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, maxWidth: '520px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Buscar alumno, curso, email..." 
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
                  <option value="todos">Todos los leads</option>
                  <option value="nuevos">Sólo Nuevos</option>
                  <option value="gestionados">Sólo Gestionados</option>
                </select>
              </div>

              <a href={`${API_BASE}/solicitudes/export`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Download size={18} />
                <span>Exportar CSV</span>
              </a>
            </div>

            <div className="alert-box alert-info">
              <HelpCircle size={20} />
              <span><strong>Consejo de conversión:</strong> Responder a las solicitudes de plaza en menos de 24 horas duplica la tasa de matriculación final de los alumnos.</span>
            </div>

            {/* Tabla de Solicitudes */}
            <div className="table-container">
              {solicitudes.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h3 className="empty-state-title">Aún no tiene solicitudes</h3>
                  <p className="empty-state-desc">Las solicitudes de los alumnos aparecerán aquí en cuanto se inscriban en sus cursos.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
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
                                <Phone size={10} style={{ display: 'inline', marginRight: '4px' }} /> {s.telefono} | <Mail size={10} style={{ display: 'inline', marginRight: '4px' }} /> {s.email}
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
                            <button 
                              onClick={() => handleToggleLeadGestionado(s)} 
                              className="btn btn-secondary btn-sm"
                              title={s.gestionado ? 'Marcar como nuevo' : 'Marcar como gestionado'}
                              style={{ display: 'flex', alignItems: 'center' }}
                            >
                              {s.gestionado ? <X size={14} /> : <Check size={14} />}
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
                <span className="metric-label">Visitas Totales</span>
                <span className="metric-value">{stats?.visitas_totales || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Solicitudes Recibidas</span>
                <span className="metric-value">{stats?.solicitudes_totales || 0}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Ratio de Conversión</span>
                <span className="metric-value">
                  {stats?.visitas_totales > 0 
                    ? `${((stats.solicitudes_totales / stats.visitas_totales) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Visitas por Curso</h3>
                
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
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Captación Mensual (Leads)</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', padding: '10px 0', borderBottom: '1px solid var(--lines)' }}>
                  {[
                    { month: 'Ene', leads: 12 },
                    { month: 'Feb', leads: 18 },
                    { month: 'Mar', leads: 24 },
                    { month: 'Abr', leads: 32 },
                    { month: 'May', leads: stats?.solicitudes_totales || 40 },
                    { month: 'Jun', leads: solicitudes.length }
                  ].map((m, idx) => {
                    const heightPct = Math.max(10, Math.min(100, (m.leads / 50) * 100));
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent)' }}>{m.leads}</span>
                        <div style={{ 
                          width: '24px', 
                          height: `${heightPct}px`, 
                          backgroundColor: idx === 5 ? 'var(--accent)' : 'var(--primary)', 
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }}></div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLAN Y FACTURAS */}
        {tab === 'plan' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Suscripción y Facturación</h1>

            {pagoAviso === 'ok' && (
              <div className="alert-box alert-info">
                <CheckCircle size={20} />
                <span>¡Gracias! Su suscripción se ha activado. Puede tardar unos segundos en aparecer aquí.</span>
              </div>
            )}
            {pagoAviso === 'cancelado' && (
              <div className="alert-box alert-warning">
                <span>No se ha completado el pago. Puede intentarlo de nuevo cuando quiera.</span>
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
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Su suscripción</h3>

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
                    <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', margin: '1.5rem 0 0.5rem' }}>Elija su plan</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {pagos?.dias_prueba > 2
                        ? `Añada su tarjeta ahora y no se le cobrará nada hasta que acabe la prueba (${new Date(String(pagos.prueba_hasta).replace(' ', 'T') + 'Z').toLocaleDateString('es-ES')}). Puede cancelar cuando quiera.`
                        : 'El cobro es mensual y puede cancelar cuando quiera.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                      {PLANES.map((pl) => (
                        <div key={pl.id} style={{ border: `1px solid ${pl.id === 'pro' ? 'var(--accent)' : 'var(--lines)'}`, padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                          <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.875rem' }}>Plan {pl.nombre}</h5>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0', flex: 1 }}>{pl.descripcion}</p>
                          <div style={{ fontWeight: 'bold', fontSize: '0.875rem', margin: '0.5rem 0' }}>{pl.precio}</div>
                          {pl.id === 'custom' ? (
                            <a href={`mailto:${DATOS_LEGALES.email}?subject=Plan%20Custom%20Cursenda`} className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>Contactar</a>
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
                        El pago con tarjeta se activará muy pronto. Mientras tanto, para contratar escríbanos a <a href={`mailto:${DATOS_LEGALES.email}`}>{DATOS_LEGALES.email}</a>.
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
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Plantillas de Contacto</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Personalice respuestas automáticas rápidas para contactar a los alumnos</p>
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
              <span>Personalice las respuestas automáticas para contactar a los alumnos con un solo clic. Copie el contenido del portapapeles y péguelo en su cliente de WhatsApp o correo electrónico.</span>
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
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Gestión de Personal</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administre los usuarios que tienen acceso de gestión para su centro</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '2rem' }}>
              {/* Tabla de Gestores */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">Equipo de {confRazonSocial || user?.nombre || 'Mi Centro'}</h3>
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
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Integraciones y API</h1>

            {/* Widget para la web del centro */}
            <div className="table-container" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Sus cursos en su propia web</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '60ch' }}>
                Pegue este código en la página de su web donde quiera mostrar sus cursos. Se actualiza solo cuando publica o pausa un curso, y las solicitudes le llegan a este panel.
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
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Si su web la lleva otra persona, envíele este código.</span>
              </div>
            </div>

            <div className="alert-box alert-info">
              <Code size={20} />
              <span>Conecte Cursenda con sus herramientas internas (Moodle, HubSpot, Salesforce) para exportar automáticamente sus leads.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Claves de API de Producción</h3>
                
                <div style={{ backgroundColor: '#FAF9F6', border: '1px solid var(--lines)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Live API Token</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '700', wordBreak: 'break-all' }}>{apiToken || 'Generando token...'}</code>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {apiRegenSuccess && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginRight: '0.5rem', fontWeight: 600 }}>✓ Regenerada</span>
                      )}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(apiToken);
                          setCopiedApiToken(true);
                          setTimeout(() => setCopiedApiToken(false), 2000);
                        }} 
                        className={`btn ${copiedApiToken ? 'btn-success' : 'btn-secondary'} btn-sm`}
                      >
                        {copiedApiToken ? '¡Copiado!' : 'Copiar'}
                      </button>
                      <button 
                        onClick={handleRegenerateApiKey} 
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--error-text)' }}
                      >
                        Regenerar
                      </button>
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '1rem' }}>Webhooks activos</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Configure una dirección URL para recibir una notificación HTTPS POST automática cada vez que un alumno solicite plaza.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="https://mi-crm.com/webhooks/leads" 
                    value={webhookUrl} 
                    onChange={(e) => setWebhookUrl(e.target.value)} 
                  />
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={handleSaveWebhook} className="btn btn-primary btn-sm">Guardar webhook</button>
                    {webhookSaveSuccess && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--success-text)', fontWeight: 600 }}>✓ Webhook guardado correctamente</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Guía Rápida de API</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.45' }}>Realice consultas HTTPS GET para descargar su listado de solicitudes en formato JSON desde otros sistemas:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase' }}>Ejemplo cURL</span>
                    <pre style={{ backgroundColor: 'var(--primary-dark)', color: 'var(--white)', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace', marginTop: '0.25rem' }}>
{`curl -X GET "${window.location.origin}/api/public/solicitudes" \\
  -H "Authorization: Bearer ${apiToken || 'TU_API_TOKEN'}"`}
                    </pre>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase' }}>Ejemplo Node.js</span>
                    <pre style={{ backgroundColor: 'var(--primary-dark)', color: 'var(--white)', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace', marginTop: '0.25rem' }}>
{`fetch("${window.location.origin}/api/public/solicitudes", {
  headers: {
    "Authorization": "Bearer ${apiToken || 'TU_API_TOKEN'}"
  }
})
.then(res => res.json())
.then(data => console.log(data));`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Configuración del Centro</h1>

            <div className="table-container" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Perfil y Detalles Legales</h3>
              
              {confSaveSuccess && (
                <div className="alert-box alert-info" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                  Cambios del perfil del centro guardados correctamente.
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
                  setConfError('Error de red. Inténtelo de nuevo.');
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Nombre Comercial del Centro</label>
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
                    <label className="form-label">CIF / NIF Legal</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={confCif}
                      onChange={(e) => setConfCif(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono de Atención</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      value={confTelefono}
                      onChange={(e) => setConfTelefono(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección Física del Centro</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={confDireccion}
                    onChange={(e) => setConfDireccion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Sitio Web Oficial</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      value={confWeb}
                      onChange={(e) => setConfWeb(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email de Contacto</label>
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
              <h3 className="modal-title">{selectedCurso ? 'Editar Curso' : 'Publicar Nuevo Curso'}</h3>
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
                    placeholder="Ej: Curso Superior de Programación"
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
                    <label className="form-label">Localidad / Zona *</label>
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
                    <label className="form-label">Plazas ofertadas *</label>
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
                      placeholder="Ej: Inmediata, Septiembre..."
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
                    placeholder="Contenido, requisitos, titulación..."
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCursoModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar y publicar</button>
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
              <h3 className="modal-title">Ficha del Alumno</h3>
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
                  <label className="form-label">Registrar acción o nota de contacto</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Ej: Llamado hoy. No responde, reintentar mañana..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ float: 'right' }}>Guardar nota y gestionar</button>
                <div style={{ clear: 'both' }}></div>
              </form>

              {/* Historial */}
              <div className="contact-history">
                <h4 className="contact-history-title">Historial de gestiones</h4>
                <div className="notes-timeline">
                  {leadNotes.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center' }}>No hay anotaciones previas para este alumno.</div>
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
              <h3 className="modal-title">{selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Contacto'}</h3>
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
                  <label className="form-label">Título de la plantilla *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej: Primer contacto WhatsApp"
                    value={formTemplateTitulo}
                    onChange={(e) => setFormTemplateTitulo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Canal de comunicación *</label>
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
                  <label className="form-label">Contenido del mensaje *</label>
                  <textarea 
                    className="form-control" 
                    rows={6} 
                    placeholder="Escriba aquí el mensaje. Puede usar variables como [Nombre], [Curso], [Centro], [Fecha]..."
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
  );
}

export default App;
