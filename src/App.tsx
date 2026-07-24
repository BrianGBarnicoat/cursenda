import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  MapPin, 
  Clock, 
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
  Search,
  Grid,
  Map,
  Building2,
  ArrowRight
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

export const getCourseImage = (categoria: string) => {
  const mapping: { [key: string]: string } = {
    'Informática': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&h=450&q=80',
    'Sanidad': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&h=450&q=80',
    'Logística': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&h=450&q=80',
    'Hostelería': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&h=450&q=80',
    'Administración': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&h=450&q=80'
  };
  return mapping[categoria] || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=450&q=80';
};

// --- PORTAL ALUMNOS: LISTADO ---
function AlumnosHome() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [unfilteredCursos, setUnfilteredCursos] = useState<any[]>([]);
  const [mapSearch, setMapSearch] = useState('');
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [modalidad, setModalidad] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [alumnoFaq, setAlumnoFaq] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [compareList, setCompareList] = useState<any[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardAnswers, setWizardAnswers] = useState({ categoria: '', modalidad: '', situacion: '' });
  const [faqSearch, setFaqSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [activeMapCursoIndex, setActiveMapCursoIndex] = useState(0);

  const popularSearches = [
    'IFCD0210 Desarrollo de Aplicaciones',
    'SANT0208 Atención Sociosanitaria',
    'Logística y Almacén',
    'Administración y Gestión',
    'Fuenlabrada',
    'Madrid',
    'Móstoles'
  ];

  // Observer para revelar elementos al hacer scroll (animación premium)
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
  }, [cursos, viewMode]);

  // Cargar cursos sin filtros para el Asistente
  useEffect(() => {
    const fetchAllCursos = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/cursos`);
        const data = await res.json();
        setUnfilteredCursos(data);
      } catch (err) {
        console.error("Error al cargar cursos para el asistente:", err);
      }
    };
    fetchAllCursos();
  }, []);

  const toggleCompare = (curso: any) => {
    if (compareList.some(c => c.id === curso.id)) {
      setCompareList(compareList.filter(c => c.id !== curso.id));
    } else {
      if (compareList.length >= 3) {
        alert("Puede comparar un máximo de 3 cursos simultáneamente.");
        return;
      }
      setCompareList([...compareList, curso]);
    }
  };

  const fetchCursos = async (searchOverride?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const currentSearch = searchOverride !== undefined ? searchOverride : search;
      if (currentSearch) params.append('search', currentSearch);
      if (categoria && categoria !== 'Todas') params.append('categoria', categoria);
      if (modalidad && modalidad !== 'Todas') params.append('modalidad', modalidad);

      const res = await fetch(`${API_BASE}/public/cursos?${params.toString()}`);
      const data = await res.json();
      setCursos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda y filtrado en tiempo real con debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCursos();
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [search, categoria, modalidad]);

  // Asegura que al cambiar los resultados se resetee el índice del mapa activo a 0
  useEffect(() => {
    setActiveMapCursoIndex(0);
  }, [cursos]);



  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* CABECERA OSCURA DE ALUMNOS */}
      <div style={{ backgroundColor: 'var(--primary-dark)', color: 'var(--white)', paddingBottom: '4.5rem', position: 'relative' }}>
        <header className="alumnos-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'transparent' }}>
          <Logo light={true} />
          <Link to="/centros" className="btn btn-accent btn-sm">Acceso Centros</Link>
        </header>

        <div className="alumnos-container" style={{ textAlign: 'center', marginTop: '2rem', marginBottom: 0 }}>
          <div className="official-accreditation-badge reveal-scale">
            <Shield size={13} className="shield-icon" />
            <span>Catálogo Oficial de Cursos Subvencionados • SEPE y Comunidad de Madrid</span>
          </div>

          <h1 style={{ fontSize: '2.85rem', marginBottom: '0.75rem', color: 'var(--white)', fontWeight: '800', lineHeight: '1.18', letterSpacing: '-0.02em' }}>
            Encuentre su <span style={{ background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>plaza gratuita</span> en cursos subvencionados
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.78)', marginBottom: '2.25rem', maxWidth: '640px', margin: '0 auto 2.25rem', lineHeight: '1.5' }}>
            Formación 100% gratuita financiada por fondos públicos para personas desempleadas y ocupadas. Titulación oficial reconocida.
          </p>

          {/* FLOATING QUICK STATS BAR */}
          <div className="stats-bar reveal-scale stagger-1" style={{
            backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', color: 'var(--white)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', margin: '0 auto', borderRadius: '16px'
          }}>
            <div className="stats-item">
              <div className="stats-icon-box"><BookOpen size={16} /></div>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent)', fontFamily: 'var(--font-title)', display: 'block', lineHeight: 1 }}>
                  {cursos.length > 0 ? cursos.length : '45+'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cursos Activos</span>
              </div>
            </div>
            <div className="stats-divider" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}></div>
            <div className="stats-item">
              <div className="stats-icon-box"><Users size={16} /></div>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--white)', fontFamily: 'var(--font-title)', display: 'block', lineHeight: 1 }}>
                  {cursos.length > 0 ? cursos.reduce((sum: number, c: any) => sum + (c.plazas - c.plazas_cubiertas), 0) : '350+'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plazas Vacantes</span>
              </div>
            </div>
            <div className="stats-divider" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}></div>
            <div className="stats-item">
              <div className="stats-icon-box"><CheckCircle size={16} /></div>
              <div>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent)', fontFamily: 'var(--font-title)', display: 'block', lineHeight: 1 }}>100%</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subvencionado</span>
              </div>
            </div>
          </div>
        </div>
      </div>      <div className="alumnos-container" style={{ marginTop: '-2.25rem', position: 'relative', zIndex: 10 }}>
        {/* PANEL DE BÚSQUEDA UNIFICADO */}
        <div className="search-panel reveal stagger-1">
          <form onSubmit={(e) => { e.preventDefault(); fetchCursos(); }} className="search-filters-bar">
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Buscar curso o localidad</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej: React, Logística, Madrid..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
              />
              {showSuggestions && (
                <div className="suggestions-dropdown" style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'var(--white)', border: '1px solid var(--lines)',
                  borderRadius: '8px', boxShadow: 'var(--card-shadow-hover)',
                  zIndex: 999, marginTop: '0.5rem', maxHeight: '240px', overflowY: 'auto'
                }}>
                  {popularSearches
                    .filter(s => s.toLowerCase().includes(search.toLowerCase()))
                    .map((s, idx) => (
                      <div 
                        key={idx} 
                        className="suggestion-item"
                        style={{
                          padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                          transition: 'background-color 0.2s ease', borderBottom: '1px solid var(--lines-light)',
                          textAlign: 'left', color: 'var(--primary)'
                        }}
                        onMouseDown={() => {
                          setSearch(s);
                          setShowSuggestions(false);
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--lines-light)')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '0.625rem', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                          <Search size={14} />
                        </span> 
                        <span style={{ verticalAlign: 'middle' }}>{s}</span>
                      </div>
                    ))}
                  {popularSearches.filter(s => s.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      No hay sugerencias que coincidan
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <select className="form-control" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="Todas">Todas</option>
                <option value="Informática">Informática</option>
                <option value="Sanidad">Sanidad</option>
                <option value="Logística">Logística</option>
                <option value="Administración">Administración</option>
                <option value="Hostelería">Hostelería</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Modalidad</label>
              <select className="form-control" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
                <option value="Todas">Todas</option>
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', whiteSpace: 'nowrap' }}>
              <Search size={16} />
              <span>Buscar</span>
            </button>
          </form>

          {/* FILA INFERIOR: CATEGORÍAS POPULARES + BOTÓN AL ASISTENTE */}
          <div className="search-panel-footer" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--lines-light)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.5rem', fontWeight: 600 }}>Categorías populares:</span>
              {['Todas', 'Informática', 'Sanidad', 'Logística', 'Hostelería'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={categoria === cat ? { backgroundColor: 'var(--primary)', color: 'var(--white)', borderColor: 'var(--primary)', borderRadius: '16px' } : { borderRadius: '16px' }}
                  onClick={() => setCategoria(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button 
              type="button"
              onClick={() => { setWizardOpen(true); setWizardStep(1); setWizardAnswers({ categoria: '', modalidad: '', situacion: '' }); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                color: 'var(--accent)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: 0
              }}
            >
              <span>💡 ¿No está seguro? Pruebe el Asistente</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando cursos disponibles...</div>
        ) : (
          <div>
            {/* BARRA DE RESULTADOS Y CHIPS DE FILTRO */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '0.25rem 0.5rem',
              animation: 'fadeIn 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Mostrando <strong style={{ color: 'var(--primary)' }}>{cursos.length}</strong> cursos de formación subvencionada
                </div>
                {cursos.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', backgroundColor: '#e2e0d880', padding: '3px', borderRadius: '8px', border: '1px solid var(--lines)' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.375rem', 
                        padding: '5px 12px', 
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        boxShadow: viewMode === 'grid' ? '0 2px 6px rgba(12, 59, 51, 0.1)' : 'none',
                        backgroundColor: viewMode === 'grid' ? 'var(--white)' : 'transparent',
                        color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Grid size={13} />
                      <span>Cuadrícula</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('map');
                        setActiveMapCursoIndex(0);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.375rem', 
                        padding: '5px 12px', 
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        boxShadow: viewMode === 'map' ? '0 2px 6px rgba(12, 59, 51, 0.1)' : 'none',
                        backgroundColor: viewMode === 'map' ? 'var(--white)' : 'transparent',
                        color: viewMode === 'map' ? 'var(--primary)' : 'var(--text-muted)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Map size={13} />
                      <span>Mapa</span>
                    </button>
                  </div>
                )}
              </div>
              
              {(search || (categoria && categoria !== 'Todas') || (modalidad && modalidad !== 'Todas')) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filtros activos:</span>
                  {search && (
                    <span className="course-meta-tag" style={{ backgroundColor: 'var(--white)', border: '1px solid var(--lines)', color: 'var(--primary)', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      "{search}"
                      <button type="button" onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-flex', lineHeight: 1 }}>&times;</button>
                    </span>
                  )}
                  {categoria && categoria !== 'Todas' && (
                    <span className="course-meta-tag" style={{ backgroundColor: 'var(--white)', border: '1px solid var(--lines)', color: 'var(--primary)', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {categoria}
                      <button type="button" onClick={() => setCategoria('Todas')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-flex', lineHeight: 1 }}>&times;</button>
                    </span>
                  )}
                  {modalidad && modalidad !== 'Todas' && (
                    <span className="course-meta-tag" style={{ backgroundColor: 'var(--white)', border: '1px solid var(--lines)', color: 'var(--primary)', padding: '2px 8px', fontSize: '0.75rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {modalidad}
                      <button type="button" onClick={() => setModalidad('Todas')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-flex', lineHeight: 1 }}>&times;</button>
                    </span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => {
                      setSearch('');
                      setCategoria('Todas');
                      setModalidad('Todas');
                    }} 
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px',
                      fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline'
                    }}
                  >
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            {cursos.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} style={{ color: 'var(--text-muted)' }} />
                <h3 className="empty-state-title">No se encontraron cursos</h3>
                <p className="empty-state-desc">Intente ajustar los filtros de búsqueda o categoría para encontrar otras opciones.</p>
              </div>
            ) : viewMode === 'map' ? (
              (() => {
                const filteredMapCursos = cursos.filter(curso => {
                  const query = mapSearch.toLowerCase();
                  return (
                    curso.titulo.toLowerCase().includes(query) ||
                    curso.localidad.toLowerCase().includes(query) ||
                    (curso.centro_nombre && curso.centro_nombre.toLowerCase().includes(query)) ||
                    curso.categoria.toLowerCase().includes(query)
                  );
                });

                const mapSafeIndex = (filteredMapCursos && activeMapCursoIndex < filteredMapCursos.length && activeMapCursoIndex >= 0) ? activeMapCursoIndex : 0;
                const mapSafeCurso = (filteredMapCursos && filteredMapCursos.length > 0) ? filteredMapCursos[mapSafeIndex] : null;

                return (
                  <div className="map-explorer-layout">
                    {/* Left Side: Search + Compact List */}
                    <div className="map-explorer-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Buscar en el mapa (ciudad, academia, curso...)"
                          value={mapSearch}
                          onChange={(e) => {
                            setMapSearch(e.target.value);
                            setActiveMapCursoIndex(0);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.625rem 2.5rem 0.625rem 1.25rem',
                            borderRadius: '8px',
                            border: '1px solid var(--lines)',
                            fontSize: '0.8125rem',
                            backgroundColor: 'var(--white)',
                            color: 'var(--primary)',
                            boxShadow: 'var(--card-shadow)',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--lines)'}
                        />
                        <Search size={14} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      </div>
                      
                      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, paddingRight: '0.25rem', maxHeight: '520px' }}>
                        {filteredMapCursos.length > 0 ? (
                          filteredMapCursos.map((curso, idx) => {
                            const active = idx === mapSafeIndex;
                            const plazasLibres = curso.plazas - (curso.plazas_cubiertas || 0);
                            return (
                              <div 
                                key={curso.id}
                                onClick={() => setActiveMapCursoIndex(idx)}
                                style={{
                                  backgroundColor: 'var(--white)',
                                  border: active ? '2px solid var(--accent)' : '1px solid rgba(12, 59, 51, 0.1)',
                                  borderRadius: '14px',
                                  padding: '1.15rem 1.25rem',
                                  cursor: 'pointer',
                                  boxShadow: active ? '0 8px 24px -4px rgba(212, 158, 53, 0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  transform: active ? 'translateX(4px)' : 'none',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <span className="course-meta-tag category-tag" style={{ fontSize: '0.625rem', padding: '2px 8px' }}>{curso.categoria}</span>
                                    <span className="course-meta-tag modality-tag" style={{ fontSize: '0.625rem', padding: '2px 8px' }}>{curso.modalidad}</span>
                                  </div>
                                  <Link 
                                    to={`/curso/${curso.id}`}
                                    style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Detalles <ArrowRight size={12} />
                                  </Link>
                                </div>
                                <h4 style={{ color: 'var(--primary)', margin: '0.35rem 0 0.5rem', fontSize: '0.9375rem', fontWeight: 700, lineHeight: '1.3' }}>{curso.titulo}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                                  <span className="course-info-bullet" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                                    <MapPin size={12} style={{ color: 'var(--accent)' }} />
                                    {curso.localidad}
                                  </span>
                                  <span style={{ 
                                    color: plazasLibres <= 3 ? 'var(--accent)' : 'var(--success-text)', 
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}>
                                    {plazasLibres <= 3 ? `¡Últimas ${plazasLibres} plazas!` : `${plazasLibres} vacantes`}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            No se encontraron cursos que coincidan con la búsqueda en el mapa.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Map Centered on Selected Course Locality */}
                    <div className="map-explorer-container" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--lines)', boxShadow: 'var(--card-shadow)', height: '100%' }}>
                      {mapSafeCurso ? (
                        <iframe 
                          title="Geolocalización del curso"
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight={0} 
                          marginWidth={0} 
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapSafeCurso.modalidad === 'Online' ? 'España' : (mapSafeCurso.centro_nombre || 'Academia') + ', ' + cleanLocalidad(mapSafeCurso.localidad) + ', España')}&t=&z=${mapSafeCurso.modalidad === 'Online' ? 5 : 16}&ie=UTF8&iwloc=&output=embed`}
                          style={{ border: 0 }}
                        ></iframe>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          Seleccione un curso del listado para ver su ubicación.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="courses-grid">
                {(() => {
                  const cards = [];
                  
                  cursos.forEach((curso, idx) => {
                    cards.push(
                      <div key={curso.id} className={`course-card reveal stagger-${(idx % 4) + 1}`}>
                        <div className="course-card-banner">
                          <button 
                            type="button" 
                            className={`course-card-compare-btn ${compareList.some(c => c.id === curso.id) ? 'active' : ''}`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(curso); }}
                          >
                            {compareList.some(c => c.id === curso.id) ? (
                              <><Check size={13} /> Comparando</>
                            ) : (
                              <><Plus size={13} /> Comparar</>
                            )}
                          </button>
                          <img 
                            src={getCourseImage(curso.categoria)} 
                            alt={curso.titulo} 
                            className="course-card-img" 
                          />
                          <div className="course-card-banner-shadow"></div>
                          <div className="course-card-meta-overlay">
                            <span className="course-meta-tag category-tag">{curso.categoria}</span>
                            <span className="course-meta-tag modality-tag">{curso.modalidad}</span>
                          </div>
                        </div>
                        
                        <div className="course-card-body">
                          <div className="course-card-top">
                            <h3 className="course-card-title" title={curso.titulo}>{curso.titulo}</h3>
                            <div className="course-provider">
                              <Building2 size={14} className="provider-icon" />
                              <span>{curso.centro_nombre}</span>
                            </div>
                            
                            <div className="course-info-row">
                              <div className="course-info-bullet">
                                <span className="bullet-icon"><MapPin size={13} /></span>
                                <span>{curso.localidad}</span>
                              </div>
                              <div className="course-info-bullet">
                                <span className="bullet-icon"><Clock size={13} /></span>
                                <span>{curso.duracion_horas} horas</span>
                              </div>
                              <div className="course-info-bullet">
                                <span className="bullet-icon"><Users size={13} /></span>
                                <span>{curso.dirigido_a}</span>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const plazasLibres = curso.plazas - (curso.plazas_cubiertas || 0);
                            const percentage = Math.min(100, Math.max(5, ((curso.plazas_cubiertas || 0) / curso.plazas) * 100));
                            const isUrgent = plazasLibres <= 3;
                            return (
                              <div className="course-plazas-box">
                                <div className="plazas-header">
                                  <span className="plazas-label">Plazas ocupadas</span>
                                  <span className={`plazas-value ${isUrgent ? 'urgent' : 'available'}`}>
                                    {isUrgent ? (
                                      <span className="urgent-badge">
                                        <span className="pulse-dot"></span>
                                        ¡Últimas {plazasLibres} plazas!
                                      </span>
                                    ) : (
                                      `${plazasLibres} vacantes`
                                    )}
                                  </span>
                                </div>
                                <div className="plazas-bar-track">
                                  <div 
                                    className={`plazas-bar-fill ${isUrgent ? 'fill-urgent' : 'fill-normal'}`} 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="course-card-footer">
                            <div className="price-tag-wrapper">
                              <span className="course-price-badge">Gratis</span>
                              <span className="price-subtext">100% Subvencionado</span>
                            </div>
                            <Link to={`/curso/${curso.id}`} className="btn btn-primary btn-sm btn-card-action">
                              <span>Ver detalles</span>
                              <ArrowRight size={14} className="arrow-icon" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );

                    if (idx === 1) {
                      cards.push(
                        <div key="wizard-promo" className="course-card wizard-promo-card reveal stagger-3">
                          <span style={{ fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block' }}>💡</span>
                          <h3 style={{ color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>¿No sabe qué elegir?</h3>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5', padding: '0 0.5rem' }}>
                            Responda a 3 preguntas rápidas en nuestro recomendador para encontrar su plaza ideal de inmediato.
                          </p>
                          <button 
                            type="button"
                            onClick={() => { setWizardOpen(true); setWizardStep(1); setWizardAnswers({ categoria: '', modalidad: '', situacion: '' }); }}
                            className="btn btn-accent btn-sm"
                            style={{ width: '100%', marginTop: 'auto' }}
                          >
                            Iniciar Asistente
                          </button>
                        </div>
                      );
                    }
                  });

                  if (cursos.length < 2) {
                    cards.push(
                      <div key="wizard-promo" className="course-card wizard-promo-card reveal stagger-2">
                        <span style={{ fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block' }}>💡</span>
                        <h3 style={{ color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>¿No sabe qué elegir?</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5', padding: '0 0.5rem' }}>
                          Responda a 3 preguntas rápidas en nuestro recomendador para encontrar su plaza ideal de inmediato.
                        </p>
                        <button 
                          type="button"
                          onClick={() => { setWizardOpen(true); setWizardStep(1); setWizardAnswers({ categoria: '', modalidad: '', situacion: '' }); }}
                          className="btn btn-accent btn-sm"
                          style={{ width: '100%', marginTop: 'auto' }}
                        >
                          Iniciar Asistente
                        </button>
                      </div>
                    );
                  }

                  return cards;
                })()}
              </div>
        )}
      </div>
    )}
  </div>

      {/* BUSCADOR POR COMUNIDAD AUTÓNOMA */}
      <div className="alumnos-container reveal" style={{ marginTop: '3.5rem', marginBottom: '3.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', textAlign: 'center', marginBottom: '0.5rem' }}>Buscar por Comunidad Autónoma</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Explore y filtre las plazas subvencionadas disponibles en las principales regiones
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { name: 'Madrid', code: 'Madrid' },
            { name: 'Cataluña', code: 'Cataluña' },
            { name: 'Andalucía', code: 'Andalucía' },
            { name: 'C. Valenciana', code: 'Valenciana' },
            { name: 'País Vasco', code: 'Vasco' },
            { name: 'Galicia', code: 'Galicia' },
          ].map((reg) => (
            <button
              key={reg.name}
              type="button"
              onClick={() => {
                setSearch(reg.code);
                const params = new URLSearchParams();
                params.append('search', reg.code);
                if (categoria && categoria !== 'Todas') params.append('categoria', categoria);
                if (modalidad && modalidad !== 'Todas') params.append('modalidad', modalidad);
                fetch(`${API_BASE}/public/cursos?${params.toString()}`)
                  .then(res => res.json())
                  .then(data => setCursos(data));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--lines)',
                borderRadius: '30px',
                padding: '0.625rem 1.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--primary)',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--card-shadow)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => { 
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; 
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; 
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
              }}
              onMouseOut={(e) => { 
                (e.currentTarget as HTMLElement).style.transform = ''; 
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--lines)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
              }}
            >
              <MapPin size={14} style={{ color: 'var(--accent)' }} />
              <span>{reg.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CÓMO FUNCIONA */}
      <div className="alumnos-container" style={{ marginTop: '4rem', borderTop: '1px solid var(--lines)' }}>
        <h2 style={{ fontSize: '1.75rem', color: 'var(--primary)', textAlign: 'center', margin: '4rem 0 2.5rem' }}>Cómo funciona la matriculación en Cursenda</h2>
        <div className="features-grid">
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <span className="step-number">1</span>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>Encuentre su curso</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Explore los cursos subvencionados de distintas especialidades oficiales del SEPE disponibles en su zona o en modalidad online.</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <span className="step-number">2</span>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>Solicite su plaza gratis</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>Rellene el formulario de inscripción en menos de un minuto. No requerimos ningún método de pago: el curso está subvencionado al 100%.</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <span className="step-number">3</span>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>Validación y Matrícula</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>El centro de formación oficial se pondrá en contacto con usted en un plazo máximo de 24 horas para validar sus requisitos y formalizar la plaza.</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN INFORMATIVA: FAQ Y REQUISITOS (2 COLUMNAS) */}
      <div className="alumnos-container reveal" style={{ marginTop: '5rem', marginBottom: '3.5rem' }}>
        <div className="info-requirements-grid">
          {/* COLUMNA IZQUIERDA: FAQ */}
          <div className="faq-column">
            <h2 style={{ fontSize: '1.625rem', color: 'var(--primary)', marginBottom: '0.5rem', textAlign: 'left' }}>Preguntas Frecuentes</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.875rem', textAlign: 'left' }}>
              Todo lo que necesita saber sobre la formación subvencionada
            </p>
            
            {/* BUSCADOR DE FAQ */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar en preguntas frecuentes..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', height: '40px', fontSize: '0.875rem' }}
              />
              <span style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Search size={14} />
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { q: '¿Realmente es gratis?', a: 'Sí. Los cursos están 100% financiados por fondos públicos del SEPE (Servicio Público de Empleo Estatal) y los servicios autonómicos de empleo. No se requiere ningún pago ni dato bancario por parte del alumno.' },
                { q: '¿Quién puede acceder a estos cursos?', a: 'Trabajadores en activo (cuenta ajena, autónomos, ERTE), desempleados inscritos como demandantes de empleo y colectivos prioritarios (jóvenes menores de 30, mayores de 45, mujeres, personas con discapacidad).' },
                { q: '¿Los certificados tienen validez oficial?', a: 'Sí. Los cursos de Certificado de Profesionalidad están reconocidos oficialmente por el SEPE en todo el territorio nacional y acreditan competencias profesionales con plena validez laboral.' },
                { q: '¿Cuánto tarda el proceso de matrícula?', a: 'El formulario de solicitud se completa en menos de 1 minuto. El centro de formación se pondrá en contacto con usted en un plazo máximo de 24 horas hábiles para confirmar su plaza y los requisitos documentales.' },
                { q: '¿Puedo solicitar plaza en varios cursos a la vez?', a: 'Sí, puede enviar solicitudes a todos los cursos que le interesen. Cada centro gestionará de forma independiente su candidatura y le informará de la disponibilidad.' },
              ].filter(faq => 
                faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
                faq.a.toLowerCase().includes(faqSearch.toLowerCase())
              ).map((faq, i) => (
                <div key={i} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--lines)', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setAlumnoFaq(alumnoFaq === i ? -1 : i)}
                    style={{ width: '100%', padding: '1.25rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--primary)' }}>{faq.q}</span>
                    <span style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 'bold', flexShrink: 0, marginLeft: '1rem' }}>{alumnoFaq === i ? '−' : '+'}</span>
                  </button>
                  {alumnoFaq === i && (
                    <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{faq.a}</div>
                  )}
                </div>
              ))}
              {[
                { q: '¿Realmente es gratis?', a: 'Sí. Los cursos están 100% financiados por fondos públicos del SEPE...' },
                { q: '¿Quién puede acceder a estos cursos?', a: 'Trabajadores en activo...' },
                { q: '¿Los certificados tienen validez oficial?', a: 'Sí...' },
                { q: '¿Cuánto tarda el proceso de matrícula?', a: 'El formulario de solicitud se completa...' },
                { q: '¿Puedo solicitar plaza en varios cursos a la vez?', a: 'Sí, puede enviar solicitudes...' },
              ].filter(faq => 
                faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
                faq.a.toLowerCase().includes(faqSearch.toLowerCase())
              ).length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--lines)', borderRadius: '8px' }}>
                  No se encontraron preguntas frecuentes que coincidan con "{faqSearch}".
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: REQUISITOS GENERALES */}
          <div className="requirements-column">
            <div style={{ 
              backgroundColor: 'var(--white)', 
              border: '1px solid var(--lines)', 
              padding: '2.25rem', 
              borderRadius: '16px', 
              boxShadow: 'var(--card-shadow)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                <Shield size={20} style={{ color: 'var(--accent)' }} />
                <span>Requisitos de Acceso</span>
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Los cursos publicados están subvencionados al 100% por el SEPE. Para acceder, debe cumplir alguno de los siguientes requisitos en España:
              </p>
              <ul style={{ paddingLeft: '0', listStyle: 'none', fontSize: '0.875rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '1.25rem', lineHeight: '1.5', margin: 0 }}>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle size={16} style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Trabajadores en activo:</strong> Empleados de cualquier sector o autónomos. Financiado por Fundae.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle size={16} style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Desempleados:</strong> Inscritos oficialmente como demandantes de empleo (DARDE activa).</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle size={16} style={{ color: 'var(--success-text)', flexShrink: 0, marginTop: '2px' }} />
                  <span><strong>Colectivos Prioritarios:</strong> Menores de 30 años, mayores de 45 años, mujeres y personas con discapacidad.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER CENTROS */}
      <div className="centros-cross-banner" style={{ marginTop: '4rem' }}>
        <div className="centros-cross-content">
          <h2 className="centros-cross-title">¿Representa a un centro de formación?</h2>
          <p className="centros-cross-desc">Publique sus cursos subvencionados de forma totalmente gratuita y capte alumnos interesados en sus plazas libres.</p>
          <Link to="/centros" className="btn btn-accent btn-sm">Más información y planes</Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div>
            <Logo />
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Buscador de cursos subvencionados gratuitos en España.</p>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
            <strong>Recursos</strong>
            <p style={{ marginTop: '0.5rem' }}><Link to="/centros" style={{ color: 'rgba(255,255,255,0.5)' }}>Para Centros de Formación</Link></p>
            <p><Link to="/centros/login" style={{ color: 'rgba(255,255,255,0.5)' }}>Panel de Gestión</Link></p>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
            <strong>Contacto</strong>
            <p style={{ marginTop: '0.5rem' }}>soporte@cursenda.es</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Cursenda. Todos los derechos reservados.</span>
          <div className="footer-links">
            <a href="#" className="footer-link">Aviso Legal</a>
            <a href="#" className="footer-link">Privacidad</a>
            <a href="#" className="footer-link">Cookies</a>
          </div>
        </div>
      </footer>

      {/* COMPARADOR: BARRA FLOTANTE */}
      {compareList.length > 0 && (
        <div className="compare-floating-bar" style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--primary-dark)', color: 'var(--white)', padding: '1rem 1.5rem',
          borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 10px 35px rgba(8, 42, 36, 0.35)', zIndex: 9999,
          border: '1px solid rgba(255,255,255,0.12)', width: 'max-content', maxWidth: '90%',
          animation: 'fadeInScale 0.3s ease-out', flexWrap: 'wrap', justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ backgroundColor: 'var(--accent)', color: 'var(--white)', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
              {compareList.length}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cursos para comparar</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {compareList.map(c => (
              <div key={c.id} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo}</span>
                <button 
                  onClick={() => setCompareList(compareList.filter(item => item.id !== c.id))}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', padding: 0 }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              onClick={() => setCompareModalOpen(true)}
              className="btn btn-accent btn-sm"
              style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
            >
              Comparar ahora
            </button>
            <button 
              onClick={() => setCompareList([])}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline' }}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* COMPARADOR: MODAL MATRIX */}
      {compareModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 59, 51, 0.65)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="reveal-scale visible" style={{
            backgroundColor: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '880px',
            boxShadow: '0 25px 50px -12px rgba(8, 42, 36, 0.25)', border: '1px solid var(--lines)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--lines)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 800 }}>Comparador de Cursos</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Analice las diferencias cara a cara para elegir su plaza ideal</p>
              </div>
              <button 
                onClick={() => setCompareModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', display: 'inline-flex', padding: '0.5rem' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body (Scrollable Table) */}
            <div style={{ padding: '2rem', overflowX: 'auto', flexGrow: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--lines)' }}>
                    <th style={{ padding: '1rem', width: '180px', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Característica</th>
                    {compareList.map(c => (
                      <th key={c.id} style={{ padding: '1rem', color: 'var(--primary)', fontSize: '0.9375rem', fontWeight: 700, verticalAlign: 'top' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{c.categoria}</div>
                        {c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Centro Organizador</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{c.centro_nombre}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Modalidad</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem' }}>
                        <span className="course-meta-tag" style={{ backgroundColor: 'var(--primary)', color: 'var(--white)', display: 'inline-block' }}>{c.modalidad}</span>
                      </td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Duración</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>{c.duracion_horas} horas</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Localidad</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text)' }}>{c.localidad}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Dirigido a</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c.dirigido_a}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--lines-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Plazas Libres</td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--success-text)', fontWeight: 600 }}>
                        {c.plazas - c.plazas_cubiertas} vacantes
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '1.5rem 1rem' }}></td>
                    {compareList.map(c => (
                      <td key={c.id} style={{ padding: '1.5rem 1rem' }}>
                        <Link 
                          to={`/curso/${c.id}`} 
                          onClick={() => setCompareModalOpen(false)}
                          className="btn btn-primary btn-sm" 
                          style={{ width: '100%', textAlign: 'center' }}
                        >
                          Ver ficha y Matricularse
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD RECOMENDADOR INTELIGENTE */}
      {wizardOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(12, 59, 51, 0.65)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="reveal-scale visible" style={{
            backgroundColor: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(8, 42, 36, 0.25)', border: '1px solid var(--lines)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--lines)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.125rem', fontWeight: 800 }}>Recomendador Inteligente</h3>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paso {wizardStep} de 3</p>
              </div>
              <button 
                onClick={() => setWizardOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.375rem', cursor: 'pointer', display: 'inline-flex', padding: '0.25rem' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.75rem', overflowY: 'auto' }}>
              {/* STEP 1: CATEGORY */}
              {wizardStep === 1 && (
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700 }}>1. ¿Qué área profesional te interesa aprender?</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { key: 'Informática', label: 'Informática y Tecnología (Web, Ciberseguridad...)', desc: 'Sectores con alta demanda y salarios competitivos' },
                      { key: 'Sanidad', label: 'Sanidad y Cuidados (Auxiliar de Enfermería...)', desc: 'Empleabilidad del 95% en centros y residencias' },
                      { key: 'Logística', label: 'Logística y Almacén (Gestión de Stock...)', desc: 'Clave para el comercio electrónico y distribución' },
                      { key: 'Hostelería', label: 'Hostelería y Cocina (Sumillería, Sala...)', desc: 'Especializaciones en el principal motor turístico' },
                      { key: 'Administración', label: 'Gestión y Administración (Microempresas...)', desc: 'Formación transversal útil para cualquier sector' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setWizardAnswers({ ...wizardAnswers, categoria: opt.key });
                          setWizardStep(2);
                        }}
                        style={{
                          textAlign: 'left', padding: '1rem', border: '1px solid var(--lines)',
                          borderRadius: '8px', cursor: 'pointer', backgroundColor: 'var(--white)',
                          transition: 'all 0.2s ease', display: 'block', width: '100%'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--lines)'; e.currentTarget.style.backgroundColor = 'var(--white)'; }}
                      >
                        <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.875rem' }}>{opt.label}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: MODALITY */}
              {wizardStep === 2 && (
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700 }}>2. ¿Qué modalidad de estudio prefieres?</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { key: 'Online', label: '100% Online', desc: 'Clases virtuales a tu ritmo desde cualquier lugar' },
                      { key: 'Presencial', label: 'Presencial', desc: 'Clases y prácticas físicas en aula acreditada' },
                      { key: 'Todas', label: 'Indiferente / Mixta', desc: 'Cualquier modalidad que tenga plazas libres rápidas' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setWizardAnswers({ ...wizardAnswers, modalidad: opt.key });
                          setWizardStep(3);
                        }}
                        style={{
                          textAlign: 'left', padding: '1rem', border: '1px solid var(--lines)',
                          borderRadius: '8px', cursor: 'pointer', backgroundColor: 'var(--white)',
                          transition: 'all 0.2s ease', display: 'block', width: '100%'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--lines)'; e.currentTarget.style.backgroundColor = 'var(--white)'; }}
                      >
                        <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.875rem' }}>{opt.label}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setWizardStep(1)} 
                    style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline' }}
                  >
                    Volver atrás
                  </button>
                </div>
              )}

              {/* STEP 3: EMPLOYMENT STATUS */}
              {wizardStep === 3 && (
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700 }}>3. ¿Cuál es su situación laboral actual?</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { key: 'desempleado', label: 'Desempleado / Demandante de empleo', desc: 'Acceso preferente en cursos del plan nacional de empleo' },
                      { key: 'ocupado', label: 'Trabajador contratado o autónomo', desc: 'Formación de reciclaje compatible con horarios laborales' },
                      { key: 'joven', label: 'Joven menor de 30 años', desc: 'Programas de inserción y de garantía juvenil del SEPE' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setWizardAnswers({ ...wizardAnswers, situacion: opt.key });
                          setWizardStep(4);
                        }}
                        style={{
                          textAlign: 'left', padding: '1rem', border: '1px solid var(--lines)',
                          borderRadius: '8px', cursor: 'pointer', backgroundColor: 'var(--white)',
                          transition: 'all 0.2s ease', display: 'block', width: '100%'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--lines)'; e.currentTarget.style.backgroundColor = 'var(--white)'; }}
                      >
                        <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.875rem' }}>{opt.label}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setWizardStep(2)} 
                    style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', textDecoration: 'underline' }}
                  >
                    Volver atrás
                  </button>
                </div>
              )}

              {/* STEP 4: RECOMMENDATIONS RESULTS */}
              {wizardStep === 4 && (() => {
                // Filter the real catalog
                const sourceCursos = unfilteredCursos.length > 0 ? unfilteredCursos : cursos;
                const filtered = sourceCursos.filter(c => {
                  const matchCat = c.categoria === wizardAnswers.categoria;
                  const matchMod = wizardAnswers.modalidad === 'Todas' || c.modalidad === wizardAnswers.modalidad;
                  
                  // Match situacion
                  let matchSit = true;
                  const sit = wizardAnswers.situacion;
                  const dir = c.dirigido_a ? c.dirigido_a.toLowerCase() : '';
                  if (sit === 'desempleado') {
                    matchSit = dir.includes('desempleado') || dir.includes('todos') || dir.includes('cualquiera') || dir === '';
                  } else if (sit === 'ocupado') {
                    matchSit = dir.includes('ocupado') || dir.includes('todos') || dir.includes('cualquiera') || dir === '';
                  } else if (sit === 'joven') {
                    matchSit = dir.includes('joven') || dir.includes('todos') || dir.includes('desempleado') || dir.includes('cualquiera') || dir === '';
                  }
                  
                  return matchCat && matchMod && matchSit;
                });

                return (
                  <div>
                    <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>¡Plazas recomendadas para ti!</h4>
                    <p style={{ margin: '0 0 1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Recomendaciones basadas en: {wizardAnswers.categoria} • {wizardAnswers.modalidad === 'Todas' ? 'Cualquier modalidad' : wizardAnswers.modalidad} • {wizardAnswers.situacion === 'desempleado' ? 'Desempleado' : wizardAnswers.situacion === 'ocupado' ? 'Trabajador' : 'Joven <30'}
                    </p>

                    {filtered.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {filtered.slice(0, 3).map(c => (
                          <div key={c.id} style={{ padding: '1rem', border: '1px solid var(--lines)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--white)' }}>
                            <div>
                              <span className="course-meta-tag" style={{ backgroundColor: 'var(--primary-dark)', color: 'var(--white)', padding: '2px 8px', fontSize: '0.6875rem' }}>{c.modalidad}</span>
                              <h5 style={{ margin: '0.375rem 0 0.125rem', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 700 }}>{c.titulo}</h5>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.centro_nombre} • {c.duracion_horas}h</span>
                            </div>
                            <Link 
                              to={`/curso/${c.id}`}
                              onClick={() => setWizardOpen(false)}
                              className="btn btn-primary btn-sm"
                              style={{ flexShrink: 0, padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              Ver Plaza
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>⚠️</div>
                        <strong style={{ color: 'var(--primary)', display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>No hay convocatorias directas en este momento</strong>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No hay cursos activos de {wizardAnswers.categoria} en la modalidad elegida para tu perfil. Te sugerimos registrarte en la base general o ver otros cursos populares:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {sourceCursos.slice(0, 2).map(c => (
                            <div key={c.id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--lines)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(201,150,46,0.03)', textAlign: 'left' }}>
                              <div>
                                <h6 style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>{c.titulo}</h6>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{c.categoria} • {c.modalidad}</span>
                              </div>
                              <Link 
                                to={`/curso/${c.id}`}
                                onClick={() => setWizardOpen(false)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Ver Curso
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--lines)', paddingTop: '1.25rem' }}>
                      <button 
                        type="button"
                        onClick={() => setWizardStep(1)} 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }}
                      >
                        Reiniciar test
                      </button>
                      <button 
                        type="button"
                        onClick={() => setWizardOpen(false)} 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }}
                      >
                        Cerrar asistente
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PORTAL ALUMNOS: DETALLE ---
function AlumnosDetalle() {
  const { id } = useParams();
  const [curso, setCurso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Formulario de solicitud
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rgpd, setRgpd] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [eligibilityCheck, setEligibilityCheck] = useState({ sepe: false, region: false, level: false });

  const fetchCurso = async () => {
    try {
      const res = await fetch(`${API_BASE}/public/cursos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurso(data);
        // Registrar visita
        fetch(`${API_BASE}/public/cursos/${id}/visita`, { method: 'POST' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurso();
  }, [id]);

  useEffect(() => {
    if (!curso) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.05 });

    const elements = document.querySelectorAll('.reveal, .reveal-scale, .reveal-left');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
      observer.disconnect();
    };
  }, [curso]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      setSubmitError('Por favor, rellene todos los campos requeridos');
      return;
    }

    if (!rgpd) {
      setSubmitError('Debe aceptar la política de privacidad y protección de datos');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/public/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curso_id: id, nombre, email, telefono, rgpd })
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.error || 'Error al enviar la solicitud');
      }
    } catch (err) {
      setSubmitError('Error de red. Inténtelo de nuevo.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando detalles del curso...</div>;
  if (!curso) return <div style={{ textAlign: 'center', padding: '5rem' }}>Curso no encontrado. <Link to="/">Volver al buscador</Link></div>;

  const plazasPct = Math.min(100, Math.round((curso.plazas_cubiertas / curso.plazas) * 100));

  return (
    <div>
      <header className="alumnos-header">
        <Logo />
        <Link to="/" className="btn btn-secondary btn-sm">← Volver al buscador</Link>
      </header>

      <div className="alumnos-container">
        <div className="course-detail-layout">
          <div className="course-detail-main reveal" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="course-detail-banner" style={{ height: '260px', width: '100%', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={getCourseImage(curso.categoria)} 
                alt={curso.titulo} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 5, display: 'flex', gap: '0.5rem' }}>
                <span className="course-meta-tag" style={{ backgroundColor: 'var(--primary)', color: 'var(--white)', padding: '4px 12px' }}>{curso.categoria}</span>
                <span className="course-meta-tag" style={{ backgroundColor: 'var(--accent)', color: 'var(--white)', padding: '4px 12px' }}>{curso.modalidad}</span>
              </div>
            </div>

            <div className="course-detail-body">
              <h1 className="course-detail-title" style={{ marginTop: 0 }}>{curso.titulo}</h1>
              <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Impartido por: <strong>{curso.centro_nombre}</strong></div>

            <div className="course-detail-meta">
              <div className="course-detail-meta-item">
                <span className="course-detail-meta-label">Localidad</span>
                <span className="course-detail-meta-value">{curso.localidad}</span>
              </div>
              <div className="course-detail-meta-item">
                <span className="course-detail-meta-label">Duración</span>
                <span className="course-detail-meta-value">{curso.duracion_horas} horas</span>
              </div>
              <div className="course-detail-meta-item">
                <span className="course-detail-meta-label">Dirigido a</span>
                <span className="course-detail-meta-value">{curso.dirigido_a}</span>
              </div>
            </div>

            <div className="course-detail-description">
              <h3>Descripción del curso</h3>
              <p>{curso.descripcion}</p>
            </div>

            {/* COMPROBADOR INTERACTIVO DE REQUISITOS */}
            <div style={{
              marginTop: '2.5rem', padding: '1.75rem', backgroundColor: 'var(--bg)',
              border: '1px solid var(--lines)', borderRadius: '12px',
            }}>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--primary)', fontSize: '1.05rem', fontWeight: 700 }}>
                ¿Cumplo los requisitos de acceso gratuito?
              </h4>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Verifique su perfil para confirmar que es elegible para esta plaza 100% subvencionada.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text)' }}>
                  <input 
                    type="checkbox" 
                    checked={eligibilityCheck.sepe} 
                    onChange={(e) => setEligibilityCheck({ ...eligibilityCheck, sepe: e.target.checked })}
                    style={{ marginTop: '3px' }}
                  />
                  <span>Soy trabajador en activo, autónomo o desempleado inscrito como demandante de empleo.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text)' }}>
                  <input 
                    type="checkbox" 
                    checked={eligibilityCheck.region} 
                    onChange={(e) => setEligibilityCheck({ ...eligibilityCheck, region: e.target.checked })}
                    style={{ marginTop: '3px' }}
                  />
                  <span>Resido en España (para modalidad Online) o en la provincia del centro (para modalidad Presencial/Mixta).</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text)' }}>
                  <input 
                    type="checkbox" 
                    checked={eligibilityCheck.level} 
                    onChange={(e) => setEligibilityCheck({ ...eligibilityCheck, level: e.target.checked })}
                    style={{ marginTop: '3px' }}
                  />
                  <span>Poseo el nivel mínimo de estudios/competencias requerido para este tipo de curso.</span>
                </label>
              </div>

              {(eligibilityCheck.sepe && eligibilityCheck.region && eligibilityCheck.level) ? (
                <div className="alert-box alert-success" style={{ padding: '0.875rem 1rem', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <Check size={16} />
                  <span><strong>¡Apto para Subvención!</strong> Cumple los requisitos generales. Puede solicitar su plaza con total garantía.</span>
                </div>
              ) : (
                <div className="alert-box alert-warning" style={{ padding: '0.875rem 1rem', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', borderRadius: '6px' }}>
                  <span>Marque las tres casillas para validar su perfil y confirmar su aptitud.</span>
                </div>
              )}
            </div>

            {/* MAPA DE UBICACIÓN / COBERTURA */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--lines)', paddingTop: '2rem' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                Ubicación y Cobertura
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {curso.modalidad === 'Online' 
                  ? 'Este curso se imparte en modalidad 100% online, disponible para residentes de cualquier localidad en España.'
                  : `Este curso se imparte en modalidad ${curso.modalidad.toLowerCase()} con sede física en la localidad de ${curso.localidad}.`
                }
              </p>
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--lines)', height: '280px', width: '100%', boxShadow: 'var(--card-shadow)' }}>
                <iframe 
                  title="Mapa de ubicación"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight={0} 
                  marginWidth={0} 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(curso.modalidad === 'Online' ? 'España' : (curso.centro_nombre || 'Academia') + ', ' + cleanLocalidad(curso.localidad) + ', España')}&t=&z=${curso.modalidad === 'Online' ? 5 : 16}&ie=UTF8&iwloc=&output=embed`}
                  style={{ border: 0 }}
                ></iframe>
              </div>
            </div>
          </div>
        </div>

          <div>
            <div className="course-sidebar-card reveal stagger-1">
              <h3 className="course-sidebar-title">Pida su plaza gratis</h3>
              <p className="course-sidebar-subtitle">Complete el formulario y el centro de formación contactará con usted para confirmar la plaza.</p>

              {submitSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>¡Solicitud Recibida!</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>El centro de formación se pondrá en contacto con usted en un plazo máximo de 24 horas.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {submitError && (
                    <div className="alert-box alert-error" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                      {submitError}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Nombre completo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: María García López"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo electrónico</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="Ej: maria@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono de contacto</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="Ej: 600123456"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div className="plazas-container" style={{ margin: '1rem 0 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="plazas-text">Plazas cubiertas:</span>
                        <span className="plazas-text"><strong>{curso.plazas_cubiertas}</strong> de <strong>{curso.plazas}</strong></span>
                      </div>
                      <div className="plazas-bar-bg">
                        <div 
                          className={`plazas-bar-fill ${plazasPct === 100 ? 'full' : ''}`} 
                          style={{ width: `${plazasPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="form-checkbox-container" style={{ marginBottom: '1.5rem' }}>
                    <input 
                      type="checkbox" 
                      id="rgpd"
                      checked={rgpd}
                      onChange={(e) => setRgpd(e.target.checked)}
                    />
                    <label htmlFor="rgpd" className="form-checkbox-label">
                      Acepto que mis datos de contacto se entreguen al centro de formación organizador para la gestión y tramitación de mi matrícula gratuita.
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Pida su plaza gratis</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PORTAL COMERCIAL (Landing Centros) ---
function LandingCentros() {
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

  const handleDemoSubmit = (e: React.FormEvent) => {
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

    setSuccess(true);
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

      <div className="landing-hero hero-gradient reveal">
        <h1>Capte alumnos para sus cursos subvencionados de forma rápida y sin esfuerzo</h1>
        <p>Publicamos sus cursos en nuestra red, recopilamos solicitudes validadas de alumnos y se las entregamos directamente en su panel de control privado.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="#demo" className="btn btn-accent">Solicitar demo gratuita</a>
          <a href="#planes" className="btn btn-secondary">Ver planes de suscripción</a>
        </div>
      </div>

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
            <h3>2. Reciba leads cualificados</h3>
            <p>Los alumnos interesados completan la solicitud en nuestra ficha. Se validan el email y el teléfono.</p>
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
              <h3 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '1rem' }}>Mapa de Demanda Estudiantil</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
                Haga clic sobre los principales nodos de población para ver el número de candidatos activos que buscan formación oficial subvencionada en este momento.
              </p>

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
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Candidatos Activos</span>
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
              <div className="price-amount">79€ <span>/ mes</span></div>
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
              <div className="price-amount">149€ <span>/ mes</span></div>
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
              <p className="faq-answer">No. Su suscripción es mensual y puede cancelarla o modificar su plan en cualquier momento desde su panel privado sin penalización.</p>
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
              <p className="faq-answer">Los alumnos ven la ficha del curso en nuestra plataforma pública. Cuando solicitan la plaza, sus datos se graban encriptados y se le notifican en su panel de administración al instante.</p>
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
              <p className="faq-answer">Hemos comprobado que contactar a los alumnos interesados en menos de 24 horas duplica la probabilidad de que finalicen con éxito el proceso de matrícula oficial.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="demo" className="landing-section">
        <h2 className="landing-section-title">Solicite una Demo Personalizada</h2>
        <div className="demo-form-container">
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <CheckCircle size={48} style={{ color: 'var(--success-text)', marginBottom: '1rem' }} />
              <h3>¡Solicitud de Demo Recibida!</h3>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Le contactaremos por correo para programar una llamada de 15 minutos en el horario que mejor le venga.</p>
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
                  Acepto el aviso legal y la política de privacidad. Consiento el tratamiento de mis datos de contacto para la demostración comercial del servicio de Cursenda.
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Solicitar demo gratuita</button>
            </form>
          )}
        </div>
      </div>

      <footer className="landing-footer">
        <div className="footer-content">
          <div>
            <Logo />
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>SaaS de captación de alumnos para centros de formación en España.</p>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
            <strong>Contacto</strong>
            <p style={{ marginTop: '0.5rem' }}>soporte@cursenda.es</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Cursenda. Todos los derechos reservados.</span>
          <div className="footer-links">
            <a href="#" className="footer-link">Aviso Legal</a>
            <a href="#" className="footer-link">Privacidad</a>
            <a href="#" className="footer-link">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- PORTAL COMERCIAL: LOGIN ---
function LoginCentros({ onLogin }: { onLogin: (user: any) => void }) {
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

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#e6f3f0',
          border: '1px solid #cce7e1',
          borderRadius: '8px',
          fontSize: '0.75rem',
          textAlign: 'left'
        }}>
          <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>🔑 Credenciales de Prueba:</strong>
          <div style={{ marginBottom: '0.35rem' }}>
            <strong>Academia Demo:</strong> <code>demo@cursenda.es</code> / <code>demo123</code>
          </div>
          <div>
            <strong>Administrador:</strong> <code>admin@cursenda.es</code> / <code>admin123</code>
          </div>
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


  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setRecoverySent(true);
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
                <h4 style={{ color: 'var(--primary)' }}>Instrucciones enviadas</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Le hemos enviado un enlace de recuperación a su correo electrónico si este está registrado.</p>
                <Link to="/centros/login" className="btn btn-secondary btn-sm" style={{ marginTop: '1.5rem' }}>Volver al login</Link>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit}>
                <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>Introduzca su correo electrónico y le enviaremos instrucciones para restablecer su contraseña.</p>

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

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enviar instrucciones</button>
              </form>
            )}
          </div>
        )}
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
  const [tab, setTab] = useState<'inicio' | 'academias' | 'cursos' | 'solicitudes'>('inicio');
  const [academias, setAcademias] = useState<any[]>([]);
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
  const totalFacturadoEst = academias
    .filter(a => a.rol !== 'admin')
    .reduce((sum, a) => {
      if (a.plan === 'pro') return sum + 79;
      if (a.plan === 'custom') return sum + 299;
      return sum + 0;
    }, 0);

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Sidebar Admin */}
      <aside className="dashboard-sidebar" style={{ width: '260px', backgroundColor: 'var(--primary-dark)', color: 'var(--white)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div className="dashboard-sidebar-header" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
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
            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--white)' }}
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
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 700, color: 'var(--primary)' }}>Fecha Renovación</th>
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
                            {new Date(ac.fecha_renovacion).toLocaleDateString()}
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
          </div>
        )}
      </main>

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
                  <option value="starter">Starter (Gratis)</option>
                  <option value="pro">Pro (79€/mes)</option>
                  <option value="custom">Custom (299€/mes)</option>
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
  const [confCif, setConfCif] = useState('B87654321');
  const [confTelefono, setConfTelefono] = useState(user?.telefono || '');
  const [confDireccion, setConfDireccion] = useState('Calle Gran Vía 45, Planta 3, 28013 Madrid');
  const [confWeb, setConfWeb] = useState('https://www.tecnomadrid.es');
  const [confEmail, setConfEmail] = useState(user?.email || '');
  const [confSaveSuccess, setConfSaveSuccess] = useState(false);

  // Plantillas de Mensajes
  const initialTemplates = [
    { id: 1, titulo: 'Primer Contacto (WhatsApp)', canal: 'WhatsApp', contenido: 'Hola [Nombre], te escribimos de [Centro] referente a tu solicitud de plaza gratuita para el curso "[Curso]". ¿Te viene bien una llamada breve hoy para confirmar tus datos?' },
    { id: 2, titulo: 'Requisitos SEPE (Email)', canal: 'Email', contenido: 'Estimado/a [Nombre],\n\nPara tramitar su matrícula gratuita en el curso "[Curso]", necesitamos que nos facilite una copia de su DNI y su documento de demanda de empleo (DARDE) actualizado.\n\nAtentamente,\n[Centro]' },
    { id: 3, titulo: 'Convocatoria de Inicio (WhatsApp)', canal: 'WhatsApp', contenido: '¡Buenas noticias [Nombre]! Tu plaza para el curso "[Curso]" ha sido confirmada. Iniciamos el próximo [Fecha] a las 09:00. Por favor, confirma asistencia respondiendo a este mensaje.' }
  ];
  const [templates, setTemplates] = useState<any[]>(() => {
    const saved = localStorage.getItem('cursenda_templates');
    return saved ? JSON.parse(saved) : initialTemplates;
  });

  useEffect(() => {
    localStorage.setItem('cursenda_templates', JSON.stringify(templates));
  }, [templates]);

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

  // Gestión de Personal
  const initialTeam = [
    { id: 1, nombre: 'Brian Barnicoat', email: 'brian@gbarnicoat.uk', rol: 'Propietario / Superadmin', estado: 'Activo' },
    { id: 2, nombre: 'Carlos Soler', email: 'carlos@gbarnicoat.uk', rol: 'Gestor de Solicitudes', estado: 'Activo' },
    { id: 3, nombre: 'Ana Gómez', email: 'ana@gbarnicoat.uk', rol: 'Profesor Colaborador', estado: 'Invitación Pendiente' }
  ];
  const [team, setTeam] = useState(initialTeam);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState('Gestor de Solicitudes');
  const [inviteSuccess, setInviteSuccess] = useState(false);

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

  useEffect(() => {
    if (!user) {
      navigate('/centros/login');
      return;
    }
    loadCursos();
    loadSolicitudes();
    loadStats();
    loadFacturas();
    loadApiSettings();
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

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormTemplateError('');

    if (!formTemplateTitulo.trim() || !formTemplateContenido.trim()) {
      setFormTemplateError('El título y el contenido son campos requeridos.');
      return;
    }

    if (selectedTemplate) {
      setTemplates(templates.map(t => t.id === selectedTemplate.id ? { 
        ...t, 
        titulo: formTemplateTitulo, 
        canal: formTemplateCanal, 
        contenido: formTemplateContenido 
      } : t));
    } else {
      const nextId = templates.length > 0 ? Math.max(...templates.map(t => t.id)) + 1 : 1;
      setTemplates([...templates, { 
        id: nextId, 
        titulo: formTemplateTitulo, 
        canal: formTemplateCanal, 
        contenido: formTemplateContenido 
      }]);
    }
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta plantilla?')) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleRemoveTeamMember = (id: number) => {
    const member = team.find(t => t.id === id);
    if (!member) return;
    if (member.rol === 'Propietario / Superadmin') {
      alert('No se puede eliminar al propietario principal del centro.');
      return;
    }
    if (window.confirm(`¿Está seguro de que desea eliminar a ${member.nombre || member.email}?`)) {
      setTeam(team.filter(t => t.id !== id));
    }
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

  // Manejar Cambios de Plan
  const handlePlanChange = async (plan: string) => {
    try {
      const res = await fetch(`${API_BASE}/plan/cambio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      if (res.ok) {
        // Recargar info del centro simulada
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelPlanChange = async () => {
    try {
      const res = await fetch(`${API_BASE}/plan/cancelar-cambio`, { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        time: `hace ${Math.max(1, Math.round((Date.now() - new Date(s.fecha_creacion).getTime()) / 60000))} min`
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
            <li className={`nav-item ${tab === 'plan' ? 'active' : ''}`}>
              <button onClick={() => setTab('plan')}>
                <Calendar size={18} />
                <span>Plan y facturas</span>
              </button>
            </li>
            <li className={`nav-item ${tab === 'personal' ? 'active' : ''}`}>
              <button onClick={() => setTab('personal')}>
                <Shield size={18} />
                <span>Gestión Personal</span>
              </button>
            </li>
            <li className={`nav-item ${tab === 'integraciones' ? 'active' : ''}`}>
              <button onClick={() => setTab('integraciones')}>
                <Code size={18} />
                <span>Integraciones y API</span>
              </button>
            </li>
            <li className={`nav-item ${tab === 'configuracion' ? 'active' : ''}`}>
              <button onClick={() => setTab('configuracion')}>
                <Settings size={18} />
                <span>Configuración</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-bottom">
          <div className="center-profile-summary">
            <div className="center-profile-name">{user?.nombre || 'Mi Centro'}</div>
            <div className="center-profile-plan">Suscripción: {user?.plan || 'Starter'}</div>
          </div>
          <button onClick={handleLogoutClick} className="btn-logout">
            <X size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="dashboard-content">
        {/* TAB: MIS CURSOS */}
        {tab === 'cursos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>Mis cursos</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administre y publique los cursos ofrecidos por su centro</p>
              </div>
              <button onClick={() => handleOpenCursoModal()} className="btn btn-primary">
                <Plus size={18} />
                <span>Publicar curso</span>
              </button>
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
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

            {/* Alerta de cambio de plan pendiente */}
            {user?.plan_pendiente && (
              <div className="alert-box alert-warning">
                <Calendar size={20} />
                <div style={{ flexGrow: 1 }}>
                  <strong>Plan pendiente de cambio:</strong> Su cuenta se actualizará automáticamente al plan <strong>{user.plan_pendiente.toUpperCase()}</strong> en su próxima renovación programada ({new Date(user.fecha_renovacion).toLocaleDateString('es-ES')}).
                </div>
                <button onClick={handleCancelPlanChange} className="btn btn-secondary btn-sm" style={{ border: 'none', background: 'transparent', padding: '2px' }}>
                  Cancelar solicitud
                </button>
              </div>
            )}

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
              {/* Configuración Plan */}
              <div className="table-container" style={{ padding: '2rem' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Detalle de su suscripción</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--lines-light)' }}>
                  <span>Plan contratado:</span>
                  <strong style={{ textTransform: 'uppercase', color: 'var(--accent)' }}>{user?.plan || 'Starter'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--lines-light)' }}>
                  <span>Precio de suscripción:</span>
                  <strong>{user?.plan === 'custom' ? '299,00 €' : user?.plan === 'pro' ? '79,00 €' : '0,00 € (Starter)'} / mes</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginBottom: '2rem' }}>
                  <span>Próxima renovación:</span>
                  <strong>{new Date(user?.fecha_renovacion).toLocaleDateString('es-ES')}</strong>
                </div>

                <h4 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '1rem' }}>Suscripciones Disponibles</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ border: '1px solid var(--lines)', padding: '1rem', borderRadius: '8px', backgroundColor: user?.plan === 'starter' ? 'rgba(12,59,51,0.04)' : 'transparent' }}>
                    <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.875rem' }}>Plan Starter</h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Soporte básico, hasta 3 cursos activos.</p>
                    <div style={{ fontWeight: 'bold', fontSize: '0.875rem', margin: '0.5rem 0' }}>Gratis</div>
                    {user?.plan !== 'starter' && (
                      <button type="button" onClick={() => handlePlanChange('starter')} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Seleccionar Starter</button>
                    )}
                  </div>
                  <div style={{ border: '1px solid var(--accent)', padding: '1rem', borderRadius: '8px', backgroundColor: user?.plan === 'pro' ? 'rgba(201,150,46,0.04)' : 'transparent' }}>
                    <h5 style={{ margin: 0, color: 'var(--primary)', fontSize: '0.875rem' }}>Plan Pro</h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>Cursos ilimitados, API y Webhooks activos.</p>
                    <div style={{ fontWeight: 'bold', fontSize: '0.875rem', margin: '0.5rem 0' }}>79,00 € / mes</div>
                    {user?.plan !== 'pro' && (
                      <button type="button" onClick={() => handlePlanChange('pro')} className="btn btn-primary btn-sm" style={{ width: '100%' }}>Seleccionar Pro</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Historial de Facturas */}
              <div className="table-container" style={{ overflow: 'hidden' }}>
                <div className="table-header">
                  <h3 className="table-title">Facturas</h3>
                </div>
                {facturas.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay facturas registradas.</div>
                ) : (
                  <table>
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
                          <td>{f.numero}</td>
                          <td>{f.fecha}</td>
                          <td><strong>{f.importe.toFixed(2)} €</strong></td>
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
              <button onClick={() => handleOpenTemplateModal()} className="btn btn-primary">
                <Plus size={18} />
                <span>Nueva plantilla</span>
              </button>
            </div>
            
            <div className="alert-box alert-info">
              <MessageSquare size={20} />
              <span>Personalice las respuestas automáticas para contactar a los alumnos con un solo clic. Copie el contenido del portapapeles y péguelo en su cliente de WhatsApp o correo electrónico.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {templates.map((t) => (
                <div key={t.id} className="table-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '280px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>{t.titulo}</h3>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexShrink: 0 }}>
                        <span className="badge badge-published" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>{t.canal}</span>
                        <button 
                          onClick={() => handleOpenTemplateModal(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                          title="Editar plantilla"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-text)', padding: '2px', display: 'flex', alignItems: 'center' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
              {/* Tabla de Gestores */}
              <div className="table-container">
                <div className="table-header">
                  <h3 className="table-title">Gestores de {confRazonSocial || user?.nombre || 'Mi Centro'}</h3>
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
                      <tr key={t.id}>
                        <td style={{ fontWeight: '600' }}>{t.nombre}</td>
                        <td>{t.email}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: '500' }}>{t.rol}</td>
                        <td>
                          <span className={`badge ${t.estado === 'Activo' ? 'badge-published' : 'badge-paused'}`}>
                            {t.estado}
                          </span>
                        </td>
                        <td>
                          {t.rol !== 'Propietario / Superadmin' ? (
                            <button 
                              onClick={() => handleRemoveTeamMember(t.id)} 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--error-text)', padding: '2px 8px', fontSize: '0.75rem' }}
                            >
                              Eliminar
                            </button>
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
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Invitar nuevo gestor</h3>
                {inviteSuccess && (
                  <div className="alert-box alert-info" style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                    Invitación enviada por correo electrónico.
                  </div>
                )}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!inviteEmail) return;
                  setTeam([...team, { id: team.length + 1, nombre: 'Pendiente de aceptar', email: inviteEmail, rol: inviteRol, estado: 'Invitación Pendiente' }]);
                  setInviteEmail('');
                  setInviteSuccess(true);
                  setTimeout(() => setInviteSuccess(false), 3000);
                }}>
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
                      <option value="Gestor de Solicitudes">Gestor de Solicitudes</option>
                      <option value="Administrador de Cursos">Administrador de Cursos</option>
                      <option value="Profesor Colaborador">Profesor Colaborador</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enviar invitación</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INTEGRACIONES */}
        {tab === 'integraciones' && (
          <div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--primary)', marginBottom: '2rem' }}>Integraciones y API</h1>
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

              <form onSubmit={(e) => {
                e.preventDefault();
                setConfSaveSuccess(true);
                setTimeout(() => setConfSaveSuccess(false), 3000);
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
                      onChange={(e) => setConfEmail(e.target.value)}
                      required
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
                  <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Teléfono: <strong>{selectedLead.telefono}</strong></div>
                  <div style={{ fontSize: '0.875rem' }}>Email: <strong>{selectedLead.email}</strong></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Curso solicitado</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedLead.curso_titulo}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Recibida el: {new Date(selectedLead.fecha_creacion).toLocaleString('es-ES')}</div>
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
                          <span>Anotado el: {new Date(note.fecha_creacion).toLocaleString('es-ES')}</span>
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
    return <div style={{ textAlign: 'center', padding: '10rem' }}>Cargando aplicación Cursenda...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Alumnos */}
        <Route path="/" element={<AlumnosHome />} />
        <Route path="/curso/:id" element={<AlumnosDetalle />} />

        {/* Centros */}
        <Route path="/centros" element={<LandingCentros />} />
        <Route path="/centros/login" element={<LoginCentros onLogin={handleLogin} />} />
        <Route path="/centros/recuperar" element={<RecuperarCentros />} />
        <Route 
          path="/centros/dashboard" 
          element={<DashboardCentros user={currentUser} onLogout={handleLogout} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
