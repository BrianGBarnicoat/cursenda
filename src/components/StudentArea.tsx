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

export type EstadoSolicitud = 'pendiente' | 'enviada' | 'aceptada' | 'rechazada';

export type CursoSeleccionado = {
  id: number | string;
  titulo: string;
  centro_nombre?: string | null;
  modalidad?: string | null;
  localidad?: string | null;
  estado: EstadoSolicitud;
};

type Props = {
  alumno: DatosAlumno;
  cursos: CursoSeleccionado[];
  /** Guarda los datos. Si falla, debe lanzar un error para que se avise al alumno. */
  onGuardar: (datos: DatosAlumno) => Promise<void> | void;
  /** Quita un curso de la lista. Si falla, debe lanzar un error. */
  onQuitar: (curso: CursoSeleccionado) => Promise<void> | void;
  /** Borra del navegador los datos y los cursos. Si se pasa, sale el aviso de que todo se guarda aquí. */
  onBorrarTodo?: () => void;
  /** Si se pasan, la provincia se elige de una lista; si no, se escribe. */
  provincias?: string[];
};

const SITUACIONES: { valor: SituacionLaboral; texto: string }[] = [
  { valor: 'Desempleados', texto: 'Estoy en paro' },
  { valor: 'Ocupados', texto: 'Estoy trabajando' },
];

const ESTADOS: Record<EstadoSolicitud, string> = {
  pendiente: 'Guardado',
  enviada: 'Plaza pedida',
  aceptada: 'Plaza confirmada',
  rechazada: 'Sin plaza',
};

const textoSituacion = (v: DatosAlumno['situacion']) => SITUACIONES.find(s => s.valor === v)?.texto ?? '';

export default function StudentArea({ alumno, cursos, onGuardar, onQuitar, onBorrarTodo, provincias }: Props) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<DatosAlumno>(alumno);
  const [guardando, setGuardando] = useState(false);
  const [errorDatos, setErrorDatos] = useState('');
  const [aQuitar, setAQuitar] = useState<CursoSeleccionado['id'] | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [errorCursos, setErrorCursos] = useState('');
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
      setErrorDatos('No se han podido guardar los datos. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (curso: CursoSeleccionado) => {
    if (quitando) return;
    setQuitando(true);
    setErrorCursos('');
    try {
      await onQuitar(curso);
      setAQuitar(null);
    } catch {
      setErrorCursos('No se ha podido quitar el curso. Vuelve a intentarlo.');
    } finally {
      setQuitando(false);
    }
  };

  const borrarTodo = () => {
    if (!window.confirm('Se borrarán tus datos y tus cursos guardados de este navegador. ¿Seguir?')) return;
    setEditando(false);
    setAQuitar(null);
    onBorrarTodo?.();
  };

  const nombreDePila = alumno.nombre.trim().split(/\s+/)[0];
  const datos: [string, string][] = [
    ['Nombre', alumno.nombre],
    ['Email', alumno.email],
    ['Teléfono', alumno.telefono],
    ['Provincia', alumno.provincia],
    ['Situación laboral', textoSituacion(alumno.situacion)],
  ];

  return (
    <section className="alumno-a">
      <div className="alumno-a-ancho">
        <header className="alumno-a-cabecera">
          <h1>{nombreDePila ? `Hola, ${nombreDePila}.` : 'Mi espacio.'}</h1>
        </header>

        {onBorrarTodo && (
          <p className="alumno-a-aviso">
            Tus datos y tus cursos se guardan solo en este navegador. No se envían a nadie hasta que pides plaza en un curso.{' '}
            <button type="button" className="alumno-a-enlace" onClick={borrarTodo}>Borrar todo</button>
          </p>
        )}

        <div className="alumno-a-bloques">
          <section className="alumno-a-bloque" aria-labelledby={`${id}-datos`}>
            <div className="alumno-a-bloque-cabecera">
              <h2 id={`${id}-datos`}>Tus datos de contacto</h2>
              {!editando && <button type="button" className="alumno-a-boton claro" onClick={() => setEditando(true)}>Editar</button>}
            </div>
            <p className="alumno-a-para">Con ellos se rellena solo el formulario cuando pides plaza en un curso. Así no los escribes cada vez.</p>

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
                  <span>Nombre</span>
                  <input required maxLength={120} autoComplete="name" value={borrador.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input required type="email" maxLength={200} autoComplete="email" value={borrador.email} onChange={(e) => cambiar('email', e.target.value)} />
                </label>
                <label>
                  <span>Teléfono</span>
                  <input type="tel" maxLength={20} autoComplete="tel" inputMode="tel" value={borrador.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
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
                  <button type="submit" className="alumno-a-boton" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
                  <button type="button" className="alumno-a-boton claro" onClick={cancelar} disabled={guardando}>Cancelar</button>
                </div>
              </form>
            )}
          </section>

          <section className="alumno-a-bloque" aria-labelledby={`${id}-cursos`}>
            <div className="alumno-a-bloque-cabecera">
              <h2 id={`${id}-cursos`}>Cursos guardados</h2>
              {cursos.length > 0 && <span className="alumno-a-cuenta">{cursos.length}</span>}
            </div>
            <p className="alumno-a-para">Los cursos que guardas para mirarlos con calma y los que ya has pedido. Pide plaza cuando te decidas.</p>

            {errorCursos && <p className="alumno-a-error" role="alert">{errorCursos}</p>}

            {cursos.length === 0 ? (
              <div className="alumno-a-vacio">
                <p>Todavía no has guardado ningún curso. En cada curso tienes el botón «Guardar en mi espacio».</p>
                <Link to="/cursos" className="alumno-a-boton">Explorar cursos</Link>
              </div>
            ) : (
              <ul className="alumno-a-cursos">
                {cursos.map(c => {
                  const detalle = [c.centro_nombre, c.modalidad, c.modalidad === 'Online' ? '' : c.localidad].filter(Boolean).join(' · ');
                  return (
                    <li key={c.id}>
                      <div className="alumno-a-curso-texto">
                        <Link to={`/curso/${c.id}`}>{c.titulo}</Link>
                        {detalle && <p>{detalle}</p>}
                        <span className={`alumno-a-estado ${c.estado}`}>{ESTADOS[c.estado]}</span>
                      </div>
                      {c.estado === 'pendiente' && aQuitar !== c.id && <Link to={`/curso/${c.id}#pedir`} className="alumno-a-boton">Pedir plaza</Link>}
                      {aQuitar === c.id ? (
                        <div className="alumno-a-confirmar">
                          <button type="button" className="alumno-a-boton" onClick={() => quitar(c)} disabled={quitando}>{quitando ? 'Quitando...' : 'Sí, quitar'}</button>
                          <button type="button" className="alumno-a-enlace" onClick={() => setAQuitar(null)} disabled={quitando}>No</button>
                        </div>
                      ) : (
                        <button type="button" className="alumno-a-enlace" aria-label={`Quitar ${c.titulo}`} onClick={() => { setErrorCursos(''); setAQuitar(c.id); }}>Quitar</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
