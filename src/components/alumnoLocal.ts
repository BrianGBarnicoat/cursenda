import { useCallback, useEffect, useState } from 'react';
import type { DatosAlumno } from './StudentArea';

// Mientras no haya cuentas de alumno en el servidor, su perfil, los cursos que guarda y las solicitudes
// que envía se apuntan solo en su navegador. No salen de su aparato.
const CLAVE = 'cursenda-alumno';
const AVISO = 'cursenda-alumno-cambio';

export type CursoGuardado = { id: number | string; titulo: string; centro_nombre?: string | null; modalidad?: string | null; localidad?: string | null };
/** Una solicitud enviada. Con el código, el servidor dice cómo va; sin él solo se sabe que se envió. */
export type SolicitudEnviada = { codigo: string | null; curso_id: number | string; titulo: string; centro: string; fecha: string };

type Guardado = { alumno: DatosAlumno; cursos: CursoGuardado[]; solicitudes: SolicitudEnviada[] };

const VACIO: Guardado = { alumno: { nombre: '', email: '', telefono: '', provincia: '', situacion: '' }, cursos: [], solicitudes: [] };
const mismo = (a: unknown, b: unknown) => String(a) === String(b);

function leer(): Guardado {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!datos || typeof datos !== 'object') return VACIO;
    const cursos: any[] = Array.isArray(datos.cursos) ? datos.cursos.filter((c: any) => c && c.id != null && typeof c.titulo === 'string') : [];
    const solicitudes: SolicitudEnviada[] = Array.isArray(datos.solicitudes) ? datos.solicitudes.filter((s: any) => s && s.curso_id != null && typeof s.titulo === 'string') : [];
    // Antes las solicitudes enviadas iban mezcladas con los cursos guardados: se pasan a su sitio
    const antiguas = cursos.filter(c => c.estado === 'enviada' && !solicitudes.some(s => mismo(s.curso_id, c.id)))
      .map(c => ({ codigo: null, curso_id: c.id, titulo: c.titulo, centro: c.centro_nombre || '', fecha: '' }));
    return {
      alumno: { ...VACIO.alumno, ...(datos.alumno || {}) },
      cursos: cursos.filter(c => c.estado !== 'enviada').map(({ id, titulo, centro_nombre, modalidad, localidad }) => ({ id, titulo, centro_nombre, modalidad, localidad })),
      solicitudes: [...solicitudes, ...antiguas],
    };
  } catch {
    return VACIO; // navegación privada o datos estropeados
  }
}

export function useAlumnoLocal() {
  const [guardado, setGuardado] = useState<Guardado>(leer);

  // Si cambia en otra pestaña o en otra parte de la página, se pone al día
  useEffect(() => {
    const alCambiar = () => setGuardado(leer());
    window.addEventListener('storage', alCambiar);
    window.addEventListener(AVISO, alCambiar);
    return () => {
      window.removeEventListener('storage', alCambiar);
      window.removeEventListener(AVISO, alCambiar);
    };
  }, []);

  // Lanza un error si el navegador no deja guardar, para que quien llama pueda avisar
  const escribir = useCallback((cambio: (antes: Guardado) => Guardado) => {
    const nuevo = cambio(leer());
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    setGuardado(nuevo);
    window.dispatchEvent(new Event(AVISO));
  }, []);

  const guardarAlumno = useCallback((alumno: DatosAlumno) => escribir(g => ({ ...g, alumno })), [escribir]);
  const quitarCurso = useCallback((id: CursoGuardado['id']) => escribir(g => ({ ...g, cursos: g.cursos.filter(c => !mismo(c.id, id)) })), [escribir]);
  // Si el curso ya estaba, lo quita; si no, lo añade
  const alternarCurso = useCallback((curso: CursoGuardado) => escribir(g => ({
    ...g,
    cursos: g.cursos.some(c => mismo(c.id, curso.id)) ? g.cursos.filter(c => !mismo(c.id, curso.id)) : [...g.cursos, curso],
  })), [escribir]);

  // Al pedir plaza de verdad, la solicitud pasa al historial y el curso deja de estar "guardado"
  const apuntarSolicitud = useCallback((s: SolicitudEnviada) => escribir(g => ({
    ...g,
    cursos: g.cursos.filter(c => !mismo(c.id, s.curso_id)),
    solicitudes: [s, ...g.solicitudes.filter(x => !mismo(x.curso_id, s.curso_id))],
  })), [escribir]);

  const borrarTodo = useCallback(() => {
    localStorage.removeItem(CLAVE);
    setGuardado(VACIO);
    window.dispatchEvent(new Event(AVISO));
  }, []);

  return { ...guardado, guardarAlumno, quitarCurso, alternarCurso, apuntarSolicitud, borrarTodo };
}
