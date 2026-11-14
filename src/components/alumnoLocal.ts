import { useCallback, useEffect, useState } from 'react';
import type { CursoSeleccionado, DatosAlumno } from './StudentArea';

// Mientras no haya cuentas de alumno en el servidor, sus datos y los cursos que elige
// se guardan solo en su navegador. No salen de su aparato.
const CLAVE = 'cursenda-alumno';
const AVISO = 'cursenda-alumno-cambio';

type Guardado = { alumno: DatosAlumno; cursos: CursoSeleccionado[] };

const VACIO: Guardado = { alumno: { nombre: '', email: '', telefono: '', provincia: '', situacion: '' }, cursos: [] };

function leer(): Guardado {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!datos || typeof datos !== 'object') return VACIO;
    return {
      alumno: { ...VACIO.alumno, ...(datos.alumno || {}) },
      cursos: Array.isArray(datos.cursos) ? datos.cursos.filter((c: any) => c && c.id != null && typeof c.titulo === 'string') : [],
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
  const quitarCurso = useCallback((id: CursoSeleccionado['id']) => escribir(g => ({ ...g, cursos: g.cursos.filter(c => String(c.id) !== String(id)) })), [escribir]);
  // Si el curso ya estaba, lo quita; si no, lo añade
  const alternarCurso = useCallback((curso: Omit<CursoSeleccionado, 'estado'>) => escribir(g => ({
    ...g,
    cursos: g.cursos.some(c => String(c.id) === String(curso.id))
      ? g.cursos.filter(c => String(c.id) !== String(curso.id))
      : [...g.cursos, { ...curso, estado: 'pendiente' }],
  })), [escribir]);

  // Al pedir plaza de verdad en la ficha, el curso queda apuntado como enviado
  const marcarEnviada = useCallback((curso: Omit<CursoSeleccionado, 'estado'>) => escribir(g => ({
    ...g,
    cursos: [...g.cursos.filter(c => String(c.id) !== String(curso.id)), { ...curso, estado: 'enviada' }],
  })), [escribir]);
  const borrarTodo = useCallback(() => {
    localStorage.removeItem(CLAVE);
    setGuardado(VACIO);
    window.dispatchEvent(new Event(AVISO));
  }, []);

  return { ...guardado, guardarAlumno, quitarCurso, alternarCurso, marcarEnviada, borrarTodo };
}
