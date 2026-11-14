import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import AlBajar from './AlBajar';
import './AreasSection.css';

export type Area = { nombre: string; destino: string; cursos: number };

type Props = {
  areas: Area[];
  /** Cuántas se ven antes de pulsar "Ver todas". */
  visibles?: number;
};

export default function AreasSection({ areas, visibles = 9 }: Props) {
  const [todas, setTodas] = useState(false);
  const idTitulo = useId();
  // Primero las que tienen cursos
  const ordenadas = [...areas].sort((a, b) => b.cursos - a.cursos || a.nombre.localeCompare(b.nombre, 'es'));
  const lista = todas ? ordenadas : ordenadas.slice(0, visibles);

  return (
    <section className="areas-s" id="areas" aria-labelledby={idTitulo}>
      <div className="areas-s-ancho">
        <AlBajar como="header" className="areas-s-cabecera">
          <h2 id={idTitulo}>Elige un área.</h2>
          <p>Los cursos están ordenados por lo que se aprende en ellos. Entra en un área y verás solo los suyos.</p>
        </AlBajar>

        <AlBajar>
          <ul className="areas-s-rejilla">
            {lista.map(a => (
              <li key={a.nombre}>
                <Link to={a.destino}>
                  <strong>{a.nombre}</strong>
                  <span>{a.cursos === 0 ? 'Sin cursos ahora' : a.cursos === 1 ? '1 curso' : `${a.cursos} cursos`}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!todas && ordenadas.length > visibles && (
            <button type="button" className="areas-s-mas" onClick={() => setTodas(true)}>Ver todas las áreas</button>
          )}
        </AlBajar>
      </div>
    </section>
  );
}
