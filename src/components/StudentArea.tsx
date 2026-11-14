import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import './StudentArea.css';

export type SituacionLaboral = 'Desempleados' | 'Ocupados';

export type DatosAlumno = {
  nombre: string;
  email: string;
  telefono: string;
  provincia: string;
  situacion: SituacionLaboral | '';
};

/** Un curso guardado, con lo que hace falta para compararlo con otros. */
export type CursoComparable = {
  id: number | string;
  titulo: string;
  centro_nombre?: string | null;
  modalidad?: string | null;
  lugar?: string | null;
  duracion_horas?: number | null;
  fecha_inicio?: string | null;
  plazas_libres?: number | null;
  dirigido_a?: string | null;
  requisitos?: string | null;
  /** false si el curso ya no está publicado. */
  disponible?: boolean;
};

export type EstadoSolicitud = 'enviada' | 'recibida' | 'contactada' | 'matriculada' | 'cerrada';

export type SolicitudHistorial = {
  curso_id: number | string;
  titulo: string;
  centro: string;
  /** Fecha en texto ya legible, o vacío si no se sabe. */
  fecha: string;
  estado: EstadoSolicitud;
};

type Props = {
  alumno: DatosAlumno;
  guardados: CursoComparable[];
  solicitudes: SolicitudHistorial[];
  /** Guarda el perfil. Si falla, debe lanzar un error para que se avise al alumno. */
  onGuardar: (datos: DatosAlumno) => Promise<void> | void;
  onQuitar: (curso: CursoComparable) => void;
  /** Borra del navegador el perfil, los cursos y el historial. */
  onBorrarTodo: () => void;
  /** Si se pasan, la provincia se elige de una lista; si no, se escribe. */
  provincias?: string[];
};

const SITUACIONES: { valor: SituacionLaboral; texto: string }[] = [
  { valor: 'Desempleados', texto: 'Estoy en paro' },
  { valor: 'Ocupados', texto: 'Estoy trabajando' },
];

const ESTADOS: Record<EstadoSolicitud, { texto: string; detalle: string }> = {
  enviada: { texto: 'Enviada', detalle: 'El centro tiene tus datos.' },
  recibida: { texto: 'Recibida por el centro', detalle: 'Todavía no te han llamado.' },
  contactada: { texto: 'El centro te ha contactado', detalle: 'Están viendo contigo los requisitos.' },
  matriculada: { texto: 'Plaza confirmada', detalle: 'El centro te ha apuntado al curso.' },
  cerrada: { texto: 'Cerrada', detalle: 'El centro ha cerrado esta solicitud.' },
};

const textoSituacion = (v: DatosAlumno['situacion']) => SITUACIONES.find(s => s.valor === v)?.texto ?? '';
const nombreModalidad = (m?: string | null) => (m === 'Mixta' ? 'Semipresencial' : m || '');
const PARA: Record<string, string> = { Desempleados: 'Personas en paro', Ocupados: 'Personas que trabajan', Todos: 'En paro o trabajando' };

// Las filas del comparador: qué se mira y de dónde sale
const FILAS: { titulo: string; valor: (c: CursoComparable) => string }[] = [
  { titulo: 'Centro', valor: c => c.centro_nombre || '' },
  { titulo: 'Empieza', valor: c => c.fecha_inicio || '' },
  { titulo: 'Horas', valor: c => (c.duracion_horas ? `${c.duracion_horas} horas` : '') },
  { titulo: 'Modalidad', valor: c => nombreModalidad(c.modalidad) },
  { titulo: 'Dónde', valor: c => (c.modalidad === 'Online' ? 'Desde casa' : c.lugar || '') },
  { titulo: 'Plazas libres', valor: c => (c.plazas_libres == null ? '' : String(c.plazas_libres)) },
  { titulo: 'Para quién', valor: c => PARA[c.dirigido_a || ''] || '' },
  { titulo: 'Requisitos', valor: c => c.requisitos || '' },
];

export default function StudentArea({ alumno, guardados, solicitudes, onGuardar, onQuitar, onBorrarTodo, provincias }: Props) {
  const perfilVacio = !alumno.nombre && !alumno.email && !alumno.telefono;
  const [editando, setEditando] = useState(perfilVacio);
  const [borrador, setBorrador] = useState<DatosAlumno>(alumno);
  const [guardando, setGuardando] = useState(false);
  const [errorDatos, setErrorDatos] = useState('');
  const id = useId();

  // Si los datos cambian fuera y no se está editando, el formulario se pone al día
  useEffect(() => { if (!editando) setBorrador(alumno); }, [alumno, editando]);

  const cambiar = <K extends keyof DatosAlumno>(clave: K, valor: DatosAlumno[K]) => setBorrador(b => ({ ...b, [clave]: valor }));
  const cancelar = () => { setBorrador(alumno); setErrorDatos(''); setEditando(false); };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setErrorDatos('');
    try {
      await onGuardar({
        ...borrador,
        nombre: borrador.nombre.trim(),
        email: borrador.email.trim(),
        telefono: borrador.telefono.trim(),
        provincia: borrador.provincia.trim(),
      });
      setEditando(false);
    } catch {
      setErrorDatos('No se han podido guardar los datos. Comprueba que tu navegador deja guardar y vuelve a intentarlo.');
    } finally {
      setGuardando(false);
    }
  };

  const borrarTodo = () => {
    if (!window.confirm('Se borrarán de este navegador tu perfil, tus cursos guardados y tu historial. ¿Seguir?')) return;
    onBorrarTodo();
    setBorrador({ nombre: '', email: '', telefono: '', provincia: '', situacion: '' });
    setEditando(true);
  };

  const nombreDePila = alumno.nombre.trim().split(/\s+/)[0];
  const completo = !!(alumno.nombre && alumno.email && alumno.telefono);
  const datos: [string, string][] = [
    ['Nombre', alumno.nombre],
    ['Email', alumno.email],
    ['Teléfono', alumno.telefono],
    ['Provincia', alumno.provincia],
    ['Situación laboral', textoSituacion(alumno.situacion)],
  ];
  // En el comparador solo salen las filas en las que algún curso tiene algo que decir
  const filas = FILAS.filter(f => guardados.some(c => f.valor(c)));

  return (
    <section className="alumno-a">
      <div className="alumno-a-ancho">
        <header className="alumno-a-cabecera">
          <h1>{nombreDePila ? `Hola, ${nombreDePila}.` : 'Mi espacio.'}</h1>
          <p>
            Tu perfil, los cursos que comparas y las plazas que has pedido. Todo se guarda solo en este navegador.{' '}
            <button type="button" className="alumno-a-enlace" onClick={borrarTodo}>Borrar todo</button>
          </p>
        </header>

        <ul className="alumno-a-resumen" aria-label="Resumen">
          <li><strong>{completo ? 'Listo' : 'Sin completar'}</strong><span>Perfil para pedir plaza</span></li>
          <li><strong>{guardados.length}</strong><span>{guardados.length === 1 ? 'Curso guardado' : 'Cursos guardados'}</span></li>
          <li><strong>{solicitudes.length}</strong><span>{solicitudes.length === 1 ? 'Plaza pedida' : 'Plazas pedidas'}</span></li>
        </ul>

        <div className="alumno-a-rejilla">
          {/* a) Perfil */}
          <section className="alumno-a-bloque" aria-labelledby={`${id}-perfil`}>
            <div className="alumno-a-bloque-cabecera">
              <h2 id={`${id}-perfil`}>Tu perfil</h2>
              {!editando && <button type="button" className="alumno-a-boton claro" onClick={() => setEditando(true)}>Editar</button>}
            </div>
            <p className="alumno-a-para">Con estos datos, el formulario de «Pedir plaza» sale ya relleno en cualquier curso: solo tienes que aceptar y enviar.</p>

            {!editando ? (
              <dl className="alumno-a-datos">
                {datos.map(([nombre, valor]) => (
                  <div key={nombre}>
                    <dt>{nombre}</dt>
                    <dd className={valor ? undefined : 'vacio'}>{valor || 'Sin indicar'}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <form className="alumno-a-formulario" onSubmit={guardar}>
                <label>
                  <span>Nombre y apellidos</span>
                  <input required maxLength={120} autoComplete="name" value={borrador.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input required type="email" maxLength={200} autoComplete="email" value={borrador.email} onChange={(e) => cambiar('email', e.target.value)} />
                </label>
                <label>
                  <span>Teléfono</span>
                  <input required type="tel" maxLength={20} autoComplete="tel" inputMode="tel" value={borrador.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
                </label>
                <label>
                  <span>Provincia</span>
                  {provincias?.length ? (
                    <select value={borrador.provincia} onChange={(e) => cambiar('provincia', e.target.value)}>
                      <option value="">Sin indicar</option>
                      {/* Si la provincia guardada no está en la lista, no se pierde */}
                      {borrador.provincia && !provincias.includes(borrador.provincia) && <option value={borrador.provincia}>{borrador.provincia}</option>}
                      {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input maxLength={80} autoComplete="address-level1" value={borrador.provincia} onChange={(e) => cambiar('provincia', e.target.value)} />
                  )}
                </label>
                <label>
                  <span>Situación laboral</span>
                  <select value={borrador.situacion} onChange={(e) => cambiar('situacion', e.target.value as DatosAlumno['situacion'])}>
                    <option value="">Sin indicar</option>
                    {SITUACIONES.map(s => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                  </select>
                </label>

                {errorDatos && <p className="alumno-a-error" role="alert">{errorDatos}</p>}

                <div className="alumno-a-acciones">
                  <button type="submit" className="alumno-a-boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar perfil'}</button>
                  {!perfilVacio && <button type="button" className="alumno-a-boton claro" onClick={cancelar} disabled={guardando}>Cancelar</button>}
                </div>
              </form>
            )}
          </section>

          {/* c) Historial de solicitudes */}
          <section className="alumno-a-bloque" aria-labelledby={`${id}-historial`}>
            <div className="alumno-a-bloque-cabecera">
              <h2 id={`${id}-historial`}>Plazas que has pedido</h2>
            </div>
            <p className="alumno-a-para">El estado lo pone el centro según avanza contigo. Solo se ven las que has enviado desde este navegador.</p>

            {solicitudes.length === 0 ? (
              <div className="alumno-a-vacio">
                <p>Todavía no has pedido plaza en ningún curso.</p>
                <Link to="/cursos" className="alumno-a-boton">Ver cursos</Link>
              </div>
            ) : (
              <ul className="alumno-a-historial">
                {solicitudes.map(s => (
                  <li key={String(s.curso_id)}>
                    <div>
                      <Link to={`/curso/${s.curso_id}`}>{s.titulo}</Link>
                      <p>{[s.centro, s.fecha].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="alumno-a-estado-caja">
                      <span className={`alumno-a-estado ${s.estado}`}>{ESTADOS[s.estado].texto}</span>
                      <small>{ESTADOS[s.estado].detalle}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* b) Comparador */}
        <section className="alumno-a-bloque alumno-a-comparador" aria-labelledby={`${id}-comparar`}>
          <div className="alumno-a-bloque-cabecera">
            <h2 id={`${id}-comparar`}>Compara tus cursos guardados</h2>
          </div>
          <p className="alumno-a-para">Guarda cursos con «Guardar en mi espacio» y aquí los ves uno al lado del otro.</p>

          {guardados.length === 0 ? (
            <div className="alumno-a-vacio">
              <p>No tienes cursos guardados.</p>
              <Link to="/#buscar-cursos" className="alumno-a-boton">Buscar cursos</Link>
            </div>
          ) : (
            <>
            {/* En móvil, una tarjeta por curso */}
            <ul className="alumno-a-tarjetas">
              {guardados.map(c => (
                <li key={String(c.id)}>
                  <Link to={`/curso/${c.id}`}>{c.titulo}</Link>
                  {c.disponible === false && <span className="alumno-a-estado cerrada">Ya no está publicado</span>}
                  <dl>
                    {filas.filter(f => f.valor(c)).map(f => <div key={f.titulo}><dt>{f.titulo}</dt><dd>{f.valor(c)}</dd></div>)}
                  </dl>
                  <div className="alumno-a-acciones">
                    {c.disponible !== false && <Link to={`/curso/${c.id}#pedir`} className="alumno-a-boton verde">Pedir plaza</Link>}
                    <button type="button" className="alumno-a-enlace" aria-label={`Quitar ${c.titulo}`} onClick={() => onQuitar(c)}>Quitar</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="alumno-a-tabla-caja" role="region" aria-label="Comparador de cursos" tabIndex={0}>
              <table className="alumno-a-tabla">
                <thead>
                  <tr>
                    <td />
                    {guardados.map(c => (
                      <th key={String(c.id)} scope="col">
                        <Link to={`/curso/${c.id}`}>{c.titulo}</Link>
                        {c.disponible === false && <span className="alumno-a-estado cerrada">Ya no está publicado</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map(f => (
                    <tr key={f.titulo}>
                      <th scope="row">{f.titulo}</th>
                      {guardados.map(c => <td key={String(c.id)}>{f.valor(c) || <span className="alumno-a-nada">Sin indicar</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td />
                    {guardados.map(c => (
                      <td key={String(c.id)}>
                        <div className="alumno-a-acciones">
                          {c.disponible !== false && <Link to={`/curso/${c.id}#pedir`} className="alumno-a-boton verde">Pedir plaza</Link>}
                          <button type="button" className="alumno-a-enlace" aria-label={`Quitar ${c.titulo}`} onClick={() => onQuitar(c)}>Quitar</button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
