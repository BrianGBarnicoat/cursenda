import { useId } from 'react';
import { Link } from 'react-router-dom';
import './CompaniesSection.css';

type Punto = { titulo: string; texto: string };

const PUNTOS: Punto[] = [
  { titulo: 'Publica tus cursos', texto: 'Sube tu oferta subvencionada y aparece ante quien la está buscando.' },
  { titulo: 'Recibe solicitudes', texto: 'Cada petición de plaza llega a tu panel con los datos del alumno.' },
  { titulo: 'Llena tus grupos', texto: 'Contacta con cada persona y lleva la matrícula desde un solo sitio.' },
];

type Props = {
  /** A dónde lleva "Publicar cursos". */
  destino?: string;
  /** A dónde lleva "Ya tengo cuenta". */
  destinoEntrar?: string;
  puntos?: Punto[];
};

export default function CompaniesSection({ destino = '/centros#acceso', destinoEntrar = '/centros/login', puntos = PUNTOS }: Props) {
  const idTitulo = useId();

  return (
    <section className="centros-s" id="empresas" aria-labelledby={idTitulo}>
      <div className="centros-s-ancho">
        <p className="centros-s-etiqueta">Centros de formación y empresas</p>

        <div className="centros-s-cabecera">
          <h2 id={idTitulo}>Tus cursos, delante de quien los busca.</h2>
          <div className="centros-s-lado">
            <p>
              Si tu centro está homologado para impartir formación subvencionada, publica tu oferta en Cursenda
              y recibe las solicitudes de plaza directamente.
            </p>
            <div className="centros-s-acciones">
              <Link to={destino} className="centros-s-boton">Publicar cursos</Link>
              <Link to={destinoEntrar} className="centros-s-enlace">Ya tengo cuenta</Link>
            </div>
          </div>
        </div>

        <ol className="centros-s-puntos">
          {puntos.map((p, i) => (
            <li key={p.titulo}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
