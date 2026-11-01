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
  Edit, 
  Check, 
  BarChart3,
  Calendar,
  Settings,
  MessageSquare,
  Shield,
  Globe,
  Building,
  ChevronDown, Search,
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
    <Link to="/" className={`logo-container ${light ? 'logo-light' : ''}`} aria-label="Cursenda, ir al inicio" style={{ textDecoration: 'none', display: 'inline-flex' }}>
      <svg className="logo-marca" viewBox="4 -148 930 154" aria-hidden="true">
        <path fill="currentColor" d="M62.20 2.40L62.20 2.40Q44.80 2.40 32.60-3.60Q20.40-9.60 13.90-21.90Q7.40-34.20 7.40-52.80L7.40-52.80Q7.40-71.40 14-83.70Q20.60-96 32.80-102Q45-108 62.20-108L62.20-108Q73.40-108 82.90-105.40Q92.40-102.80 99.50-97.40Q106.60-92 110.40-83.80Q114.20-75.60 114.20-64.20L114.20-64.20L82-64.20Q82-71 79.70-75.40Q77.40-79.80 73-82Q68.60-84.20 62-84.20L62-84.20Q54.40-84.20 49.70-81Q45-77.80 42.80-71.60Q40.60-65.40 40.60-56.20L40.60-56.20L40.60-49Q40.60-40 42.80-33.80Q45-27.60 50-24.50Q55-21.40 62.80-21.40L62.80-21.40Q69.60-21.40 74.10-23.50Q78.60-25.60 81-30.10Q83.40-34.60 83.40-41.40L83.40-41.40L114.20-41.40Q114.20-30.40 110.40-22.10Q106.60-13.80 99.60-8.40Q92.60-3 83-0.30Q73.40 2.40 62.20 2.40ZM161.80 2.40L161.80 2.40Q144.80 2.40 135.50-7Q126.20-16.40 126.20-35.80L126.20-35.80L126.20-105.40L159-105.40L159-40.40Q159-36.20 160.10-33Q161.20-29.80 163.20-27.60Q165.20-25.40 168.30-24.40Q171.40-23.40 175-23.40L175-23.40Q180.80-23.40 185.20-26.10Q189.60-28.80 192.20-33.50Q194.80-38.20 194.80-43.80L194.80-43.80L194.80-105.40L227.60-105.40L227.60 0L200.60 0L198.60-15L197.20-15Q193.60-9.80 188.10-5.80Q182.60-1.80 175.90 0.30Q169.20 2.40 161.80 2.40ZM277.40 0L244.60 0L244.60-105.40L271.60-105.40L274-89.20L275.40-89.20Q277.80-94.60 281.30-98.90Q284.80-103.20 289.90-105.60Q295-108 301.20-108L301.20-108Q304.80-108 307.80-107.30Q310.80-106.60 312.20-105.80L312.20-105.80L312.20-77.20L301.80-77.20Q295.60-77.20 290.90-75.50Q286.20-73.80 283.20-70.30Q280.20-66.80 278.80-61.80Q277.40-56.80 277.40-50.20L277.40-50.20L277.40 0ZM363.20 2.40L363.20 2.40Q352.80 2.40 343.70 0.20Q334.60-2 327.70-6.20Q320.80-10.40 316.90-16.60Q313.00-22.80 313.00-31L313.00-31L313.00-32.60Q313.00-33.20 313.20-33.80L313.20-33.80L344.20-33.80L344.20-32Q344.40-27.60 347.10-24.70Q349.80-21.80 354.20-20.50Q358.60-19.20 363.80-19.20L363.80-19.20Q367.60-19.20 371.90-20Q376.20-20.80 379.20-22.80Q382.20-24.80 382.20-28.60L382.20-28.60Q382.20-32.80 378.50-35Q374.80-37.20 368.70-38.70Q362.60-40.20 355.60-41.60L355.60-41.60Q348.60-43.20 341.50-45.20Q334.40-47.20 328.50-50.70Q322.60-54.20 319.00-59.80Q315.40-65.40 315.40-74L315.40-74Q315.40-83.20 319.30-89.70Q323.20-96.20 330.00-100.20Q336.80-104.20 345.70-106Q354.60-107.80 364.60-107.80L364.60-107.80Q373.80-107.80 382.10-106Q390.40-104.20 397.10-100.50Q403.80-96.80 407.60-91.10Q411.40-85.40 411.40-77.80L411.40-77.80Q411.40-76.80 411.30-75.70Q411.20-74.60 411.20-74.20L411.20-74.20L380.40-74.20L380.40-75.80Q380.40-79.20 378.20-81.40Q376-83.60 372.20-84.90Q368.40-86.20 363.80-86.20L363.80-86.20Q360.80-86.20 357.90-85.70Q355-85.20 352.60-84.30Q350.20-83.40 348.70-81.80Q347.20-80.20 347.20-77.80L347.20-77.80Q347.20-74.80 349.80-72.90Q352.40-71 356.90-69.80Q361.40-68.60 366.80-67.20L366.80-67.20Q374.20-65.60 382.40-63.90Q390.60-62.20 397.90-59.10Q405.20-56 409.70-49.90Q414.20-43.80 414.20-33.20L414.20-33.20Q414.20-23.20 410.20-16.30Q406.20-9.40 399.20-5.30Q392.20-1.20 383 0.60Q373.80 2.40 363.20 2.40ZM477.40 2.40L477.40 2.40Q459.40 2.40 446.80-3.50Q434.20-9.40 427.50-21.60Q420.80-33.80 420.80-52.80L420.80-52.80Q420.80-71.40 427.40-83.60Q434-95.80 446.40-101.80Q458.80-107.80 476.20-107.80L476.20-107.80Q493.40-107.80 505.30-102Q517.20-96.20 523.40-84.20Q529.60-72.20 529.60-53.20L529.60-53.20L529.60-46.20L454-46.20Q454-37.80 456.40-32Q458.80-26.20 463.80-23.20Q468.80-20.20 477.20-20.20L477.20-20.20Q482.20-20.20 486-21.40Q489.80-22.60 492.40-24.90Q495-27.20 496.40-30.40Q497.80-33.60 497.80-37.60L497.80-37.60L529.60-37.60Q529.60-28 526.10-20.50Q522.60-13 515.80-7.90Q509-2.80 499.30-0.20Q489.60 2.40 477.40 2.40ZM454.20-64.40L454.20-64.40L496.20-64.40Q496.20-69.60 494.90-73.50Q493.60-77.40 491.10-80Q488.60-82.60 485.10-83.90Q481.60-85.20 477-85.20L477-85.20Q469.80-85.20 465-82.80Q460.20-80.40 457.60-75.80Q455-71.20 454.20-64.40ZM574.40 0L541.60 0L541.60-105.40L568.60-105.40L571.00-90.40L572.40-90.40Q576.40-95.80 581.60-99.80Q586.80-103.80 593.40-105.80Q600.00-107.80 607.40-107.80L607.40-107.80Q618.80-107.80 626.70-103.60Q634.60-99.40 638.80-91Q643-82.60 643-69.60L643-69.60L643 0L610.20 0L610.20-65Q610.20-69.40 609.10-72.50Q608-75.60 606-77.80Q604.00-80 601.00-81Q598.00-82 594.20-82L594.20-82Q588.40-82 584.00-79.30Q579.60-76.60 577.00-72.10Q574.40-67.60 574.40-61.60L574.40-61.60L574.40 0ZM697.80 2.40L697.80 2.40Q684.40 2.40 674.60-3.60Q664.80-9.60 659.60-21.80Q654.40-34 654.40-53L654.40-53Q654.40-71.60 659.70-83.70Q665.00-95.80 674.60-101.80Q684.20-107.80 697.20-107.80L697.20-107.80Q703.40-107.80 709.10-106.40Q714.80-105 719.30-102Q723.80-99 727.00-94.60L727.00-94.60L728.20-94.60L728.20-144.80L761.00-144.80L761.00 0L734.20 0L731.80-14.60L730.40-14.60Q725.00-6 716.60-1.80Q708.20 2.40 697.80 2.40ZM708.00-23.20L708.00-23.20Q715.20-23.20 719.70-26.50Q724.20-29.80 726.30-35.90Q728.40-42 728.40-50.20L728.40-50.20L728.40-55Q728.40-61 727.20-66Q726.00-71 723.60-74.60Q721.20-78.20 717.30-80.20Q713.40-82.20 708.00-82.20L708.00-82.20Q700.60-82.20 696.10-79.20Q691.60-76.20 689.60-70.40Q687.60-64.60 687.60-56L687.60-56L687.60-49Q687.60-40.60 689.60-34.80Q691.60-29 696.10-26.10Q700.60-23.20 708.00-23.20ZM807.40 2.40L807.40 2.40Q800.80 2.40 794.50 1.10Q788.20-0.20 783.10-3.50Q778.00-6.80 775.00-12.60Q772.00-18.40 772.00-27.20L772.00-27.20Q772.00-38.60 776.80-45.80Q781.60-53 790.70-57.10Q799.80-61.20 812.70-62.80Q825.60-64.40 841.60-64.40L841.60-64.40L841.60-71Q841.60-75.60 839.80-78.70Q838.00-81.80 834.50-83.50Q831.00-85.20 825.20-85.20L825.20-85.20Q820.00-85.20 816.10-84Q812.20-82.80 810.20-80.50Q808.20-78.20 808.20-75L808.20-75L808.20-73.20L776.20-73.20Q776.00-74.20 776.00-75L776.00-75L776.00-76.80Q776.00-86.20 781.90-93.20Q787.80-100.20 798.80-104Q809.80-107.80 825.40-107.80L825.40-107.80Q840.00-107.80 850.90-104.20Q861.80-100.60 868.10-93.20Q874.40-85.80 874.40-73.80L874.40-73.80L874.40-28.80Q874.40-25.40 876.30-23.40Q878.20-21.40 881.00-21.40L881.00-21.40L887.80-21.40L887.80-1.20Q885.60-0.20 880.90 1.10Q876.20 2.40 869.60 2.40L869.60 2.40Q862.80 2.40 857.70 0.70Q852.60-1 849.30-4.10Q846.00-7.20 844.80-11.40L844.80-11.40L843.40-11.40Q839.60-7.40 834.50-4.20Q829.40-1 822.70 0.70Q816.00 2.40 807.40 2.40ZM819.60-20.20L819.60-20.20Q824.40-20.20 828.40-21.60Q832.40-23 835.30-25.50Q838.20-28 839.90-31.60Q841.60-35.20 841.60-39.40L841.60-39.40L841.60-46.40Q830.20-46.40 822.00-44.80Q813.80-43.20 809.40-39.80Q805.00-36.40 805.00-31.20L805.00-31.20Q805.00-27.40 806.90-24.90Q808.80-22.40 812.00-21.30Q815.20-20.20 819.60-20.20Z" />
        <path fill="#C9962E" d="M930 0L895.20 0L895.20-33.40L930-33.40L930 0Z" />
      </svg>
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
export const getCourseImage = (categoria: string): string | null => {
  const mapping: { [key: string]: string } = {
    'Informática y comunicaciones': '/images/cursos/informatica.webp',
    'Sanidad': '/images/cursos/sanidad.webp',
    'Servicios socioculturales y a la comunidad': '/images/cursos/sanidad.webp',
    'Comercio y marketing': '/images/cursos/logistica.webp',
    'Hostelería y turismo': '/images/cursos/hosteleria.webp',
    'Administración y gestión': '/images/cursos/administracion.webp'
  };
  return mapping[categoria] || null;
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
  portada_texto: 'Cursos subvencionados con dinero público que publican los centros. Pides plaza aquí y el centro te llama.',
  academias_titulo: 'Recibe a la gente que quiere plaza en tus cursos',
  academias_texto: 'Publicas tus cursos subvencionados y te llegan las solicitudes a un panel, con su teléfono, para que las llames.',
  pie_texto: 'Cursenda es un portal independiente. No pertenece al SEPE ni a ninguna administración pública.',
  precio_starter: '',
  precio_pro: '',
  legal_titular: '',
  legal_nif: '',
  legal_domicilio: '',
  legal_email: 'info@cursenda.es',
  legal_actualizado: '29 de octubre de 2026',
  demo_oculta: ''
};
type Ajustes = typeof AJUSTES_INICIALES;
const AjustesContexto = createContext<{ ajustes: Ajustes; setAjustes: React.Dispatch<React.SetStateAction<Ajustes>> }>({ ajustes: AJUSTES_INICIALES, setAjustes: () => {} });
const useAjustes = () => useContext(AjustesContexto);

// Los precios no van en la parte pública: se piden al entrar al panel
function usePrecios() {
  const { setAjustes } = useAjustes();
  const cargar = () => fetch(`${API_BASE}/precios`).then(r => r.ok ? r.json() : {}).then(p => setAjustes(a => ({ ...a, ...p }))).catch(() => {});
  useEffect(() => { cargar(); }, []);
  return cargar;
}

// --- PORTAL ALUMNOS ---

// Foto de cada categoría. Solo salen las categorías que tienen cursos publicados.
const FOCO_CATEGORIA: Record<string, string> = {
  'Hostelería y turismo': '50% 30%',
  'Sanidad': '60% 25%',
  'Servicios socioculturales y a la comunidad': '60% 25%',
  'Comercio y marketing': '45% 30%',
  'Administración y gestión': '55% 25%'
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// El centro escribe la fecha a mano ("15 de enero de 2027", "Inmediata"...).
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

function FilaCurso({ curso }: { curso: any }) {
  const codigo = codigoCertificado(curso.titulo);
  return (
    <article className="pub-curso">
      <Link to={`/curso/${curso.id}`} className="pub-curso-foto" tabIndex={-1} aria-hidden="true">
        <ImagenFamilia categoria={curso.categoria} />
      </Link>
      <div>
        <p className="pub-curso-inicio">{curso.fecha_inicio}{curso.es_demo ? <span className="pub-ejemplo">Curso de ejemplo</span> : null}</p>
        <h3><Link to={`/curso/${curso.id}`}>{tituloSinCodigo(curso.titulo)}</Link></h3>
        <p className="pub-curso-datos">{textoModalidad(curso)}, {curso.duracion_horas} horas.{codigo ? ` Certificado ${codigo}.` : ''} {curso.centro_nombre}.</p>
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

const FUENTES = {
  sepeFundae: 'https://sepe.es/HomeSepe/en/que-es-el-sepe/comunicacion-institucional/noticias/detalle-noticia.html?folder=%2FSEPE%2F2025%2FSeptiembre%2F&detail=formacion-subvencionada-sepe-colaboracion-fundae',
  sepe45: 'https://www.sepe.es/HomeSepe/en/que-es-el-sepe/comunicacion-institucional/noticias/detalle-noticia.html?folder=%2FSEPE%2F2026%2FMarzo%2F&detail=proximos-cursos-gratuitos-desempleados-45-o-mas-anios-edad',
  sepeAutonomias: 'https://www.sepe.es/HomeSepe/es/formacion-trabajo/iniciativas-formacion-trabajo/ofertas-formacion-comunidades-autonomas.html',
  madrid: 'https://oficinaempleo.comunidad.madrid/BuscadorCursosPublico/',
  fundae: 'https://experienciafundae.es/formacion-subvencionada',
  boe: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-16889',
  todofp: 'https://www.todofp.es/que-estudiar/grados-c.html'
};
const Fuente = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <p className="pub-fuente">Fuente: <a href={href} target="_blank" rel="noopener noreferrer">{children}</a></p>
);

// Solo datos con fuente oficial. Revisar cuando cambie la normativa y actualizar la fecha.
function ComoFunciona() {
  useTitulo('Cómo funcionan los cursos subvencionados | Cursenda');
  return (
    <div className="pub">
      <CabeceraPublica />
      <div className="pub-arriba">
        <div className="pub-ancho pub-lista-cabeza">
          <h1>Cómo funcionan los cursos subvencionados</h1>
          <p className="pub-info-entrada">Lo básico, con enlaces a las fuentes oficiales. Cursenda no es un organismo público: lo que vale para cada curso es lo que diga su convocatoria.</p>
        </div>
      </div>

      <main className="pub-ancho pub-info">
        <section>
          <h2>¿Son gratis?</h2>
          <p>El SEPE describe su formación subvencionada con Fundae como cursos "100% gratuitos, financiados con fondos públicos". En Cursenda, cada centro publica sus cursos y responde de lo que anuncia: confirma con él las condiciones del tuyo antes de matricularte.</p>
          <Fuente href={FUENTES.sepeFundae}>SEPE, formación subvencionada con Fundae</Fuente>
        </section>

        <section>
          <h2>¿Quién puede apuntarse?</h2>
          <p>Depende de cada convocatoria. En su formación subvencionada con Fundae, el SEPE indica que va dirigida a:</p>
          <ul>
            <li>Trabajadores en activo.</li>
            <li>Autónomos y trabajadores de la economía social.</li>
            <li>Personas desempleadas, inscritas como demandantes de empleo.</li>
            <li>Personas en situación de ERTE o ERE.</li>
            <li>Trabajadores de la administración pública.</li>
          </ul>
          <p>Otros cursos son para grupos concretos, como los que el SEPE anuncia para personas desempleadas de 45 años o más.</p>
          <Fuente href={FUENTES.sepeFundae}>SEPE, formación subvencionada con Fundae</Fuente>
          <Fuente href={FUENTES.sepe45}>SEPE, cursos para desempleados de 45 años o más</Fuente>
        </section>

        <section>
          <h2>¿Quién los organiza?</h2>
          <p>Además de la formación estatal, cada comunidad autónoma tiene su propia oferta de cursos. El SEPE publica un mapa con los enlaces de todas.</p>
          <Fuente href={FUENTES.sepeAutonomias}>SEPE, oferta de formación de las comunidades autónomas</Fuente>
        </section>

        <section>
          <h2>¿Qué es un certificado profesional?</h2>
          <p>Es la acreditación oficial que se obtiene al superar un curso de Grado C del Sistema de Formación Profesional. Tiene validez profesional y académica en toda España y lo expiden el Ministerio y los órganos responsables de las comunidades autónomas. Incluye un período de formación en empresa.</p>
          <p>Muchos cursos siguen usando el nombre anterior, certificado de profesionalidad, y un código como IFCD0210. No todos los cursos subvencionados dan certificado: compruébalo en cada uno.</p>
          <h3>Qué se pide para entrar</h3>
          <div className="pub-info-tabla">
            <table>
              <thead><tr><th>Nivel</th><th>Requisitos</th></tr></thead>
              <tbody>
                <tr><td>Nivel 1</td><td>Sin requisitos académicos ni profesionales, aunque hay que tener las habilidades de comunicación suficientes para aprender.</td></tr>
                <tr><td>Nivel 2</td><td>Graduado en ESO o equivalente, un certificado profesional de nivel 2, un certificado de competencia incluido en la oferta o un certificado profesional de nivel 1 de la misma familia.</td></tr>
                <tr><td>Nivel 3</td><td>Título de Técnico o Técnico Superior, Bachiller o equivalente, un certificado profesional de nivel 3, un certificado de competencia incluido en la oferta o un certificado profesional de nivel 2 de la misma familia.</td></tr>
              </tbody>
            </table>
          </div>
          <p>Si no tienes esos requisitos para los niveles 2 o 3, la administración debe comprobar que tienes los conocimientos previos, con pruebas o comprobaciones. Estos cursos se dirigen sobre todo a personas trabajadoras y a jóvenes mayores de 18 años; excepcionalmente, a mayores de 16 que hayan dejado los estudios.</p>
          <Fuente href={FUENTES.boe}>BOE, Real Decreto 659/2023, artículos 67, 69, 70, 75 y 76</Fuente>
          <Fuente href={FUENTES.todofp}>TodoFP, Ministerio de Educación: Grados C</Fuente>
        </section>

        <section>
          <h2>Dónde buscar en las webs oficiales</h2>
          <ul>
            <li><a href={FUENTES.madrid} target="_blank" rel="noopener noreferrer">Buscador de cursos de la Comunidad de Madrid</a></li>
            <li><a href={FUENTES.sepeAutonomias} target="_blank" rel="noopener noreferrer">Ofertas de todas las comunidades autónomas, en el SEPE</a></li>
            <li><a href={FUENTES.fundae} target="_blank" rel="noopener noreferrer">Formación subvencionada en Experiencia Fundae</a></li>
          </ul>
        </section>

        <section>
          <h2>Qué preguntar al centro</h2>
          <ul>
            <li>Qué convocatoria financia el curso.</li>
            <li>Si cumples los requisitos y qué documentos tienes que llevar.</li>
            <li>Si al terminar recibes un certificado oficial y de qué tipo.</li>
          </ul>
          <p><Link to="/cursos" className="pub-boton">Ver los cursos</Link></p>
        </section>
        <p className="pub-fuente">Información revisada el 30 de octubre de 2026. Si hay diferencias, vale lo que digan las fuentes oficiales.</p>
      </main>
      <PiePublico />
    </div>
  );
}

// Familias profesionales oficiales (Repertorio Nacional de Certificados de Profesionalidad, SEPE)
const FAMILIAS: { codigo: string; nombre: string }[] = [
  { codigo: 'ADG', nombre: 'Administración y gestión' },
  { codigo: 'AFD', nombre: 'Actividades físicas y deportivas' },
  { codigo: 'AGA', nombre: 'Agraria' },
  { codigo: 'ARG', nombre: 'Artes gráficas' },
  { codigo: 'ART', nombre: 'Artes y artesanías' },
  { codigo: 'COM', nombre: 'Comercio y marketing' },
  { codigo: 'ELE', nombre: 'Electricidad y electrónica' },
  { codigo: 'ENA', nombre: 'Energía y agua' },
  { codigo: 'EOC', nombre: 'Edificación y obra civil' },
  { codigo: 'FME', nombre: 'Fabricación mecánica' },
  { codigo: 'HOT', nombre: 'Hostelería y turismo' },
  { codigo: 'IEX', nombre: 'Industrias extractivas' },
  { codigo: 'IFC', nombre: 'Informática y comunicaciones' },
  { codigo: 'IMA', nombre: 'Instalación y mantenimiento' },
  { codigo: 'IMP', nombre: 'Imagen personal' },
  { codigo: 'IMS', nombre: 'Imagen y sonido' },
  { codigo: 'INA', nombre: 'Industrias alimentarias' },
  { codigo: 'MAM', nombre: 'Madera, mueble y corcho' },
  { codigo: 'MAP', nombre: 'Marítimo pesquera' },
  { codigo: 'QUI', nombre: 'Química' },
  { codigo: 'SAN', nombre: 'Sanidad' },
  { codigo: 'SEA', nombre: 'Seguridad y medioambiente' },
  { codigo: 'SSC', nombre: 'Servicios socioculturales y a la comunidad' },
  { codigo: 'TCP', nombre: 'Textil, confección y piel' },
  { codigo: 'TMV', nombre: 'Transporte y mantenimiento de vehículos' },
  { codigo: 'VIC', nombre: 'Vidrio y cerámica' }
];
const OTRA_FORMACION = 'Otra formación';
const slugSector = (nombre: string) => nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NOMBRES_FAMILIAS = [...FAMILIAS.map(f => f.nombre), OTRA_FORMACION];
// El código del certificado indica la familia: SSCS0208 es de SSC
const familiaDelTitulo = (titulo: string) => FAMILIAS.find(f => f.codigo === titulo.match(/^([A-Z]{3})[A-Z]\d{4}\b/)?.[1])?.nombre;

// Foto si la hay; si no, el nombre del sector
function ImagenFamilia({ categoria, className }: { categoria: string; className?: string }) {
  const foto = getCourseImage(categoria);
  if (foto) return <img className={className} src={foto} alt="" loading="lazy" style={{ objectPosition: FOCO_CATEGORIA[categoria] }} />;
  return <span className={`pub-icono-familia ${className || ''}`}>{categoria}</span>;
}

// Los cursos se piden una vez y los comparten el buscador y la página
let peticionCursos: Promise<any[]> | null = null;
const pedirCursos = () => {
  if (!peticionCursos) {
    peticionCursos = fetch(`${API_BASE}/public/cursos`).then(res => { if (!res.ok) throw new Error(); return res.json(); });
    peticionCursos.catch(() => { peticionCursos = null; });
    setTimeout(() => { peticionCursos = null; }, 60000);
  }
  return peticionCursos;
};

function useCursosPublicos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  useEffect(() => {
    let vivo = true;
    pedirCursos().then(datos => { if (vivo) { setCursos(datos); setEstado('listo'); } }).catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, []);
  return { cursos, estado };
}

function BuscadorCursos() {
  const navigate = useNavigate();
  const { cursos } = useCursosPublicos();
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const limpio = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = limpio(texto.trim());
  const coincide = cursos.filter(c => !q || [c.titulo, c.localidad, c.categoria, c.centro_nombre].some(v => limpio(v).includes(q)));
  const lista = (q ? coincide : [...coincide].sort((a, b) => b.visitas - a.visitas)).slice(0, 4);
  const familias = q ? FAMILIAS.filter(f => limpio(f.nombre).includes(q)).slice(0, 4) : [];
  const ir = (ruta: string) => { setAbierto(false); setTexto(''); navigate(ruta); };

  return (
    <form className="pub-busqueda" role="search" onSubmit={(e) => { e.preventDefault(); ir(`/cursos?q=${encodeURIComponent(texto.trim())}`); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setAbierto(false); }}>
      <Search size={18} aria-hidden="true" />
      <input aria-label="Buscar cursos" placeholder="¿Qué quieres aprender?" value={texto} onFocus={() => setAbierto(true)} onChange={(e) => { setTexto(e.target.value); setAbierto(true); }} />
      {abierto && (q || window.innerWidth > 700) && (lista.length > 0 || familias.length > 0 || q) && (
        <div className="pub-sugerencias">
          {familias.length > 0 && <p className="pub-sugerencias-titulo">Sectores</p>}
          {familias.map(f => <button type="button" key={f.codigo} onClick={() => ir(`/cursos/${slugSector(f.nombre)}`)}><span>{f.nombre}</span></button>)}
          {lista.length > 0 && <p className="pub-sugerencias-titulo">{q ? 'Cursos' : 'Los más vistos'}</p>}
          {lista.map(c => (
            <button type="button" key={c.id} onClick={() => ir(`/curso/${c.id}`)}>
              <ImagenFamilia categoria={c.categoria} className="pub-sugerencia-foto" />
              <span><strong>{tituloSinCodigo(c.titulo)}</strong><small>{textoModalidad(c)}</small></span>
            </button>
          ))}
          {q && lista.length === 0 && familias.length === 0 && <p className="pub-sugerencias-vacio">No hay cursos con esa búsqueda.</p>}
        </div>
      )}
    </form>
  );
}

function MenuExplorar() {
  const [abierto, setAbierto] = useState(false);
  const [todos, setTodos] = useState(false);
  const { cursos } = useCursosPublicos();
  const cuantos = (nombre: string) => cursos.filter(c => c.categoria === nombre).length;
  const conCursos = FAMILIAS.filter(f => cuantos(f.nombre) > 0);
  const vistos = todos || conCursos.length === 0 ? FAMILIAS : conCursos;
  const cerrar = () => { setAbierto(false); setTodos(false); };
  return (
    <div className="pub-explorar" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) cerrar(); }} onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}>
      <button type="button" className="pub-explorar-boton" aria-expanded={abierto} onClick={() => abierto ? cerrar() : setAbierto(true)}>Explorar <ChevronDown size={16} /></button>
      {abierto && (
        <div className="pub-explorar-panel">
          <div>
            <p className="pub-explorar-titulo">Sectores</p>
            <div className="pub-explorar-familias">
              {vistos.map(f => (
                <Link key={f.codigo} to={`/cursos/${slugSector(f.nombre)}`} onClick={cerrar}>
                  <span>{f.nombre}</span>{cuantos(f.nombre) > 0 && <em>{cuantos(f.nombre)}</em>}
                </Link>
              ))}
            </div>
            {!todos && vistos !== FAMILIAS && <button type="button" className="pub-enlace pub-explorar-mas" onClick={() => setTodos(true)}>Ver todos los sectores</button>}
          </div>
          <div>
            <p className="pub-explorar-titulo">Tu situación</p>
            <Link to="/cursos?situacion=Desempleados" onClick={cerrar}>Estoy en paro</Link>
            <Link to="/cursos?situacion=Ocupados" onClick={cerrar}>Estoy trabajando</Link>
            <Link to="/cursos" onClick={cerrar}>Todos los cursos</Link>
            <div className="pub-explorar-movil">
              <Link to="/como-funciona" onClick={cerrar}>Cómo funciona</Link>
              <Link to="/centros" onClick={cerrar}>Soy un centro</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CabeceraPublica() {
  return (
    <header className="pub-cabecera">
      <div className="pub-cabecera-principal pub-ancho">
        <Logo />
        <MenuExplorar />
        <BuscadorCursos />
        <nav>
          <Link to="/centros-de-formacion" className="pub-solo-ancho">Centros</Link>
          <Link to="/como-funciona" className="pub-solo-ancho">Cómo funciona</Link>
          <Link to="/centros/login" className="pub-boton-borde">Entrar</Link>
        </nav>
      </div>
    </header>
  );
}

function PiePublico() {
  const { ajustes } = useAjustes();
  return (
    <footer className="pub-pie">
      <div className="pub-ancho">
        <div className="pub-pie-columnas">
          <div><Logo /><p>{ajustes.pie_texto}</p></div>
          <div>
            <strong>Cursos</strong>
            <Link to="/cursos">Todos los cursos</Link>
            <Link to="/cursos?situacion=Desempleados">Para personas en paro</Link>
            <Link to="/cursos?situacion=Ocupados">Para personas que trabajan</Link>
            <Link to="/como-funciona">Cómo funcionan</Link>
          </div>
          <div>
            <strong>Centros</strong>
            <Link to="/centros-de-formacion">Centros en Cursenda</Link>
            <Link to="/centros">Publicar mis cursos</Link>
            <Link to="/centros/login">Entrar al panel</Link>
          </div>
          <div>
            <strong>Legal</strong>
            <Link to="/legal/aviso-legal">Aviso legal</Link>
            <Link to="/legal/privacidad">Privacidad</Link>
            <Link to="/legal/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Tarjeta de curso para las secciones de la portada
function TarjetaCurso({ curso }: { curso: any }) {
  return (
    <Link to={`/curso/${curso.id}`} className="pub-tarjeta">
      <ImagenFamilia categoria={curso.categoria} className="pub-tarjeta-foto" />
      <span className="pub-tarjeta-cuerpo">
        <span className="pub-tarjeta-familia">{curso.categoria}</span>
        <strong>{tituloSinCodigo(curso.titulo)}</strong>
        <span>{textoModalidad(curso)}, {curso.duracion_horas} horas</span>
        <span>Empieza: {curso.fecha_inicio}</span>
        <span className="pub-tarjeta-pie">{textoPlazas(curso)}{curso.es_demo ? <em className="pub-ejemplo">Ejemplo</em> : null}</span>
      </span>
    </Link>
  );
}

function useAcademias() {
  const [academias, setAcademias] = useState<any[]>([]);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE}/public/academias`).then(r => r.ok ? r.json() : []).then(setAcademias).catch(() => {}).finally(() => setListo(true));
  }, []);
  return { academias, listo };
}

// En el móvil el menú del panel se abre con este botón para no ocupar media pantalla
function BotonMenuPanel({ abierto, aviso, onClick }: { abierto: boolean; aviso?: number; onClick: () => void }) {
  return (
    <button type="button" className="panel-menu-boton" aria-expanded={abierto} onClick={onClick}>
      {abierto ? 'Cerrar menú' : 'Menú'}
      {!abierto && !!aviso && <span className="nav-badge">{aviso}</span>}
    </button>
  );
}

function LogoAcademia({ academia, grande }: { academia: { nombre: string; logo?: string | null }; grande?: boolean }) {
  return academia.logo
    ? <img className={`pub-logo-academia ${grande ? 'grande' : ''}`} src={`/logos/${academia.logo}`} alt={`Logo de ${academia.nombre}`} />
    : <span className={`pub-logo-academia pub-logo-letra ${grande ? 'grande' : ''}`} aria-hidden="true">{academia.nombre.charAt(0)}</span>;
}

function AlumnosHome() {
  useTitulo('Cursos gratis subvencionados | Cursenda');
  const { ajustes } = useAjustes();
  const { cursos, estado } = useCursosPublicos();
  const { academias } = useAcademias();
  const [activa, setActiva] = useState(0);
  const [pausada, setPausada] = useState(false);
  const [todasFamilias, setTodasFamilias] = useState(false);

  // Franjas: las familias con foto, primero las que tienen cursos
  const franjas = ['Informática y comunicaciones', 'Hostelería y turismo', 'Servicios socioculturales y a la comunidad', 'Comercio y marketing', 'Administración y gestión']
    .map(nombre => ({ nombre, lista: cursos.filter(c => c.categoria === nombre) }))
    .sort((a, b) => b.lista.length - a.lista.length);
  const titulosCortos: Record<string, string> = { 'Informática y comunicaciones': 'Informática', 'Hostelería y turismo': 'Hostelería', 'Servicios socioculturales y a la comunidad': 'Atención a personas', 'Comercio y marketing': 'Comercio', 'Administración y gestión': 'Administración' };

  useEffect(() => {
    if (pausada || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const turno = setInterval(() => setActiva(i => (i + 1) % franjas.length), 4500);
    return () => clearInterval(turno);
  }, [pausada, franjas.length]);

  const proximos = ordenarPorInicio(cursos).slice(0, 4);
  const masVistos = [...cursos].sort((a, b) => b.visitas - a.visitas).slice(0, 4);
  const conCursos = (nombre: string) => cursos.filter(c => c.categoria === nombre).length;
  const familiasOrdenadas = [...FAMILIAS].sort((a, b) => conCursos(b.nombre) - conCursos(a.nombre) || a.nombre.localeCompare(b.nombre));
  const familiasVistas = todasFamilias ? familiasOrdenadas : familiasOrdenadas.slice(0, 12);

  return (
    <div className="pub">
      <CabeceraPublica />
      <div className="pub-arriba">
        <div className="pub-portada pub-ancho">
          <h1>{ajustes.portada_titulo}</h1>
          <div>
            <p>{ajustes.portada_texto}</p>
            <p className="pub-portada-acciones"><Link to="/cursos" className="pub-boton pub-boton-pedir">Ver los cursos</Link><Link to="/como-funciona">Cómo funciona</Link></p>
          </div>
        </div>
        <nav className="pub-franjas" aria-label="Cursos por familia">
          {franjas.map(({ nombre, lista }, i) => {
            const siguiente = ordenarPorInicio(lista)[0];
            return (
              <Link key={nombre} to={`/cursos/${slugSector(nombre)}`} className={`pub-franja ${i === activa ? 'activa' : ''}`} style={{ animationDelay: `${i * 90}ms` }}
                onMouseEnter={() => { setPausada(true); setActiva(i); }} onFocus={() => { setPausada(true); setActiva(i); }}>
                <img src={getCourseImage(nombre) as string} alt="" style={{ objectPosition: FOCO_CATEGORIA[nombre] }} />
                <span className="pub-franja-texto">
                  <strong>{titulosCortos[nombre]}</strong>
                  <span className="pub-franja-mas"><span>
                    <span className="pub-franja-curso">{siguiente ? (lista.length === 1 ? tituloSinCodigo(siguiente.titulo) : `${lista.length} cursos. El próximo: ${tituloSinCodigo(siguiente.titulo)}`) : nombre}</span>
                    <span className="pub-franja-ver">{lista.length ? 'Ver los cursos' : 'Ver este sector'}</span>
                  </span></span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <section className="pub-ancho pub-situacion" aria-label="Elige tu situación">
        <h2>¿En qué situación estás?</h2>
        <div>
          <Link to="/cursos?situacion=Desempleados"><strong>Estoy en paro</strong><span>Cursos para personas desempleadas</span></Link>
          <Link to="/cursos?situacion=Ocupados"><strong>Estoy trabajando</strong><span>Cursos para personas con empleo</span></Link>
          <Link to="/como-funciona"><strong>No sé por dónde empezar</strong><span>Quién puede apuntarse y qué certificados hay</span></Link>
        </div>
      </section>

      {masVistos.length > 0 && (
        <section className="pub-ancho pub-bloque pub-mas-vistos">
          <div className="pub-bloque-cabeza"><h2>Los cursos más vistos</h2><Link to="/cursos">Ver todos</Link></div>
          <div className="pub-tarjetas">{masVistos.map(c => <TarjetaCurso key={c.id} curso={c} />)}</div>
        </section>
      )}

      <section className="pub-fondo">
        <div className="pub-ancho pub-bloque">
          <div className="pub-bloque-cabeza"><h2>¿Qué quieres aprender?</h2></div>
          <div className={`pub-familias ${todasFamilias ? "todas" : ""}`}>
            {familiasVistas.map(f => (
              <Link key={f.codigo} to={`/cursos/${slugSector(f.nombre)}`}>
                <span>{f.nombre}{conCursos(f.nombre) > 0 && <small>{conCursos(f.nombre) === 1 ? '1 curso' : `${conCursos(f.nombre)} cursos`}</small>}</span>
              </Link>
            ))}
          </div>
          {!todasFamilias && <p className="pub-ver-todos"><button type="button" className="pub-boton pub-boton-claro" onClick={() => setTodasFamilias(true)}>Ver más</button></p>}
        </div>
      </section>

      <main className="pub-ancho pub-bloque">
        <div className="pub-bloque-cabeza"><h2>Próximos cursos</h2><Link to="/cursos">Ver todos</Link></div>
        {proximos.length === 0 ? <AvisoCursos estado={estado} /> : proximos.map(curso => <FilaCurso key={curso.id} curso={curso} />)}
      </main>

      <section className="pub-fondo">
        <div className="pub-ancho pub-bloque">
          <div className="pub-bloque-cabeza"><h2>Cómo pedir plaza</h2></div>
          <ol className="pub-pasos">
            <li><strong>Elige un curso</strong><span>Busca por lo que quieres aprender, por familia o por localidad.</span></li>
            <li><strong>Deja tus datos</strong><span>Pedir plaza es gratis y no te compromete a nada.</span></li>
            <li><strong>El centro te llama</strong><span>Te confirma si cumples los requisitos y qué documentos necesitas.</span></li>
          </ol>
        </div>
      </section>

      {academias.length > 0 && (
        <section className="pub-ancho pub-bloque">
          <div className="pub-bloque-cabeza"><h2>Centros en Cursenda</h2><Link to="/centros-de-formacion">Ver todas</Link></div>
          <div className="pub-academias-logos">
            {academias.slice(0, 8).map(a => <Link key={a.id} to={`/centro-de-formacion/${a.id}`}><LogoAcademia academia={a} /><span>{a.nombre}</span></Link>)}
          </div>
        </section>
      )}

      <section className="pub-ancho pub-preguntas-portada">
        <h2 className="pub-titulo">Preguntas frecuentes</h2>
        <details className="pub-pregunta"><summary>¿Tengo que pagar algo?</summary><p>Son cursos subvencionados: el SEPE describe los de su formación con Fundae como "100% gratuitos, financiados con fondos públicos". Confirma con el centro las condiciones del tuyo antes de matricularte.</p></details>
        <details className="pub-pregunta"><summary>¿Puedo apuntarme si estoy trabajando?</summary><p>Depende de la convocatoria de cada curso. En cada ficha verás a quién va dirigido, y el centro te confirma si cumples los requisitos.</p></details>
        <details className="pub-pregunta"><summary>¿Qué pasa cuando pido plaza?</summary><p>El centro recibe tus datos y te llama. Pedir plaza no te compromete a nada.</p></details>
        <details className="pub-pregunta"><summary>¿Cursenda pertenece al SEPE?</summary><p>No. Es un portal independiente donde los centros publican sus cursos.</p></details>
        <p className="pub-ver-todos"><Link to="/como-funciona">Toda la información, con fuentes oficiales</Link></p>
      </section>

      <PiePublico />
    </div>
  );
}

function AcademiasPublicas() {
  useTitulo('Centros de formación | Cursenda');
  const { academias, listo } = useAcademias();
  return (
    <div className="pub">
      <CabeceraPublica />
      <div className="pub-arriba"><div className="pub-ancho pub-lista-cabeza"><h1>Centros en Cursenda</h1><p className="pub-info-entrada">Los centros que publican aquí sus cursos.</p></div></div>
      <main className="pub-ancho pub-bloque">
        {listo && academias.length === 0 && <p className="pub-aviso">Todavía no hay centros publicando cursos. <Link to="/centros">Publicar mis cursos</Link></p>}
        <div className="pub-academias-lista">
          {academias.map(a => (
            <Link key={a.id} to={`/centro-de-formacion/${a.id}`}>
              <LogoAcademia academia={a} grande />
              <span><strong>{a.nombre}</strong><small>{a.cursos === 1 ? '1 curso' : `${a.cursos} cursos`}</small></span>
            </Link>
          ))}
        </div>
      </main>
      <PiePublico />
    </div>
  );
}

function AcademiaPublica() {
  const { id } = useParams();
  const { academias, listo } = useAcademias();
  const { cursos } = useCursosPublicos();
  const academia = academias.find(a => String(a.id) === id);
  useTitulo(academia ? `${academia.nombre} | Cursenda` : null);
  if (listo && !academia) return <NoEncontrada />;
  if (!academia) return <div className="pub"><CabeceraPublica /><p className="pub-aviso pub-ancho">Cargando...</p></div>;
  const suyos = ordenarPorInicio(cursos.filter(c => c.centro_id === academia.id));
  return (
    <div className="pub">
      <CabeceraPublica />
      <div className="pub-arriba"><div className="pub-ancho pub-academia-cabeza">
        <LogoAcademia academia={academia} grande />
        <div>
          <h1>{academia.nombre}</h1>
          {academia.direccion && <p className="pub-info-entrada">{academia.direccion}</p>}
          {academia.web && /^https?:\/\//i.test(academia.web) && <p><a className="pub-compartir" href={academia.web} target="_blank" rel="noopener noreferrer nofollow">Ver su web</a></p>}
        </div>
      </div></div>
      <main className="pub-ancho pub-bloque">
        <div className="pub-bloque-cabeza"><h2>Sus cursos</h2></div>
        {suyos.map(c => <FilaCurso key={c.id} curso={c} />)}
      </main>
      <PiePublico />
    </div>
  );
}

const OPCIONES_SITUACION = [
  { valor: 'Desempleados', texto: 'Estoy en paro' },
  { valor: 'Ocupados', texto: 'Estoy trabajando' }
];

function AlumnosLista() {
    const { cursos, estado } = useCursosPublicos();
  const [params] = useSearchParams();
  const [modalidades, setModalidades] = useState<string[]>([]);
  const [situaciones, setSituaciones] = useState<string[]>(() => {
    const inicial = new URLSearchParams(window.location.search).get('situacion');
    return OPCIONES_SITUACION.some(o => o.valor === inicial) ? [inicial as string] : [];
  });
  const [duracion, setDuracion] = useState('');
  const [zona, setZona] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const navigate = useNavigate();
  const { sector } = useParams();
  const busqueda = params.get('q') || '';
  // Compatibilidad con los enlaces antiguos con ?categoria=
  const categoria = NOMBRES_FAMILIAS.find(f => slugSector(f) === sector) || params.get('categoria') || '';
  useTitulo(categoria ? `Cursos gratis de ${categoria.toLowerCase()} | Cursenda` : 'Cursos gratis | Cursenda');

  const cambiarSector = (valor: string) => {
    const nuevos = new URLSearchParams(params);
    nuevos.delete('categoria');
    const resto = nuevos.toString();
    navigate(`/cursos${valor ? `/${slugSector(valor)}` : ''}${resto ? `?${resto}` : ''}`, { replace: true });
  };
  const alternar = (lista: string[], valor: string) => lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor];

  // Solo se ofrecen los filtros que dan algún resultado
  const modalidadesDisponibles = ['Presencial', 'Online', 'Mixta'].filter(m => cursos.some(c => c.modalidad === m));
  const hayCursosPorSituacion = cursos.some(c => c.dirigido_a !== 'Todos');
  const zonas = [...new Set(cursos.filter(c => c.modalidad !== 'Online').map(c => cleanLocalidad(c.localidad)))].sort();
  const dentroDeDuracion = (horas: number) => duracion === 'corto' ? horas < 300 : duracion === 'medio' ? horas >= 300 && horas <= 500 : duracion === 'largo' ? horas > 500 : true;
  const tramosDuracion = [
    { valor: 'corto', texto: 'Menos de 300 horas' },
    { valor: 'medio', texto: 'De 300 a 500 horas' },
    { valor: 'largo', texto: 'Más de 500 horas' }
  ].filter(o => { const h = o.valor; return cursos.some(c => (h === 'corto' ? c.duracion_horas < 300 : h === 'medio' ? c.duracion_horas >= 300 && c.duracion_horas <= 500 : c.duracion_horas > 500)); });

  // Busca igual con tilde o sin ella
  const normalizar = (v: any) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const texto = normalizar(busqueda.trim());
  const filtrados = cursos.filter(c =>
    (!categoria || c.categoria === categoria) &&
    (!modalidades.length || modalidades.includes(c.modalidad)) &&
    (!situaciones.length || c.dirigido_a === 'Todos' || situaciones.includes(c.dirigido_a)) &&
    dentroDeDuracion(c.duracion_horas) &&
    (!zona || (c.modalidad !== 'Online' && cleanLocalidad(c.localidad) === zona)) &&
    (!texto || [c.titulo, c.localidad, c.categoria, c.centro_nombre, c.descripcion].some(v => normalizar(v).includes(texto)))
  );

  const grupos: { titulo: string; cursos: any[] }[] = [];
  ordenarPorInicio(filtrados).forEach(curso => {
    const titulo = inicioDe(curso).grupo;
    const grupo = grupos.find(g => g.titulo === titulo);
    if (grupo) grupo.cursos.push(curso); else grupos.push({ titulo, cursos: [curso] });
  });

  const hayFiltros = !!(texto || categoria || modalidades.length || situaciones.length || duracion || zona);
  const quitarFiltros = () => { navigate('/cursos', { replace: true }); setModalidades([]); setSituaciones([]); setDuracion(''); setZona(''); };

  return (
    <div className="pub">
      <CabeceraPublica />
      <div className="pub-arriba">
        <div className="pub-ancho pub-lista-cabeza">
          <h1>{categoria || 'Todos los cursos'}</h1>
          <p className="pub-info-entrada">{filtrados.length === 1 ? '1 curso' : `${filtrados.length} cursos`}{categoria ? ` de ${categoria}` : ''}{busqueda ? ` con "${busqueda}"` : ''}</p>
        </div>
      </div>

      <div className="pub-ancho">
        

        <div className="pub-lista">
          <aside className="pub-filtros">
            <button type="button" className="pub-filtros-boton" aria-expanded={filtrosAbiertos} onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}>
              {filtrosAbiertos ? 'Ocultar filtros' : 'Filtrar los cursos'}
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
              <fieldset>
                <legend>Sector</legend>
                <select className="pub-select" aria-label="Sector" value={categoria} onChange={(e) => cambiarSector(e.target.value)}>
                  <option value="">Todos los sectores</option>
                  {NOMBRES_FAMILIAS.map(f => <option key={f} value={f}>{f}{cursos.some(c => c.categoria === f) ? ` (${cursos.filter(c => c.categoria === f).length})` : ''}</option>)}
                </select>
              </fieldset>
              {zonas.length > 1 && (
                <fieldset>
                  <legend>Dónde</legend>
                  <select className="pub-select" aria-label="Localidad" value={zona} onChange={(e) => setZona(e.target.value)}>
                    <option value="">Todas las localidades</option>
                    {zonas.map(z => <option key={z}>{z}</option>)}
                  </select>
                </fieldset>
              )}
              {tramosDuracion.length > 1 && (
                <fieldset>
                  <legend>Duración</legend>
                  {tramosDuracion.map(o => (
                    <label key={o.valor}><input type="radio" name="duracion" checked={duracion === o.valor} onChange={() => setDuracion(o.valor)} />{o.texto}</label>
                  ))}
                  {duracion && <button type="button" className="pub-enlace" onClick={() => setDuracion('')}>Cualquier duración</button>}
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
              <button type="button" className="pub-boton pub-filtros-ver" onClick={() => { setFiltrosAbiertos(false); window.scrollTo(0, 0); }}>Ver {filtrados.length === 1 ? '1 curso' : `${filtrados.length} cursos`}</button>
            </div>
          </aside>

          <main>
            {estado !== 'listo' ? <AvisoCursos estado={estado} /> : (
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
                  <div className="pub-aviso">
                    <p>{cursos.length ? 'No hay cursos con esos filtros.' : 'Todavía no hay cursos publicados en Cursenda.'}{cursos.length > 0 && <> <button type="button" className="pub-enlace" onClick={quitarFiltros}>Quítalos para ver todos</button></>}</p>
                    <p className="pub-aviso-oficial">También puedes buscar en el <a href={FUENTES.madrid} target="_blank" rel="noopener noreferrer">buscador de la Comunidad de Madrid</a> o en <a href={FUENTES.sepeAutonomias} target="_blank" rel="noopener noreferrer">las ofertas de cada comunidad</a>.</p>
                  </div>
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
  useTitulo(curso ? `${tituloSinCodigo(curso.titulo)}: curso gratis ${curso.modalidad === 'Online' ? 'online' : `en ${curso.localidad}`} | Cursenda` : null);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { cursos: todos } = useCursosPublicos();

  useEffect(() => {
    window.scrollTo(0, 0);
    setSubmitSuccess(false);
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

  if (loading) return <div className="pub"><CabeceraPublica /><p className="pub-aviso pub-ancho">Cargando el curso...</p></div>;
  if (!curso) return <NoEncontrada />;

  const codigo = codigoCertificado(curso.titulo);
  const libres = plazasLibres(curso);
  const lineasDe = (texto: string) => [...new Set(String(texto).split('\n').map(l => l.trim()).filter(Boolean))];
  const parecidos = ordenarPorInicio(todos.filter(c => c.id !== curso.id && c.categoria === curso.categoria)).slice(0, 3);
  const enlaceCompartir = `https://wa.me/?text=${encodeURIComponent(`${tituloSinCodigo(curso.titulo)}: ${window.location.origin}/curso/${curso.id}`)}`;
  const localidadMapa = cleanLocalidad(curso.localidad);
  const dirigidoA: Record<string, string> = { Desempleados: 'Personas en paro', Ocupados: 'Personas que trabajan', Todos: 'Personas en paro o que trabajan' };

  return (
    <div className="pub">
      <CabeceraPublica />
      <section className="pub-curso-portada">
        {getCourseImage(curso.categoria) && <img src={getCourseImage(curso.categoria) as string} alt="" style={{ objectPosition: FOCO_CATEGORIA[curso.categoria] }} />}
        <div className="pub-ancho">
          <Link to={`/cursos/${slugSector(curso.categoria)}`} className="pub-volver">{curso.categoria}</Link>
          <h1>{tituloSinCodigo(curso.titulo)}</h1>
          <p>{codigo ? `Certificado de profesionalidad ${codigo}. ` : ''}{curso.es_demo ? `Lo imparte ${curso.centro_nombre}.` : <>Lo imparte <Link to={`/centro-de-formacion/${curso.centro_id}`} className="pub-compartir">{curso.centro_nombre}</Link>.</>}</p>
          <p><a href={enlaceCompartir} target="_blank" rel="noopener noreferrer" className="pub-compartir">Compartir por WhatsApp</a></p>
        </div>
      </section>

      {!!curso.es_demo && <p className="pub-aviso-ejemplo pub-ancho">Este es un curso de ejemplo para enseñar cómo funciona Cursenda. No es un curso real.</p>}
      <div className="pub-ancho">
        <nav className="pub-ficha-menu" aria-label="Secciones del curso">
          <a href="#de-que-trata">De qué trata</a>
          {curso.aprenderas && <a href="#aprender">Qué aprendes</a>}
          {curso.requisitos && <a href="#requisitos">Requisitos</a>}
          {curso.modalidad !== 'Online' && <a href="#donde">Dónde es</a>}
          <a href="#pedir">Pedir plaza</a>
        </nav>
        <dl className="pub-datos">
          <div><dt>Empieza</dt><dd>{curso.fecha_inicio}</dd></div>
          <div><dt>Duración</dt><dd>{curso.duracion_horas} horas</dd></div>
          <div><dt>Modalidad</dt><dd>{textoModalidad(curso)}</dd></div>
          <div><dt>Plazas libres</dt><dd>{libres} de {curso.plazas}</dd></div>
          <div><dt>Para</dt><dd>{dirigidoA[curso.dirigido_a] || curso.dirigido_a}</dd></div>
        </dl>

        {!submitSuccess && libres > 0 && !curso.es_demo && (
          <div className="pub-barra-movil"><span>{textoPlazas(curso)}</span><a href="#pedir" className="pub-boton pub-boton-pedir">Pedir plaza</a></div>
        )}
        <div className="pub-detalle">
          <div>
            <section id="de-que-trata">
              <h2>De qué trata</h2>
              <p>{curso.descripcion}</p>
            </section>
            {curso.aprenderas && (
              <section id="aprender">
                <h2>Qué vas a aprender</h2>
                <ul className="pub-lista-curso">{lineasDe(curso.aprenderas).map(l => <li key={l}>{l}</li>)}</ul>
              </section>
            )}
            {curso.requisitos && (
              <section id="requisitos">
                <h2>Requisitos</h2>
                <ul className="pub-lista-curso">{lineasDe(curso.requisitos).map(l => <li key={l}>{l}</li>)}</ul>
              </section>
            )}
            {curso.horario && (
              <section>
                <h2>Horario</h2>
                <p>{curso.horario}</p>
              </section>
            )}
            {curso.salidas && (
              <section>
                <h2>En qué puedes trabajar</h2>
                <ul className="pub-lista-curso">{lineasDe(curso.salidas).map(l => <li key={l}>{l}</li>)}</ul>
              </section>
            )}
            <section>
              <h2>Qué pasa cuando pides plaza</h2>
              <p>{curso.centro_nombre} recibe tus datos y te llama. Con esa llamada te confirma si cumples los requisitos del curso y qué documentos necesitas.</p>
            </section>
            {curso.modalidad !== 'Online' && (
              <section id="donde">
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
            ) : curso.es_demo ? (
              <div>
                <h2>Curso de ejemplo</h2>
                <p>Este curso no es real y no admite solicitudes.</p>
                <p><Link to="/cursos">Ver todos los cursos</Link></p>
              </div>
            ) : libres === 0 ? (
              <div>
                <h2>Sin plazas libres</h2>
                <p>Este curso ya no tiene plazas libres.</p>
                <p><Link to={`/cursos/${slugSector(curso.categoria)}`}>Ver otros cursos de {curso.categoria}</Link></p>
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

      {parecidos.length > 0 && (
        <section className="pub-ancho pub-parecidos">
          <h2 className="pub-titulo">Más cursos de {curso.categoria}</h2>
          {parecidos.map(c => <FilaCurso key={c.id} curso={c} />)}
        </section>
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
  { titulo: 'Pones los cursos en tu web', texto: 'Copias un código y tus cursos salen también en la web de tu centro.' },
  { titulo: 'Sacas tus datos', texto: 'Descargas las solicitudes en un archivo CSV que se abre con Excel.' },
  { titulo: 'Ves qué funciona', texto: 'Visitas y solicitudes de cada curso, para saber cuáles necesitan más gente.' }
];

const PREGUNTAS_ACADEMIAS = [
  { pregunta: '¿Cuánto cuesta?', respuesta: 'El primer mes es gratis. Al crear tu cuenta verás los planes y sus precios en tu panel, antes de tener que pagar nada.' },
  { pregunta: '¿Necesito tarjeta para probarlo?', respuesta: 'No. El primer mes es gratis y no se pide ningún dato de pago. Solo pones la tarjeta si decides seguir.' },
  { pregunta: '¿Qué pasa cuando termina el mes gratis?', respuesta: 'Eliges un plan desde tu panel y todo sigue igual. Si no lo haces, tus cursos dejan de mostrarse, pero tus datos se guardan por si decides volver.' },
  { pregunta: '¿Tiene permanencia?', respuesta: 'No. Se paga mes a mes y puedes darte de baja cuando quieras desde tu panel.' },
  { pregunta: '¿Quién ve las solicitudes?', respuesta: 'Solo tu centro. Entran tú y las personas de tu equipo a las que invites, cada una con su contraseña.' }
];

function LandingCentros() {
  useTitulo('Publica tus cursos subvencionados | Cursenda para centros');
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
              <p>Déjanos tus datos y te enviamos un enlace para crear la cuenta de tu centro.</p>
              {error && <p className="pub-error" role="alert">{error}</p>}
              <label>Nombre del centro<input required value={nombreCentro} onChange={(e) => setNombreCentro(e.target.value)} /></label>
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
  useTitulo('Entrar al panel | Cursenda');
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
        <p className="auth-subtitle">Para centros que publican sus cursos en Cursenda.</p>

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
            <p className="auth-subtitle">Pon los datos de tu centro para entrar al panel.</p>

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
    document.title = `${titulos[tipo]} | Cursenda`;
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
              <li><strong>Si es un centro y pide acceso:</strong> nombre del centro, persona de contacto, email y teléfono, para contactarle y enseñarle la plataforma.</li>
              <li><strong>Si tiene cuenta de centro:</strong> los datos de su cuenta y de su equipo, para darle acceso al panel y prestarle el servicio.</li>
            </ul>

            <h2>Base legal</h2>
            <p>Su consentimiento, que da al marcar la casilla del formulario, y en el caso de los centros con cuenta, el contrato del servicio. Puede retirar su consentimiento cuando quiera.</p>

            <h2>Cuánto tiempo los guardamos</h2>
            <p>Las solicitudes de plaza se guardan mientras el centro las necesite para gestionar la matrícula y, como máximo, 2 años. Las solicitudes de demo, hasta 1 año si no se contrata el servicio. Los datos de cuentas, mientras la cuenta esté activa.</p>

            <h2>Quién más los ve</h2>
            <p>Si pide plaza, el centro de formación del curso. Si un centro contrata un plan, el pago lo gestiona Stripe, que recibe los datos de facturación y de la tarjeta. No vendemos datos ni los usamos para publicidad. La web está alojada en un servidor propio en la Unión Europea.</p>

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
  useTitulo('Página no encontrada | Cursenda');
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
            <p className="auth-subtitle">Esta invitación no es válida o ya ha caducado. Pide a la persona responsable de tu centro que te envíe otra.</p>
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
            : 'Pide a la persona responsable de tu centro que contrate un plan para seguir usando Cursenda.'}
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

function DashboardAdmin({ onLogout }: { user: any; onLogout: () => void }) {
  const { ajustes, setAjustes } = useAjustes();
  const cargarPrecios = usePrecios();
  const [verArchivados, setVerArchivados] = useState(false);
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
  
  // Modal Centros
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
  const [formCursoCategoria, setFormCursoCategoria] = useState('Informática y comunicaciones');
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
      navigate('/centros/login');
      onLogout();
    } catch (err) {
      console.error(err);
    }
  };

  // Crear/Editar Academia
  // Deja pasar el mes gratis desde la petición del formulario y da el enlace para enviárselo
  const handleGuardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    setAjustesEstado('');
    const { legal_actualizado, demo_oculta, ...cambios } = formAjustes;
    try {
      const res = await fetch(`${API_BASE}/admin/ajustes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(Object.entries(cambios).map(([clave, valor]) => [clave, valor === AJUSTES_INICIALES[clave as keyof Ajustes] ? '' : valor])))
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAjustesEstado(data.error || 'No se han podido guardar los cambios.');
        return;
      }
      setAjustes({ ...AJUSTES_INICIALES, ...data });
      cargarPrecios();
      setAjustesEstado('guardado');
    } catch (err) {
      setAjustesEstado('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleCursosEjemplo = async () => {
    const res = await fetch(`${API_BASE}/admin/ajustes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo_oculta: ajustes.demo_oculta ? '' : '1' })
    });
    if (res.ok) {
      setAjustes({ ...AJUSTES_INICIALES, ...(await res.json()) });
      cargarPrecios();
      loadData();
    } else alert('No se ha podido cambiar.');
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

  const handleArchivar = async (tipo: 'cursos' | 'solicitudes', id: number, archivar: boolean) => {
    const res = await fetch(`${API_BASE}/admin/${tipo}/${id}/archivar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivar })
    });
    if (res.ok) loadData();
    else alert('No se ha podido cambiar.');
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
        setFormAcademiaError(errData.error || 'Error al guardar el centro');
      }
    } catch (err) {
      setFormAcademiaError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleDeleteAcademia = async (id: number) => {
    if (!window.confirm('¿Eliminar este centro con todos sus cursos y solicitudes? No se puede deshacer.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/centros/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar el centro');
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
  const cursosVistos = cursos.filter(c => !!c.archivado === verArchivados && contiene(busqueda, c.titulo, c.centro_nombre, c.localidad, c.categoria));
  const solicitudesVistas = solicitudes.filter(s => !!s.archivada === verArchivados && contiene(busqueda, s.nombre, s.email, s.telefono, s.curso_titulo, s.centro_nombre));

  const [menuAbierto, setMenuAbierto] = useState(false);
  const irA = (destino: typeof tab) => { setTab(destino); setBusqueda(''); setVerArchivados(false); setMenuAbierto(false); window.scrollTo(0, 0); };
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
    { id: 'academias', texto: 'Centros', icono: <Building size={18} /> },
    { id: 'cursos', texto: 'Cursos', icono: <BookOpen size={18} /> },
    { id: 'solicitudes', texto: 'Solicitudes', icono: <Users size={18} /> },
    { id: 'demos', texto: 'Peticiones de acceso', icono: <Mail size={18} />, aviso: demosNuevas.length },
    { id: 'recuperaciones', texto: 'Contraseñas', icono: <Shield size={18} />, aviso: recuperacionesPendientes.length },
    { id: 'ajustes', texto: 'Textos y datos', icono: <Settings size={18} /> }
  ];

  return (
    <div className="dashboard-layout admin">
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div>
          <Logo light={true} />
          <BotonMenuPanel abierto={menuAbierto} aviso={demosNuevas.length + recuperacionesPendientes.length} onClick={() => setMenuAbierto(!menuAbierto)} />
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
                  <button type="button" onClick={() => irA('solicitudes')}><span>Solicitudes</span><strong>{solicitudes.filter(s => !s.archivada).length}</strong></button>
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
                    <p className="admin-vacio">Se pone como nueva sola cada noche a las 4:00. Reiníciala antes de enseñarla en un centro.</p>
                    <div className="admin-acciones" style={{ justifyContent: 'flex-start' }}>
                      <button type="button" onClick={handleReiniciarDemo} className="btn btn-secondary btn-sm">Reiniciar demo</button>
                      <button type="button" onClick={handleCursosEjemplo} className="btn btn-secondary btn-sm">{ajustes.demo_oculta ? 'Mostrar cursos de ejemplo en la web' : 'Quitar cursos de ejemplo de la web'}</button>
                    </div>
                    <p className="admin-dato" style={{ marginTop: '0.5rem' }}>{ajustes.demo_oculta ? 'Ahora no salen en la web. La cuenta demo los sigue teniendo para enseñarla.' : 'Ahora salen en la web, marcados como ejemplo, hasta que un centro real publique cursos.'}</p>
                  </section>
                </div>
              </div>
            )}

            {tab === 'academias' && (
              <div>
                <div className="admin-cabecera">
                  <h1 className="admin-titulo">Centros</h1>
                  <input className="form-control" aria-label="Buscar centro" placeholder="Buscar centro" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  <button type="button" onClick={() => handleOpenAcademiaModal()} className="btn btn-primary"><Plus size={16} /><span>Nuevo centro</span></button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Centro</th><th>Contacto</th><th>Plan</th><th>Situación</th><th></th></tr></thead>
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
                  <input className="form-control" aria-label="Buscar curso" placeholder="Buscar curso o centro" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={() => setVerArchivados(!verArchivados)}>{verArchivados ? 'Ver activos' : `Archivados (${cursos.filter(c => c.archivado).length})`}</button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Curso</th><th>Plazas libres</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {cursosVistos.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.titulo}</strong><div className="admin-dato">{c.centro_nombre}. {c.modalidad}, {c.localidad}.</div></td>
                          <td data-etiqueta="Plazas libres">{Math.max(0, c.plazas - c.plazas_cubiertas)} de {c.plazas}</td>
                          <td>{c.archivado ? 'Archivado' : c.estado === 'publicado' ? 'Publicado' : 'Pausado'}</td>
                          <td>
                            <div className="admin-acciones">
                              {c.estado === 'publicado' && <a href={`/curso/${c.id}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">Ver</a>}
                              {c.archivado ? (
                                <button type="button" onClick={() => handleArchivar('cursos', c.id, false)} className="btn btn-secondary btn-sm">Recuperar</button>
                              ) : (<>
                                <button type="button" onClick={() => handleEstadoCurso(c)} className="btn btn-secondary btn-sm">{c.estado === 'publicado' ? 'Pausar' : 'Publicar'}</button>
                                <button type="button" onClick={() => handleOpenCursoModal(c)} className="btn btn-secondary btn-sm">Editar</button>
                                <button type="button" onClick={() => handleArchivar('cursos', c.id, true)} className="btn btn-secondary btn-sm">Archivar</button>
                              </>)}
                              <button type="button" onClick={() => handleDeleteCurso(c.id)} className="btn btn-secondary btn-sm admin-borrar">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {cursosVistos.length === 0 && <tr><td colSpan={4} className="admin-vacio">No hay cursos.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'solicitudes' && (
              <div>
                <div className="admin-cabecera">
                  <h1 className="admin-titulo">Solicitudes</h1>
                  <input className="form-control" aria-label="Buscar solicitud" placeholder="Buscar persona, curso o centro" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={() => setVerArchivados(!verArchivados)}>{verArchivados ? 'Ver activas' : `Archivadas (${solicitudes.filter(s => s.archivada).length})`}</button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Persona</th><th>Curso</th><th>Centro</th><th>Fecha</th><th></th></tr></thead>
                    <tbody>
                      {solicitudesVistas.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.nombre}</strong><div className="admin-dato">{s.telefono}<br />{s.email}</div></td>
                          <td>{s.curso_titulo}</td>
                          <td>{s.centro_nombre}</td>
                          <td>{formatFechaHora(s.fecha_creacion)}</td>
                          <td>
                            <div className="admin-acciones">
                              <button type="button" onClick={() => handleArchivar('solicitudes', s.id, !s.archivada)} className="btn btn-secondary btn-sm">{s.archivada ? 'Recuperar' : 'Archivar'}</button>
                              <button type="button" onClick={() => handleDeleteSolicitud(s)} className="btn btn-secondary btn-sm admin-borrar">Eliminar</button>
                            </div>
                          </td>
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
                <p className="admin-intro">Centros que han rellenado el formulario para probar Cursenda. Al crear la cuenta empieza su mes gratis y te doy un enlace para que se lo envíes.</p>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Centro</th><th>Contacto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
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
                  <h2>Página para centros</h2>
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
              <h3 className="modal-title">{selectedAcademia ? 'Editar centro' : 'Nuevo centro'}</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowAcademiaModal(false)} className="btn-close-modal"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveAcademia}>
              <div className="admin-modal-cuerpo">
                {formAcademiaError && <div className="alert-box alert-error" role="alert">{formAcademiaError}</div>}
                <div className="form-group"><label className="form-label" htmlFor="ac-nombre">Nombre del centro *</label><input id="ac-nombre" required className="form-control" value={formAcademiaNombre} onChange={(e) => setFormAcademiaNombre(e.target.value)} /></div>
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
                  <div className="form-group"><label className="form-label" htmlFor="cu-cat">Familia profesional</label><select id="cu-cat" className="form-control" value={formCursoCategoria} onChange={(e) => setFormCursoCategoria(e.target.value)}>{NOMBRES_FAMILIAS.map(c => <option key={c}>{c}</option>)}</select></div>
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
  usePrecios();
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
  const [solicitudStatusFilter, setSolicitudStatusFilter] = useState<'todos' | 'nuevos' | 'gestionados' | 'archivadas'>('todos');
  const [verCursosArchivados, setVerCursosArchivados] = useState(false);
  const [logoAcademia, setLogoAcademia] = useState<string | null>(user?.logo || null);
  const [logoError, setLogoError] = useState('');

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setLogoError('');
    if (archivo.size > 200 * 1024) { setLogoError('El logo pesa más de 200 KB.'); return; }
    try {
      const res = await fetch(`${API_BASE}/centro/logo`, { method: 'PUT', headers: { 'Content-Type': archivo.type }, body: archivo });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLogoAcademia(data.logo);
      else setLogoError(data.error || 'No se ha podido subir el logo.');
    } catch (err) {
      setLogoError('No se ha podido conectar. Vuelve a intentarlo.');
    }
  };

  const handleQuitarLogo = async () => {
    const res = await fetch(`${API_BASE}/centro/logo`, { method: 'DELETE' });
    if (res.ok) setLogoAcademia(null);
  };

  // Formulario Curso
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState('Informática y comunicaciones');
  const [formModalidad, setFormModalidad] = useState('Online');
  const [formLocalidad, setFormLocalidad] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formPlazas, setFormPlazas] = useState('');
  const [formPlazasCubiertas, setFormPlazasCubiertas] = useState('0');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formDirigidoA, setFormDirigidoA] = useState('Todos');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formAprenderas, setFormAprenderas] = useState('');
  const [formRequisitos, setFormRequisitos] = useState('');
  const [formSalidas, setFormSalidas] = useState('');
  const [formHorario, setFormHorario] = useState('');
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
      setFormAprenderas(curso.aprenderas || '');
      setFormRequisitos(curso.requisitos || '');
      setFormSalidas(curso.salidas || '');
      setFormHorario(curso.horario || '');
    } else {
      setFormTitulo('');
      setFormCategoria('Informática y comunicaciones');
      setFormModalidad('Online');
      setFormLocalidad('');
      setFormDuracion('');
      setFormPlazas('');
      setFormPlazasCubiertas('0');
      setFormFechaInicio('');
      setFormDirigidoA('Todos');
      setFormDescripcion('');
      setFormAprenderas('');
      setFormRequisitos('');
      setFormSalidas('');
      setFormHorario('');
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
      descripcion: formDescripcion,
      aprenderas: formAprenderas,
      requisitos: formRequisitos,
      salidas: formSalidas,
      horario: formHorario
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

  const [menuAbierto, setMenuAbierto] = useState(false);
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
  const countNuevas = solicitudes.filter(sol => !sol.gestionado && !sol.archivada).length;
  const cursosArchivados = cursos.filter(c => c.archivado);
  const cursosVistos = cursos.filter(c => verCursosArchivados ? c.archivado : !c.archivado);

  const handleArchivarCurso = async (c: any, archivar: boolean) => {
    const res = await fetch(`${API_BASE}/cursos/${c.id}/archivar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivar })
    });
    if (res.ok) { loadCursos(); loadStats(); }
    else alert('No se ha podido cambiar el curso.');
  };

  const handleArchivarSolicitud = async (s: any, archivar: boolean) => {
    const res = await fetch(`${API_BASE}/solicitudes/${s.id}/archivar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivar })
    });
    if (res.ok) loadSolicitudes();
    else alert('No se ha podido cambiar la solicitud.');
  };

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
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div>
          <Logo />
          <BotonMenuPanel abierto={menuAbierto} aviso={countNuevas} onClick={() => setMenuAbierto(!menuAbierto)} />
          <ul className="nav-menu" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) { setMenuAbierto(false); window.scrollTo(0, 0); } }}>
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
            {!esPropietario && <div className="center-profile-plan">{user?.usuario?.nombre}, {ROL_TEXTO[rolUsuario]}</div>}
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Publica y pausa los cursos de tu centro.</p>
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

            <div>
              {/* Tabla de Cursos */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">{verCursosArchivados ? 'Cursos archivados' : 'Tus cursos'}</h3>
                  {(verCursosArchivados || cursosArchivados.length > 0) && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVerCursosArchivados(!verCursosArchivados)}>
                      {verCursosArchivados ? 'Volver a tus cursos' : `Ver archivados (${cursosArchivados.length})`}
                    </button>
                  )}
                </div>
                
                {cursosVistos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{verCursosArchivados ? 'No hay cursos archivados.' : 'Todavía no tienes cursos. Publica el primero.'}</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Solicitudes</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursosVistos.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{c.titulo}</div>
                            <div className="admin-dato">{c.localidad}. Empieza: {c.fecha_inicio}</div>
                          </td>
                          <td data-etiqueta="Solicitudes"><strong>{c.solicitudes_count || 0}</strong></td>
                          <td>
                            <span className={`badge ${c.estado === 'publicado' ? 'badge-published' : 'badge-paused'}`}>
                              {c.archivado ? 'Archivado' : c.estado === 'publicado' ? 'Publicado' : 'Pausado'}
                            </span>
                          </td>
                          <td>
                            <div className="acciones-curso" style={{ display: puedeEditar ? 'flex' : 'none', gap: '0.5rem' }}>
                              {c.archivado ? (
                                <button type="button" onClick={() => handleArchivarCurso(c, false)} className="btn btn-secondary btn-sm">Recuperar</button>
                              ) : (<>
                                <button type="button" onClick={() => handleToggleCursoEstado(c.id)} className="btn btn-secondary btn-sm">{c.estado === 'publicado' ? 'Pausar' : 'Publicar'}</button>
                                <button type="button" onClick={() => handleOpenCursoModal(c)} className="btn btn-secondary btn-sm">Editar</button>
                                <button type="button" onClick={() => handleArchivarCurso(c, true)} className="btn btn-secondary btn-sm">Archivar</button>
                              </>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                  <option value="nuevos">Nuevas</option>
                  <option value="gestionados">Gestionadas</option>
                  <option value="archivadas">Archivadas</option>
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
                        if (solicitudStatusFilter === 'archivadas') return matchesSearch && s.archivada;
                        if (s.archivada) return false;
                        if (solicitudStatusFilter === 'nuevos') return matchesSearch && !s.gestionado;
                        if (solicitudStatusFilter === 'gestionados') return matchesSearch && s.gestionado;
                        return matchesSearch;
                      })
                      .map((s) => (
                      <tr key={s.id} style={!s.gestionado ? { backgroundColor: 'rgba(201, 150, 46, 0.03)' } : undefined}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{s.nombre}</div>
                          <div className="admin-dato"><a href={`tel:${s.telefono}`} className="enlace-telefono">{s.telefono}</a></div>
                          <div className="admin-dato">{s.email}</div>
                        </td>
                        <td style={{ color: 'var(--primary)' }}>{s.curso_titulo}</td>
                        <td>{parseFecha(s.fecha_creacion).toLocaleDateString('es-ES')}</td>
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
                            <button type="button" onClick={() => handleArchivarSolicitud(s, !s.archivada)} className="btn btn-secondary btn-sm">{s.archivada ? 'Recuperar' : 'Archivar'}</button>
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
                  <strong style={{ textTransform: 'capitalize' }}>{user?.plan || 'starter'}</strong>
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Las personas que pueden entrar al panel de tu centro.</p>
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
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Datos de tu centro</h3>
              <div className="config-logo">
                {logoAcademia ? <img src={`/logos/${logoAcademia}`} alt="Logo de tu centro" /> : <span><Building size={28} /></span>}
                <div>
                  <label className="btn btn-secondary btn-sm">
                    {logoAcademia ? 'Cambiar el logo' : 'Subir el logo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleSubirLogo} />
                  </label>
                  {logoAcademia && <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={handleQuitarLogo}>Quitar</button>}
                  <p className="admin-dato" style={{ marginTop: 6 }}>PNG, JPG o WebP, de menos de 200 KB. Sale junto a tus cursos.</p>
                  {logoError && <p className="admin-error" role="alert">{logoError}</p>}
                </div>
              </div>
              
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
                  <label className="form-label">Nombre del centro</label>
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
                    onChange={(e) => { setFormTitulo(e.target.value); const familia = familiaDelTitulo(e.target.value); if (familia) setFormCategoria(familia); }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Familia profesional *</label>
                    <select className="form-control" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                      {NOMBRES_FAMILIAS.map(f => <option key={f}>{f}</option>)}
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

                <p className="admin-dato" style={{ marginBottom: '0.75rem' }}>Lo siguiente es opcional. Solo se ve en la ficha si lo rellenas. Pon una cosa por línea.</p>
                <div className="form-group">
                  <label className="form-label" htmlFor="cu-aprende">Qué van a aprender</label>
                  <textarea id="cu-aprende" className="form-control" rows={3} value={formAprenderas} onChange={(e) => setFormAprenderas(e.target.value)}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cu-requ">Requisitos</label>
                  <textarea id="cu-requ" className="form-control" rows={3} value={formRequisitos} onChange={(e) => setFormRequisitos(e.target.value)}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cu-horario">Horario</label>
                  <input id="cu-horario" className="form-control" placeholder="Ej: De lunes a viernes, de 9:00 a 14:00" value={formHorario} onChange={(e) => setFormHorario(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cu-salidas">En qué pueden trabajar</label>
                  <textarea id="cu-salidas" className="form-control" rows={3} value={formSalidas} onChange={(e) => setFormSalidas(e.target.value)}></textarea>
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
      const res = await fetch(`${API_BASE}/auth/sesion`);
      if (res.ok) {
        const data = await res.json();
        if (data) setCurrentUser(data);
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
        <Route path="/cursos/:sector" element={<AlumnosLista />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/centros-de-formacion" element={<AcademiasPublicas />} />
        <Route path="/centro-de-formacion/:id" element={<AcademiaPublica />} />
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
