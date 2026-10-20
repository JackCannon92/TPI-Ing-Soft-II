/* LubriGest demo — armazón: sesión, ingreso, menú por rol, campanita, panel de demostración y sincronización. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, D = LG.D, UI = LG.UI, F = LG.F, V = LG.V, P = LG.P, Store = LG.Store, h = U.h;
  var SESSION = 'lubrigest.sesion';
  var memSession = null;

  /* ---------- Sesión (una por pestaña, así se pueden probar varios roles a la vez) ---------- */
  function getSession() { try { var v = root.sessionStorage.getItem(SESSION); return v ? Number(v) : memSession; } catch (e) { return memSession; } }
  function setSession(id) {
    memSession = id;
    try { if (id) root.sessionStorage.setItem(SESSION, String(id)); else root.sessionStorage.removeItem(SESSION); } catch (e) {}
  }
  LG.me = function () {
    var id = getSession(), u = id && Store.db ? D.usuario(Store.db, id) : null;
    return u && u.estado === 'Activo' ? u : null;
  };
  LG.mutate = function (fn) {
    var id = getSession();
    return Store.mutate(function (draft) {
      var actor = id ? D.usuario(draft, id) : null;
      if (!actor || actor.estado !== 'Activo') { var e = new Error('Tu sesión ya no es válida. Volvé a ingresar.'); e.name = 'Permiso'; throw e; }
      return fn(draft, actor);
    });
  };
  LG.run = function (fn, okMsg) {
    return LG.mutate(fn).then(function (r) { if (okMsg) UI.toast(okMsg); return r; }, function (e) { UI.toast(e.message || 'No se pudo completar la operación.', 'err'); });
  };
  LG.go = function (ruta) { var nuevo = '#/' + ruta; if (root.location.hash === nuevo) renderView(); else root.location.hash = nuevo; };
  var pend = false;
  LG.render = function () { if (pend) return; pend = true; (root.requestAnimationFrame || setTimeout)(function () { pend = false; renderView(); }); };

  /* ---------- Menú y rutas por rol ---------- */
  var NAV = {
    GA: [['inicio', 'Inicio', 'home'], ['turnos', 'Turnos', 'calendar'], ['clientes', 'Clientes', 'users'], ['vehiculos', 'Vehículos', 'car'], ['servicios', 'Servicios', 'wrench'], ['stock', 'Stock', 'box']],
    MEC: [['inicio', 'Turnos de hoy', 'calendar'], ['servicios', 'Servicios', 'wrench'], ['stock', 'Stock', 'box']],
    CEO: [['inicio', 'Panel', 'chart'], ['turnos', 'Turnos', 'calendar'], ['clientes', 'Clientes', 'users'], ['vehiculos', 'Vehículos', 'car'], ['servicios', 'Servicios', 'wrench'], ['stock', 'Stock', 'box'], ['usuarios', 'Usuarios', 'key']],
    CLI: [['inicio', 'Inicio', 'home'], ['turnos', 'Mis turnos', 'calendar'], ['servicios', 'Mi historial', 'wrench']]
  };
  var PAGES = { turnos: P.turnos, clientes: P.clientes, vehiculos: P.vehiculos, servicios: P.servicios, stock: P.stock, usuarios: P.usuarios };
  function parseHash() { var p = root.location.hash.replace(/^#\/?/, '').split('/'); return { name: p[0] || 'inicio', param: p[1] || null }; }
  function nav(me) { return NAV[D.ROL_KEY[me.rol]]; }
  function allowed(me, name) { return nav(me).some(function (n) { return n[0] === name; }); }

  /* ---------- Dibujo de la pantalla actual ---------- */
  var shell = null, lastKey = null;
  function renderView() {
    var me = LG.me();
    if (!me) { shell = null; return renderLogin(); }
    var r = parseHash();
    if (!allowed(me, r.name)) { root.location.replace('#/inicio'); r = { name: 'inicio', param: null }; }
    if (!shell || shell.userId !== me.id) buildShell(me);
    var d = Store.db, fn, key = r.name + '/' + (r.param || '');
    if (r.name === 'inicio') fn = V.inicio;
    else if (r.param && r.name === 'clientes' && D.can(me, 'clientes', 'r')) fn = P.clienteFicha;
    else if (r.param && r.name === 'vehiculos' && D.can(me, 'vehiculos', 'r')) fn = P.vehiculoFicha;
    else fn = PAGES[r.name];
    var activeEl = document.activeElement, keep = activeEl && activeEl.getAttribute ? activeEl.getAttribute('data-keep') : null;
    var selS = keep && activeEl.selectionStart != null ? activeEl.selectionStart : null;
    var y = key === lastKey ? root.scrollY : 0; lastKey = key;
    var node;
    try { node = fn({ db: d, me: me, param: r.param, hoy: D.hoy(d) }); }
    catch (e) { console.error(e); node = h('div', { class: 'page' }, UI.empty({ title: 'No se pudo mostrar esta pantalla', text: String(e && e.message || e) })); }
    shell.view.innerHTML = '';
    shell.view.appendChild(node);
    shell.links.forEach(function (a) { var on = a.dataset.ruta === r.name; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var item = nav(me).filter(function (n) { return n[0] === r.name; })[0];
    document.title = 'LubriGest — ' + (item ? item[1] : 'Inicio');
    updateTop(me);
    root.scrollTo(0, y);
    if (keep) { var el = shell.view.querySelector('[data-keep="' + keep + '"]'); if (el) { el.focus(); if (selS != null && el.setSelectionRange) try { el.setSelectionRange(selS, selS); } catch (e2) {} } }
  }

  function buildShell(me) {
    var app = document.getElementById('app');
    app.innerHTML = '';
    var links = nav(me).map(function (n) {
      return h('a', { class: 'nav-link', href: '#/' + n[0], 'data-ruta': n[0] }, UI.icon(n[2], 19), h('span', null, n[1]));
    });
    var side = h('aside', { class: 'side' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, UI.icon('wrench', 20)), h('div', null, h('b', null, 'LubriGest'), h('small', null, 'Lubricentro · Concordia'))),
      h('nav', { class: 'nav', 'aria-label': 'Principal' }, links),
      h('div', { class: 'side-foot' },
        h('div', { class: 'who' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, F.nombreUsuario(Store.db, me).split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('')), h('div', null, h('b', null, F.nombreUsuario(Store.db, me)), h('small', null, me.rol))),
        h('button', { class: 'logout', type: 'button', onclick: salir }, UI.icon('logout', 17), 'Cerrar sesión')));
    var dateEl = h('div', { class: 'top-date' });
    var syncEl = h('div', { class: 'sync', title: '' });
    var bellBtn = h('button', { class: 'icon-btn bell', type: 'button', 'aria-label': 'Novedades', 'aria-haspopup': 'true', onclick: function (e) { e.stopPropagation(); toggleBell(); } }, UI.icon('bell', 20), h('span', { class: 'bell-count', hidden: true }));
    var demoBtn = h('button', { class: 'btn sm demo-btn', type: 'button', onclick: openDemo }, UI.icon('cog', 16), 'Demo');
    var top = h('header', { class: 'topbar' }, dateEl, h('div', { class: 'top-right' }, syncEl, bellBtn, demoBtn));
    var view = h('main', { class: 'view', id: 'view', tabindex: '-1' });
    app.appendChild(h('div', { class: 'shell' }, side, h('div', { class: 'main-col' }, top, view)));
    shell = { userId: me.id, view: view, links: links, dateEl: dateEl, syncEl: syncEl, bell: bellBtn, bellCount: bellBtn.querySelector('.bell-count'), panel: null };
  }

  function updateTop(me) {
    var d = Store.db, hoy = D.hoy(d), off = d.config.offset || 0;
    shell.dateEl.innerHTML = '';
    shell.dateEl.appendChild(h('span', null, U.fmtLarga(hoy)));
    if (off) shell.dateEl.appendChild(h('span', { class: 'chip warn', title: 'Estás viendo una fecha distinta a la real. Se vuelve a hoy desde el panel Demo.' }, 'Fecha simulada ' + (off > 0 ? '+' : '') + off + ' d'));
    shell.syncEl.className = 'sync ' + (Store.online ? 'on' : 'off');
    shell.syncEl.textContent = '';
    shell.syncEl.appendChild(h('i'));
    shell.syncEl.appendChild(document.createTextNode(Store.online ? (Store.mode === 'server' ? 'Servidor local' : 'Este navegador') : 'Sin conexión'));
    shell.syncEl.title = Store.mode === 'server' ? 'Los datos se guardan en data/db.json' : 'Los datos se guardan en este navegador (localStorage)';
    var n = unreadCount(me);
    shell.bellCount.hidden = !n; shell.bellCount.textContent = n > 9 ? '9+' : String(n);
    shell.bell.setAttribute('aria-label', n ? 'Novedades: ' + n + ' sin leer' : 'Novedades');
    if (shell.panel) paintBell(me);
  }

  function salir() { setSession(null); root.location.hash = ''; shell = null; closeBell(); renderView(); }
  function entrarComo(u) {
    setSession(u.id); closeBell(); shell = null; lastKey = null;
    root.location.hash = '#/inicio';
    renderView();
  }

  /* ---------- Novedades (campanita) ---------- */
  function eventosPara(me) { return Store.db.eventos.filter(function (e) { return D.visible(e, me); }); }
  function seenKey(me) { return 'lg.visto.' + Store.db.config.seedId + '.' + me.id; }
  function getSeen(me) {
    try {
      var v = root.localStorage.getItem(seenKey(me));
      if (v == null) { var max = eventosPara(me).reduce(function (a, e) { return Math.max(a, e.id); }, 0); root.localStorage.setItem(seenKey(me), String(max)); return max; }
      return Number(v);
    } catch (e) { return 0; }
  }
  function setSeen(me, n) { try { root.localStorage.setItem(seenKey(me), String(n)); } catch (e) {} }
  function unreadCount(me) { var s = getSeen(me); return eventosPara(me).filter(function (e) { return e.id > s; }).length; }
  var ICO = { turno: 'calendar', servicio: 'wrench', stock: 'box', cobro: 'dollar', alerta: 'bell' };
  function irEvento(me, e) {
    var ruta = e.ruta === 'portal' || e.ruta === 'inicio' || !e.ruta ? 'inicio' : e.ruta;
    if (!allowed(me, ruta)) ruta = 'inicio';
    closeBell(); LG.go(ruta);
  }
  function paintBell(me) {
    if (!shell.panel) return;
    var evs = eventosPara(me).slice(0, 20), seen = shell.panel.seen;
    shell.panel.list.innerHTML = '';
    if (!evs.length) shell.panel.list.appendChild(h('li', { class: 'bp-empty' }, 'Sin novedades por ahora.'));
    evs.forEach(function (e) {
      shell.panel.list.appendChild(h('li', null, h('button', { type: 'button', class: 'bp-item' + (e.id > seen ? ' new' : ''), onclick: function () { irEvento(me, e); } },
        h('span', { class: 'feed-ico ' + e.tipo }, UI.icon(ICO[e.tipo] || 'bell', 15)), h('span', { class: 'bp-text' }, e.texto, h('small', null, U.hace(e.ts))))));
    });
  }
  function toggleBell() { if (shell.panel) closeBell(); else openBell(); }
  function openBell() {
    var me = LG.me(); if (!me || !shell) return;
    var list = h('ul', { class: 'bp-list' });
    var panel = h('div', { class: 'bell-panel', role: 'dialog', 'aria-label': 'Novedades' }, h('div', { class: 'bp-head' }, h('b', null, 'Novedades'), h('small', null, 'Se actualizan solas')), list);
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    shell.bell.parentNode.appendChild(panel);
    shell.panel = { el: panel, list: list, seen: getSeen(me) };
    paintBell(me);
    var max = eventosPara(me).reduce(function (a, e) { return Math.max(a, e.id); }, 0);
    setSeen(me, max); updateBadge(me);
    setTimeout(function () { document.addEventListener('click', closeBell, { once: true }); }, 0);
  }
  function updateBadge(me) { var n = unreadCount(me); shell.bellCount.hidden = !n; shell.bellCount.textContent = n > 9 ? '9+' : String(n); }
  function closeBell() { if (shell && shell.panel) { if (shell.panel.el.parentNode) shell.panel.el.parentNode.removeChild(shell.panel.el); shell.panel = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBell(); });

  /* ---------- Cambios de datos (propios o de otra ventana) ---------- */
  function onStoreChange(kind, prev) {
    if (kind === 'status') { if (shell && LG.me()) updateTop(LG.me()); return; }
    var cur = Store.db;
    if (prev) {
      var sig = {}; prev.turnos.forEach(function (t) { sig[t.id] = t.estado + t.fecha + t.hora; });
      cur.turnos.forEach(function (t) { if (sig[t.id] !== t.estado + t.fecha + t.hora) LG.flash[t.id] = Date.now() + 4500; });
    }
    var me = LG.me();
    if (!shell && !getSession()) return;            // pantalla de ingreso: no se redibuja para no borrar lo que se está escribiendo
    if (getSession() && !me && shell) {
      UI.toast('Tu usuario ya no está activo. Volvé a ingresar.', 'err');
      setSession(null); shell = null;
    }
    if (kind === 'remote' && me && prev) {
      var maxPrev = prev.eventos.reduce(function (a, e) { return Math.max(a, e.id); }, 0);
      var nuevos = cur.eventos.filter(function (e) { return e.id > maxPrev && D.visible(e, me); }).reverse();
      nuevos.slice(-3).forEach(function (e) { UI.toast(e.texto, 'info', { label: 'Ver', onClick: function () { irEvento(me, e); } }); });
    }
    LG.render();
  }

  /* ---------- Ingreso ---------- */
  var CUENTAS = [['ceo', 'CEO', 'Panel del negocio y usuarios'], ['gerente', 'Gerente Administrativa', 'Agenda, clientes, cobros y stock'], ['mecanico1', 'Mecánico', 'Turnos de hoy y registro de servicios'], ['jperez', 'Cliente', 'Portal con alertas y turnos']];
  function renderLogin() {
    var app = document.getElementById('app');
    app.innerHTML = '';
    document.title = 'LubriGest — Ingresar';
    var api = UI.form({ fields: [
      { name: 'usuario', label: 'Usuario', required: true, maxlength: 30 },
      { name: 'clave', label: 'Contraseña', type: 'password', required: true, maxlength: 40 }] });
    var btn = h('button', { class: 'btn primary block', type: 'submit' }, 'Ingresar');
    api.el.appendChild(btn);
    api.el.addEventListener('submit', function (ev) {
      ev.preventDefault(); api.clearErrors();
      var v = api.values();
      try { var u = D.login(Store.db, v.usuario, v.clave); entrarComo(u); }
      catch (err) { if (err.name === 'Validacion') api.setErrors(err.errores, err.message); else api.setErrors({}, err.message); }
    });
    var cuentas = h('div', { class: 'quick' }, CUENTAS.map(function (c) {
      var u = Store.db.usuarios.find(function (x) { return x.usuario === c[0]; });
      return h('button', { type: 'button', class: 'quick-btn', onclick: function () { if (u && u.estado === 'Activo') entrarComo(u); else UI.toast('Ese usuario no está activo.', 'err'); } },
        h('b', null, c[1]), h('small', null, c[2]));
    }));
    app.appendChild(h('div', { class: 'login' },
      h('section', { class: 'login-brand' },
        h('div', { class: 'brand lg' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, UI.icon('wrench', 26)), h('div', null, h('b', null, 'LubriGest'), h('small', null, 'Lubricentro · Concordia'))),
        h('h1', null, 'Turnos, servicios y stock del Lubricentro en un solo lugar.'),
        h('p', null, 'Los clientes reservan, la gerencia confirma, los mecánicos registran y todos ven los cambios al instante.'),
        h('footer', null, 'Ingeniería de Software II · UNER · Grupo 11')),
      h('section', { class: 'login-panel' },
        h('div', { class: 'login-card' },
          h('h2', null, 'Ingresar al sistema'),
          api.el,
          h('div', { class: 'login-div' }, h('span', null, 'o entrá directo como')),
          cuentas,
          h('p', { class: 'login-hint' }, 'Contraseña de las cuentas de ejemplo: ', h('code', null, LG.DEMO_PASS), '. Para ver un acceso denegado probá con ', h('code', null, 'rfernandez'), '.'),
          h('button', { class: 'link-btn', type: 'button', onclick: resetear }, 'Restablecer los datos de ejemplo')))));
    var first = app.querySelector('input'); if (first) first.focus();
  }

  /* ---------- Panel de demostración ---------- */
  function resetear() {
    UI.confirm({ title: 'Restablecer datos de ejemplo', danger: true, okLabel: 'Restablecer', text: 'Se borra todo lo cargado y se vuelve a los datos iniciales. Las otras ventanas abiertas también se actualizan.' })
      .then(function (si) { if (!si) return; return Store.reset(LG.makeSeed).then(function () { UI.toast('Datos de ejemplo restablecidos'); setSession(null); shell = null; LG.render(); }, function (e) { UI.toast(e.message, 'err'); }); });
  }
  function mover(n) { return Store.mutate(function (d) { D.moverFecha(d, n); }).then(function () { UI.toast('Fecha del sistema: ' + U.fmtLarga(D.hoy(Store.db))); }, function (e) { UI.toast(e.message, 'err'); }); }
  function volverHoy() { return Store.mutate(function (d) { D.fechaReal(d); }).then(function () { UI.toast('Fecha del sistema: hoy'); }); }
  function descargar() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' }), a = h('a', { href: URL.createObjectURL(blob), download: 'lubrigest-datos-' + U.realToday() + '.json' });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function importar() {
    var inp = h('input', { type: 'file', accept: '.json,application/json', onchange: function () {
      var f = inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { Store.importJSON(String(fr.result)).then(function () { UI.toast('Datos importados'); setSession(null); shell = null; LG.render(); }, function (e) { UI.toast(e.message, 'err'); }); };
      fr.readAsText(f);
    } });
    inp.click();
  }
  function openDemo() {
    var me = LG.me(), d = Store.db, off = d.config.offset || 0, m;
    var users = d.usuarios.filter(function (u) { return u.estado === 'Activo' && u.clienteId !== 10; });
    var body = [
      h('section', { class: 'demo-sec' }, h('h3', null, 'Fecha del sistema'),
        h('p', null, 'Hoy: ', h('b', null, U.fmtLarga(D.hoy(d))), off ? '  (simulada ' + (off > 0 ? '+' : '') + off + ' d)' : '  (fecha real)'),
        h('div', { class: 'btn-row' }, V.btn('−1 día', null, 'sm', function () { mover(-1).then(m.close); }), V.btn('+1 día', null, 'sm', function () { mover(1).then(m.close); }), V.btn('+7 días', null, 'sm', function () { mover(7).then(m.close); }), V.btn('Volver a hoy', 'refresh', 'sm ghost', function () { volverHoy().then(m.close); })),
        h('p', { class: 'hint' }, 'Al adelantar la fecha aparecen las alertas de próximos servicios y se envían los recordatorios a los clientes.')),
      h('section', { class: 'demo-sec' }, h('h3', null, 'Entrar como'),
        h('div', { class: 'btn-row wrap' }, users.map(function (u) { return h('button', { class: 'btn sm' + (me && me.id === u.id ? ' primary' : ''), type: 'button', onclick: function () { m.close(); entrarComo(u); } }, F.nombreUsuario(d, u), h('small', null, ' · ' + (u.rol === D.ROLES.GA ? 'Gerente' : u.rol === D.ROLES.MEC ? 'Mecánico' : u.rol))); }))),
      h('section', { class: 'demo-sec' }, h('h3', null, 'Dos ventanas a la vez'),
        h('p', null, 'Cada ventana tiene su propia sesión. Entrá como Cliente en una y como Gerente en la otra: lo que reserve el cliente aparece al instante en la agenda.'),
        h('div', { class: 'btn-row' }, V.btn('Abrir otra ventana', 'window', '', function () { root.open(root.location.href.split('#')[0], '_blank'); }))),
      h('section', { class: 'demo-sec' }, h('h3', null, 'Datos'),
        h('p', null, 'Guardado en: ', h('b', null, Store.mode === 'server' ? 'el servidor local (carpeta data)' : 'este navegador (localStorage)'), '.'),
        h('div', { class: 'btn-row wrap' }, V.btn('Exportar JSON', 'download', 'sm', descargar), V.btn('Importar JSON', 'upload', 'sm', importar), V.btn('Restablecer datos de ejemplo', 'refresh', 'sm danger-ghost', function () { m.close(); resetear(); })))
    ];
    m = UI.modal({ title: 'Panel de demostración', cls: 'drawer', body: body });
  }

  /* ---------- Arranque ---------- */
  LG.boot = function () {
    var app = document.getElementById('app');
    Store.init(LG.makeSeed).then(function () {
      Store.subscribe(onStoreChange);
      Store.startSync();
      root.addEventListener('hashchange', function () { renderView(); });
      renderView();
    }, function (e) {
      app.innerHTML = '';
      app.appendChild(h('div', { class: 'fatal' }, h('h1', null, 'No se pudo iniciar LubriGest'), h('p', null, String(e && e.message || e))));
    });
  };
  LG.boot();
})(typeof window !== 'undefined' ? window : globalThis);
