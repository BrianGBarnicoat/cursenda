// Familias profesionales oficiales del Repertorio Nacional de Certificados de Profesionalidad (SEPE)
export const FAMILIAS: Record<string, string> = {
  ADG: 'Administración y gestión', AFD: 'Actividades físicas y deportivas', AGA: 'Agraria', ARG: 'Artes gráficas',
  ART: 'Artes y artesanías', COM: 'Comercio y marketing', ELE: 'Electricidad y electrónica', ENA: 'Energía y agua',
  EOC: 'Edificación y obra civil', FME: 'Fabricación mecánica', HOT: 'Hostelería y turismo', IEX: 'Industrias extractivas',
  IFC: 'Informática y comunicaciones', IMA: 'Instalación y mantenimiento', IMP: 'Imagen personal', IMS: 'Imagen y sonido',
  INA: 'Industrias alimentarias', MAM: 'Madera, mueble y corcho', MAP: 'Marítimo pesquera', QUI: 'Química', SAN: 'Sanidad',
  SEA: 'Seguridad y medioambiente', SSC: 'Servicios socioculturales y a la comunidad', TCP: 'Textil, confección y piel',
  TMV: 'Transporte y mantenimiento de vehículos', VIC: 'Vidrio y cerámica'
};
export const OTRA_FORMACION = 'Otra formación';

const ANTIGUAS: Record<string, string> = {
  'Informática': FAMILIAS.IFC, 'Logística': FAMILIAS.COM, 'Administración': FAMILIAS.ADG, 'Hostelería': FAMILIAS.HOT, 'Otros': OTRA_FORMACION
};

// El código del certificado dice su familia: SSCS0208 es de SSC. Si no hay código, se traduce el nombre antiguo.
export function familiaDe(titulo: string, categoria: string) {
  const codigo = String(titulo || '').match(/^([A-Z]{3})[A-Z]\d{4}\b/)?.[1];
  return (codigo && FAMILIAS[codigo]) || ANTIGUAS[categoria] || categoria;
}
