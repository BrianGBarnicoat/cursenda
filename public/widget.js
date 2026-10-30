/*
 * Widget de Cursenda: muestra los cursos de un centro en su propia web.
 * Uso:
 *   <div id="cursenda-cursos"></div>
 *   <script src="https://cursenda.es/widget.js" data-centro="ID_DEL_CENTRO" async></script>
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var centro = script.getAttribute('data-centro');
  var origen = new URL(script.src).origin;
  var destino = document.getElementById(script.getAttribute('data-contenedor') || 'cursenda-cursos');
  if (!destino) {
    destino = document.createElement('div');
    script.parentNode.insertBefore(destino, script);
  }

  // Shadow DOM para que los estilos de la web del centro no rompan el widget (ni al revés)
  var raiz = destino.attachShadow ? destino.attachShadow({ mode: 'open' }) : destino;

  var estilos =
    ':host{all:initial;display:block}' +
    '.cw{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1E2A27;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}' +
    '.c{border:1px solid #E3E1DA;border-radius:10px;padding:16px;background:#fff;display:flex;flex-direction:column;gap:8px}' +
    '.t{font-size:15px;font-weight:700;color:#0C3B33;line-height:1.3;margin:0}' +
    '.m{font-size:13px;color:#60706B;margin:0}' +
    '.g{display:inline-block;font-size:12px;font-weight:700;color:#0D5A3A;background:#E6F3EC;border-radius:4px;padding:2px 8px;align-self:flex-start}' +
    '.b{margin-top:auto;display:inline-block;text-align:center;background:#0C3B33;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:9px 14px;border-radius:6px}' +
    '.b:hover{background:#082A24}.b:focus-visible{outline:2px solid #C9962E;outline-offset:2px}' +
    '.p{font-size:12px;color:#60706B;grid-column:1/-1;margin:4px 0 0}.p a{color:#0C3B33}' +
    '.v{font-size:14px;color:#60706B}';

  function texto(valor) {
    var span = document.createElement('span');
    span.textContent = valor == null ? '' : String(valor);
    return span.innerHTML;
  }

  function pintar(html) {
    raiz.innerHTML = '<style>' + estilos + '</style><div class="cw">' + html + '</div>';
  }

  if (!centro) {
    pintar('<p class="v">Falta el atributo data-centro en el código del widget.</p>');
    return;
  }

  fetch(origen + '/api/public/centros/' + encodeURIComponent(centro) + '/cursos')
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (datos) {
      if (!datos.cursos.length) {
        pintar('<p class="v">Ahora mismo no hay cursos con plazas abiertas.</p>');
        return;
      }
      var html = datos.cursos.map(function (c) {
        var libres = Math.max(0, c.plazas - c.plazas_cubiertas);
        return '<article class="c">' +
          '<span class="g">Gratis · 100% subvencionado</span>' +
          '<h3 class="t">' + texto(c.titulo) + '</h3>' +
          '<p class="m">' + texto(c.modalidad) + ' · ' + texto(c.localidad) + ' · ' + texto(c.duracion_horas) + ' h</p>' +
          '<p class="m">Empieza: ' + texto(c.fecha_inicio) + (libres ? ' · Quedan ' + libres + ' plazas' : '') + '</p>' +
          '<a class="b" href="' + origen + '/curso/' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">Pedir plaza</a>' +
          '</article>';
      }).join('');
      pintar(html + '<p class="p">Cursos publicados en <a href="' + origen + '" target="_blank" rel="noopener">Cursenda</a></p>');
    })
    .catch(function () {
      pintar('<p class="v">No se han podido cargar los cursos.</p>');
    });
})();
