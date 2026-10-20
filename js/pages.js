/* LubriGest demo — listados por gestión y fichas de cliente / vehículo. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, D = LG.D, UI = LG.UI, F = LG.F, V = LG.V, h = U.h;
  var P = (LG.P = {});
  var activo = function (x) { return x.estado === 'Activo'; };
  var vivo = function (t) { return t.estado === 'Reservado' || t.estado === 'Confirmado'; };
  var db = function () { return LG.Store.db; };

  /* Página de listado con búsqueda y filtros (el estado del filtro se conserva al volver a dibujar). */
  function dataPage(key, o) {
    var vs = LG.vs[key] = LG.vs[key] || { q: '', f: {} };
    vs.f = vs.f || {};
    o.filters.forEach(function (f) { if (vs.f[f.key] == null) vs.f[f.key] = f.def; });
    var segs = h('div', { class: 'filters' }), holder = h('div', { class: 'data-holder' }), count = h('span', { class: 'count', 'aria-live': 'polite' });
    var search = h('input', { type: 'search', class: 'search', placeholder: o.searchPlaceholder || 'Buscar…', 'aria-label': 'Buscar', 'data-keep': 'search-' + key, oninput: function (e) { vs.q = e.target.value; draw(); } });
    search.value = vs.q || '';
    function draw() {
      var d = db(), hoy = D.hoy(d), q = U.norm(vs.q || '').trim();
      var rows = o.rows(d, hoy).filter(function (r) {
        return o.filters.every(function (f) { return vs.f[f.key] === 'todos' || f.test(r, vs.f[f.key], d, hoy); }) && (!q || U.norm(o.search(r, d)).indexOf(q) >= 0);
      });
      if (o.sort) rows.sort(function (a, b) { return o.sort(a, b, vs.f); });
      segs.innerHTML = '';
      o.filters.forEach(function (f) { segs.appendChild(UI.seg(f.options, vs.f[f.key], function (v) { vs.f[f.key] = v; draw(); }, f.label)); });
      count.textContent = rows.length + (rows.length === 1 ? ' resultado' : ' resultados');
      holder.innerHTML = '';
      holder.appendChild(UI.table({ cols: o.cols(d, hoy), rows: rows, onRow: o.onRow, rowClass: o.rowClass, empty: q || o.filters.some(function (f) { return vs.f[f.key] !== 'todos'; }) ? { title: 'No hay resultados con ese filtro', text: 'Probá con otra búsqueda o mostrá todos.' } : o.empty }));
    }
    draw();
    return h('div', { class: 'page' }, V.pageHead(o.title, o.sub ? o.sub(db()) : null, o.primary || null),
      h('div', { class: 'toolbar' }, h('div', { class: 'search-wrap' }, UI.icon('search', 16), search), segs, count),
      UI.card(null, holder, { flush: true }));
  }
  var segEstado = function (extra) {
    return [['todos', 'Todos'], ['Activo', 'Activos'], ['Suspendido', 'Suspendidos']].concat(extra || []);
  };

  /* ---------- Clientes ---------- */
  P.clientes = function (ctx) {
    var me = ctx.me, ro = !D.can(me, 'clientes', 'u');
    return dataPage('clientes', {
      title: 'Clientes', sub: function (d) { return d.clientes.filter(activo).length + ' activos de ' + d.clientes.length + ' registrados'; },
      primary: D.can(me, 'clientes', 'c') ? V.btn('Registrar cliente', 'plus', 'primary', function () { F.cliente(); }) : null,
      searchPlaceholder: 'Buscar por nombre, teléfono o email…',
      filters: [{ key: 'estado', label: 'Estado', options: segEstado(), def: 'todos', test: function (r, v) { return r.estado === v; } }],
      rows: function (d) { return d.clientes.slice(); },
      sort: function (a, b) { return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre, 'es'); },
      search: function (c) { return [c.nombre, c.apellido, c.apellido, c.telefono, c.email, c.direccion].join(' '); },
      onRow: function (c) { LG.go('clientes/' + c.id); },
      rowClass: function (c) { return c.estado !== 'Activo' ? 'muted-row' : ''; },
      empty: { title: 'Todavía no hay clientes', text: 'Registrá el primero para poder cargar sus vehículos y turnos.' },
      cols: function (d) {
        return [
          { label: 'Cliente', render: function (c) { return h('div', { class: 'cell-main' }, h('b', null, D.nombreCliente(c)), h('small', null, c.direccion)); } },
          { label: 'Teléfono', render: function (c) { return c.telefono; } },
          { label: 'Email', render: function (c) { return c.email; } },
          { label: 'Vehículos', cls: 'num', render: function (c) { return String(d.vehiculos.filter(function (v) { return v.clienteId === c.id && activo(v); }).length); } },
          { label: 'Estado', render: function (c) { return UI.badge(c.estado); } },
          { label: '', cls: 'acts', render: function (c) {
            return UI.actions([{ label: 'Ver', icon: 'eye', onClick: function () { LG.go('clientes/' + c.id); } },
              { label: 'Modificar', icon: 'edit', iconOnly: true, show: !ro && activo(c), onClick: function () { F.cliente(c); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: D.can(me, 'clientes', 'd') && activo(c), onClick: function () { F.suspenderCliente(c); } }]);
          } }];
      }
    });
  };

  /* ---------- Vehículos ---------- */
  function ultimoServicio(d, vid) {
    return d.servicios.filter(function (s) { return s.vehiculoId === vid && s.estado !== 'Suspendido'; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0] || null;
  }
  P.vehiculos = function (ctx) {
    var me = ctx.me;
    return dataPage('vehiculos', {
      title: 'Vehículos', sub: function (d) { return d.vehiculos.filter(activo).length + ' activos de ' + d.vehiculos.length + ' registrados'; },
      primary: D.can(me, 'vehiculos', 'c') ? V.btn('Registrar vehículo', 'plus', 'primary', function () { F.vehiculo(); }) : null,
      searchPlaceholder: 'Buscar por patente, marca, modelo o propietario…',
      filters: [{ key: 'estado', label: 'Estado', options: segEstado(), def: 'todos', test: function (r, v) { return r.estado === v; } }],
      rows: function (d) { return d.vehiculos.slice(); },
      sort: function (a, b) { return a.patente.localeCompare(b.patente); },
      search: function (v, d) { return [v.patente, v.marca, v.modelo, v.anio, D.nombreCliente(D.cliente(d, v.clienteId))].join(' '); },
      onRow: function (v) { LG.go('vehiculos/' + v.id); },
      rowClass: function (v) { return v.estado !== 'Activo' ? 'muted-row' : ''; },
      empty: { title: 'Todavía no hay vehículos', text: 'Registrá un vehículo asociado a un cliente.' },
      cols: function (d) {
        return [
          { label: 'Patente', render: function (v) { return h('span', { class: 'plate' }, v.patente); } },
          { label: 'Vehículo', render: function (v) { return v.marca + ' ' + v.modelo + ' (' + v.anio + ')'; } },
          { label: 'Propietario', render: function (v) { var c = D.cliente(d, v.clienteId); return c ? h('a', { href: '#/clientes/' + c.id, onclick: function (e) { e.stopPropagation(); } }, D.nombreCliente(c)) : '—'; } },
          { label: 'Último servicio', render: function (v) { var s = ultimoServicio(d, v.id); return s ? D.nombreTipo(s.tipo) + ' · ' + U.fmt(s.fecha) : h('span', { class: 'muted' }, 'Sin servicios'); } },
          { label: 'Estado', render: function (v) { return UI.badge(v.estado); } },
          { label: '', cls: 'acts', render: function (v) {
            return UI.actions([{ label: 'Historial', icon: 'eye', onClick: function () { LG.go('vehiculos/' + v.id); } },
              { label: 'Modificar', icon: 'edit', iconOnly: true, show: D.can(me, 'vehiculos', 'u') && activo(v), onClick: function () { F.vehiculo(v); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: D.can(me, 'vehiculos', 'd') && activo(v), onClick: function () { F.suspenderVehiculo(v); } }]);
          } }];
      }
    });
  };

  /* ---------- Turnos ---------- */
  P.turnos = function (ctx) {
    var me = ctx.me, esCli = me.rol === D.ROLES.CLI;
    return dataPage('turnos', {
      title: esCli ? 'Mis turnos' : 'Turnos', sub: function (d) {
        var hoy = D.hoy(d), n = d.turnos.filter(function (t) { return vivo(t) && t.fecha >= hoy && (!esCli || t.clienteId === me.clienteId); }).length;
        return n + (n === 1 ? ' turno por venir' : ' turnos por venir');
      },
      primary: D.can(me, 'turnos', 'c') ? V.btn('Reservar turno', 'plus', 'primary', function () { F.turno(); }) : null,
      searchPlaceholder: esCli ? 'Buscar por vehículo o servicio…' : 'Buscar por cliente, patente o servicio…',
      filters: [
        { key: 'cuando', label: 'Período', def: 'proximos', options: [['proximos', 'Próximos'], ['hoy', 'Hoy'], ['pasados', 'Pasados'], ['todos', 'Todos']],
          test: function (t, v, d, hoy) { return v === 'proximos' ? t.fecha >= hoy : v === 'hoy' ? t.fecha === hoy : t.fecha < hoy; } },
        { key: 'estado', label: 'Estado', def: 'todos', options: [['todos', 'Todos'], ['Reservado', 'Reservados'], ['Confirmado', 'Confirmados'], ['Realizado', 'Realizados'], ['Suspendido', 'Suspendidos']], test: function (t, v) { return t.estado === v; } }],
      rows: function (d) { return d.turnos.filter(function (t) { return !esCli || t.clienteId === me.clienteId; }); },
      sort: function (a, b, f) { var ka = a.fecha + a.hora, kb = b.fecha + b.hora; return f.cuando === 'proximos' || f.cuando === 'hoy' ? (ka < kb ? -1 : 1) : (ka < kb ? 1 : -1); },
      search: function (t, d) { var v = D.vehiculo(d, t.vehiculoId); return [D.nombreCliente(D.cliente(d, t.clienteId)), v ? v.patente + ' ' + v.marca + ' ' + v.modelo : '', D.nombreTipo(t.tipo)].join(' '); },
      onRow: esCli ? null : function (t) { F.turnoDetalle(t); },
      rowClass: function (t) { return (t.estado === 'Suspendido' ? 'muted-row ' : '') + (LG.flash[t.id] && LG.flash[t.id] > Date.now() ? 'flash' : ''); },
      empty: { title: 'No hay turnos para mostrar', text: D.can(me, 'turnos', 'c') ? 'Reservá el primero con el botón de arriba.' : null },
      cols: function (d, hoy) {
        var cols = [{ label: 'Fecha y hora', render: function (t) { return h('div', { class: 'cell-main' }, h('b', null, U.fmtCorta(t.fecha) + ' · ' + t.hora), t.fecha === hoy ? h('small', null, 'Hoy') : h('small', null, U.fmt(t.fecha))); } }];
        if (!esCli) cols.push({ label: 'Cliente', render: function (t) { return D.nombreCliente(D.cliente(d, t.clienteId)); } });
        cols.push(
          { label: 'Vehículo', render: function (t) { var v = D.vehiculo(d, t.vehiculoId); return v ? h('span', null, h('span', { class: 'plate' }, v.patente), ' ' + v.marca + ' ' + v.modelo) : '—'; } },
          { label: 'Servicio', render: function (t) { return D.nombreTipo(t.tipo); } },
          { label: 'Estado', render: function (t) { return h('span', null, UI.badge(t.estado), vivo(t) && t.fecha < hoy ? h('small', { class: 'muted' }, ' sin atender') : null); } },
          { label: '', cls: 'acts', render: function (t) {
            var v = vivo(t);
            return UI.actions([
              { label: 'Confirmar', icon: 'check', kind: 'primary', show: !esCli && D.can(me, 'turnos', 'u') && t.estado === 'Reservado', onClick: function () { LG.run(function (dd, a) { return D.confirmarTurno(dd, a, t.id); }, 'Turno confirmado'); } },
              { label: 'Modificar', icon: 'edit', iconOnly: true, show: D.can(me, 'turnos', 'u') && v, onClick: function () { F.turno({ turno: t }); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: D.can(me, 'turnos', 'd') && v, onClick: function () { F.suspenderTurno(t); } }]);
          } });
        return cols;
      }
    });
  };

  /* ---------- Servicios ---------- */
  P.servicios = function (ctx) {
    var me = ctx.me, esCli = me.rol === D.ROLES.CLI, esMec = me.rol === D.ROLES.MEC;
    return dataPage('servicios', {
      title: esCli ? 'Mi historial' : esMec ? 'Servicios que registré' : 'Servicios',
      sub: function (d) { var p = d.servicios.filter(function (s) { return s.estado === 'Finalizado'; }).length; return esCli ? 'Servicios hechos a tus vehículos' : p + (p === 1 ? ' servicio pendiente de cobro' : ' servicios pendientes de cobro'); },
      primary: D.can(me, 'servicios', 'c') ? V.btn('Registrar servicio', 'plus', 'primary', function () { F.servicio(); }) : null,
      searchPlaceholder: esCli ? 'Buscar por vehículo o servicio…' : 'Buscar por patente, cliente o servicio…',
      filters: [{ key: 'estado', label: 'Estado', def: 'todos', options: esCli ? [['todos', 'Todos'], ['Finalizado', 'Por pagar'], ['Cobrado', 'Pagados']] : [['todos', 'Todos'], ['Finalizado', 'Pendientes de cobro'], ['Cobrado', 'Cobrados'], ['Suspendido', 'Suspendidos']], test: function (s, v) { return s.estado === v; } }],
      rows: function (d) { return d.servicios.filter(function (s) { return esCli ? s.clienteId === me.clienteId && s.estado !== 'Suspendido' : esMec ? s.mecanicoId === me.id : true; }); },
      sort: function (a, b) { return a.fecha === b.fecha ? b.id - a.id : (a.fecha < b.fecha ? 1 : -1); },
      search: function (s, d) { var v = D.vehiculo(d, s.vehiculoId); return [v ? v.patente + ' ' + v.marca + ' ' + v.modelo : '', D.nombreCliente(D.cliente(d, s.clienteId)), D.nombreTipo(s.tipo)].join(' '); },
      onRow: function (s) { F.servicioDetalle(s); },
      rowClass: function (s) { return s.estado === 'Suspendido' ? 'muted-row' : ''; },
      empty: { title: 'No hay servicios para mostrar', text: esCli ? 'Cuando el Lubricentro atienda tus vehículos, los vas a ver acá.' : null },
      cols: function (d) {
        var cols = [
          { label: 'Fecha', render: function (s) { return U.fmt(s.fecha); } },
          { label: 'Vehículo', render: function (s) { var v = D.vehiculo(d, s.vehiculoId); return v ? h('span', null, h('span', { class: 'plate' }, v.patente), ' ' + v.marca + ' ' + v.modelo) : '—'; } }];
        if (!esCli) cols.push({ label: 'Cliente', render: function (s) { return D.nombreCliente(D.cliente(d, s.clienteId)); } });
        cols.push(
          { label: 'Servicio', render: function (s) { return D.nombreTipo(s.tipo); } },
          { label: 'Total', cls: 'num', render: function (s) { return U.money(s.total); } },
          { label: 'Estado', render: function (s) { return UI.badge(s.estado, s.estado === 'Finalizado' ? (esCli ? 'Por pagar' : 'Pendiente de cobro') : null); } },
          { label: '', cls: 'acts', render: function (s) {
            return UI.actions([
              { label: 'Cobrar', icon: 'dollar', kind: 'primary', show: D.can(me, 'servicios', 'k') && s.estado === 'Finalizado', onClick: function () { F.cobrar(s); } },
              { label: 'Comprobante', icon: 'receipt', show: s.estado === 'Cobrado', onClick: function () { F.comprobante(s); } },
              { label: 'Ver', icon: 'eye', show: s.estado !== 'Finalizado' || !D.can(me, 'servicios', 'k'), onClick: function () { F.servicioDetalle(s); } },
              { label: 'Modificar', icon: 'edit', iconOnly: true, show: D.can(me, 'servicios', 'u') && s.estado === 'Finalizado', onClick: function () { F.servicio({ servicio: s }); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: D.can(me, 'servicios', 'd') && s.estado === 'Finalizado', onClick: function () { F.suspenderServicio(s); } }]);
          } });
        return cols;
      }
    });
  };

  /* ---------- Stock ---------- */
  P.stock = function (ctx) {
    var me = ctx.me;
    return dataPage('stock', {
      title: 'Stock', sub: function (d) { var n = d.stock.filter(D.stockBajo).length; return n ? n + (n === 1 ? ' ítem bajo el mínimo' : ' ítems bajo el mínimo') : 'Todo el stock está sobre el mínimo'; },
      primary: D.can(me, 'stock', 'c') ? V.btn('Registrar ítem', 'plus', 'primary', function () { F.stock(); }) : null,
      searchPlaceholder: 'Buscar por nombre o tipo…',
      filters: [{ key: 'estado', label: 'Filtro', def: 'todos', options: [['todos', 'Todos'], ['bajo', 'Bajo mínimo'], ['Suspendido', 'Suspendidos']], test: function (it, v) { return v === 'bajo' ? D.stockBajo(it) : it.estado === v; } }],
      rows: function (d) { return d.stock.slice(); },
      sort: function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); },
      search: function (it) { return it.nombre + ' ' + it.tipo; },
      rowClass: function (it) { return it.estado !== 'Activo' ? 'muted-row' : ''; },
      empty: { title: 'Todavía no hay ítems de stock', text: 'Registrá lubricantes, filtros y repuestos para descontarlos en cada servicio.' },
      cols: function () {
        return [
          { label: 'Ítem', render: function (it) { return h('div', { class: 'cell-main' }, h('b', null, it.nombre), h('small', null, it.tipo)); } },
          { label: 'Existencia', render: function (it) {
            var bajo = D.stockBajo(it), pct = Math.max(2, Math.min(100, Math.round(it.cantidad / Math.max(1, it.minimo * 2) * 100)));
            return h('div', { class: 'stock-cell' }, h('div', { class: 'meter' + (bajo ? ' low' : '') }, h('i', { style: { width: pct + '%' } })), h('span', { class: bajo ? 'low-text' : '' }, U.num(it.cantidad) + ' ' + it.unidad));
          } },
          { label: 'Mínimo', cls: 'num', render: function (it) { return U.num(it.minimo) + ' ' + it.unidad; } },
          { label: 'Precio', cls: 'num', render: function (it) { return U.money(it.precio); } },
          { label: 'Estado', render: function (it) { return it.estado !== 'Activo' ? UI.badge(it.estado) : D.stockBajo(it) ? h('span', { class: 'badge bad' }, 'Bajo mínimo') : UI.badge('Activo', 'Disponible'); } },
          { label: '', cls: 'acts', render: function (it) {
            return UI.actions([{ label: 'Modificar', icon: 'edit', iconOnly: true, show: D.can(me, 'stock', 'u') && activo(it), onClick: function () { F.stock(it); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: D.can(me, 'stock', 'd') && activo(it), onClick: function () { F.suspenderStock(it); } }]);
          } }];
      }
    });
  };

  /* ---------- Usuarios ---------- */
  P.usuarios = function (ctx) {
    var me = ctx.me;
    return dataPage('usuarios', {
      title: 'Usuarios', sub: function (d) { return d.usuarios.filter(activo).length + ' usuarios activos'; },
      primary: V.btn('Registrar usuario', 'plus', 'primary', function () { F.usuario(); }),
      searchPlaceholder: 'Buscar por usuario o rol…',
      filters: [{ key: 'estado', label: 'Estado', options: segEstado(), def: 'todos', test: function (r, v) { return r.estado === v; } }],
      rows: function (d) { return d.usuarios.slice(); },
      sort: function (a, b) { return a.usuario.localeCompare(b.usuario); },
      search: function (u, d) { return u.usuario + ' ' + u.rol + ' ' + F.nombreUsuario(d, u); },
      rowClass: function (u) { return u.estado !== 'Activo' ? 'muted-row' : ''; },
      empty: { title: 'No hay usuarios' },
      cols: function (d) {
        return [
          { label: 'Usuario', render: function (u) { return h('div', { class: 'cell-main' }, h('b', null, u.usuario), h('small', null, F.nombreUsuario(d, u) + (u.id === me.id ? ' · vos' : ''))); } },
          { label: 'Rol', render: function (u) { return u.rol; } },
          { label: 'Cliente asociado', render: function (u) { var c = u.clienteId ? D.cliente(d, u.clienteId) : null; return c ? D.nombreCliente(c) : h('span', { class: 'muted' }, '—'); } },
          { label: 'Estado', render: function (u) { return UI.badge(u.estado); } },
          { label: '', cls: 'acts', render: function (u) {
            return UI.actions([{ label: 'Modificar', icon: 'edit', iconOnly: true, show: activo(u), onClick: function () { F.usuario(u); } },
              { label: 'Suspender', icon: 'ban', iconOnly: true, kind: 'danger-ghost', show: activo(u) && u.id !== me.id, onClick: function () { F.suspenderUsuario(u); } }]);
          } }];
      }
    });
  };

  /* ---------- Ficha de cliente ---------- */
  function back(ruta, texto) { return h('a', { class: 'back', href: '#/' + ruta }, UI.icon('chevL', 16), texto); }
  P.clienteFicha = function (ctx) {
    var d = ctx.db, me = ctx.me, c = D.cliente(d, Number(ctx.param));
    if (!c) return h('div', { class: 'page' }, back('clientes', 'Clientes'), UI.empty({ title: 'El cliente no existe' }));
    var vehs = d.vehiculos.filter(function (v) { return v.clienteId === c.id; });
    var turnos = d.turnos.filter(function (t) { return t.clienteId === c.id; }).sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? 1 : -1; }).slice(0, 6);
    var servs = d.servicios.filter(function (s) { return s.clienteId === c.id && s.estado !== 'Suspendido'; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    var usr = d.usuarios.find(function (u) { return u.clienteId === c.id; });
    var acts = [];
    if (D.can(me, 'vehiculos', 'c') && activo(c)) acts.push(V.btn('Registrar vehículo', 'car', '', function () { F.vehiculo(null, c.id); }));
    if (D.can(me, 'clientes', 'u') && activo(c)) acts.push(V.btn('Modificar', 'edit', '', function () { F.cliente(c); }));
    if (D.can(me, 'clientes', 'd') && activo(c)) acts.push(V.btn('Suspender', 'ban', 'danger-ghost', function () { F.suspenderCliente(c); }));
    return h('div', { class: 'page' }, back('clientes', 'Clientes'),
      V.pageHead(D.nombreCliente(c), h('span', null, UI.badge(c.estado), usr ? '  Usuario del portal: ' + usr.usuario : '  Sin usuario del portal'), acts),
      h('div', { class: 'grid-2' },
        UI.card('Datos de contacto', UI.dl([['Teléfono', c.telefono], ['Email', c.email], ['Dirección', c.direccion]])),
        UI.card('Vehículos', vehs.length ? UI.table({ cols: [
          { label: 'Patente', render: function (v) { return h('span', { class: 'plate' }, v.patente); } },
          { label: 'Vehículo', render: function (v) { return v.marca + ' ' + v.modelo + ' (' + v.anio + ')'; } },
          { label: 'Estado', render: function (v) { return UI.badge(v.estado); } },
          { label: '', cls: 'acts', render: function (v) { return UI.actions([{ label: 'Historial', icon: 'eye', onClick: function () { LG.go('vehiculos/' + v.id); } }]); } }], rows: vehs }) : UI.empty({ title: 'Sin vehículos registrados' }), { flush: true })),
      h('div', { class: 'grid-2' },
        UI.card('Turnos recientes', turnos.length ? h('ul', { class: 'list' }, turnos.map(function (t) { return h('li', { class: 'list-item clickable', onclick: function () { F.turnoDetalle(t); } }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, F.turnoCuando(t)), h('div', { class: 'li-sub' }, D.nombreTipo(t.tipo) + ' · ' + D.vehLabel(D.vehiculo(d, t.vehiculoId)))), h('div', { class: 'li-side' }, UI.badge(t.estado))); })) : UI.empty({ title: 'Sin turnos' }), { flush: true }),
        UI.card('Servicios realizados', servs.length ? h('ul', { class: 'list' }, servs.slice(0, 6).map(function (s) { return h('li', { class: 'list-item clickable', onclick: function () { F.servicioDetalle(s); } }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, D.nombreTipo(s.tipo)), h('div', { class: 'li-sub' }, U.fmt(s.fecha) + ' · ' + D.vehLabel(D.vehiculo(d, s.vehiculoId)))), h('div', { class: 'li-side' }, h('b', { class: 'money' }, U.money(s.total)), UI.badge(s.estado))); })) : UI.empty({ title: 'Sin servicios' }), { flush: true })));
  };

  /* ---------- Historial de un vehículo ---------- */
  P.vehiculoFicha = function (ctx) {
    var d = ctx.db, me = ctx.me, v = D.vehiculo(d, Number(ctx.param));
    if (!v) return h('div', { class: 'page' }, back('vehiculos', 'Vehículos'), UI.empty({ title: 'El vehículo no existe' }));
    var c = D.cliente(d, v.clienteId), hoy = D.hoy(d);
    var servs = d.servicios.filter(function (s) { return s.vehiculoId === v.id && s.estado !== 'Suspendido'; }).sort(function (a, b) { return a.fecha === b.fecha ? b.id - a.id : (a.fecha < b.fecha ? 1 : -1); });
    var ultimos = {}; servs.forEach(function (s) { if (!ultimos[s.tipo]) ultimos[s.tipo] = s; });
    var prox = Object.keys(ultimos).map(function (k) { return ultimos[k]; }).sort(function (a, b) { return a.proximaFecha < b.proximaFecha ? -1 : 1; });
    var acts = [];
    if (D.can(me, 'turnos', 'c') && activo(v)) acts.push(V.btn('Reservar turno', 'calendar', '', function () { F.turno({ clienteId: v.clienteId, vehiculoId: v.id }); }));
    if (D.can(me, 'vehiculos', 'u') && activo(v)) acts.push(V.btn('Modificar', 'edit', '', function () { F.vehiculo(v); }));
    if (D.can(me, 'vehiculos', 'd') && activo(v)) acts.push(V.btn('Suspender', 'ban', 'danger-ghost', function () { F.suspenderVehiculo(v); }));
    return h('div', { class: 'page' }, back('vehiculos', 'Vehículos'),
      V.pageHead(v.marca + ' ' + v.modelo + ' · ' + v.patente, h('span', null, UI.badge(v.estado), '  Año ' + v.anio + ' · ', c ? h('a', { href: '#/clientes/' + c.id }, D.nombreCliente(c)) : ''), acts),
      h('div', { class: 'grid-2' },
        UI.card('Próximos servicios', prox.length ? h('ul', { class: 'list' }, prox.map(function (s) {
          var dias = U.diffDays(s.proximaFecha, hoy);
          return h('li', { class: 'list-item' }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, D.nombreTipo(s.tipo)), h('div', { class: 'li-sub' }, 'Estimado ' + U.fmt(s.proximaFecha) + ' · último ' + U.fmt(s.fecha))),
            h('div', { class: 'li-side' }, dias < 0 ? UI.chip('Vencido hace ' + (-dias) + ' d', 'bad') : dias <= d.config.diasAlerta ? UI.chip('En ' + dias + ' d', 'warn') : UI.chip('En ' + dias + ' d', '')));
        })) : UI.empty({ title: 'Todavía no hay servicios registrados' }), { flush: true }),
        UI.card('Resumen', UI.dl([['Servicios realizados', String(servs.length)], ['Último kilometraje', servs.length ? U.num(Math.max.apply(null, servs.map(function (s) { return s.km; }))) + ' km' : '—'], ['Gastado en total', U.money(servs.reduce(function (a, s) { return a + s.total; }, 0))]]))),
      UI.card('Historial de servicios', servs.length ? UI.table({ cols: [
        { label: 'Fecha', render: function (s) { return U.fmt(s.fecha); } }, { label: 'Servicio', render: function (s) { return D.nombreTipo(s.tipo); } },
        { label: 'Kilometraje', cls: 'num', render: function (s) { return U.num(s.km) + ' km'; } },
        { label: 'Insumos', render: function (s) { return s.insumos.length ? s.insumos.map(function (i) { return i.nombre + ' ×' + U.num(i.cantidad); }).join(', ') : '—'; } },
        { label: 'Total', cls: 'num', render: function (s) { return U.money(s.total); } }, { label: 'Estado', render: function (s) { return UI.badge(s.estado, s.estado === 'Finalizado' ? 'Pendiente de cobro' : null); } }], rows: servs, onRow: function (s) { F.servicioDetalle(s); } }) : UI.empty({ title: 'Sin servicios' }), { flush: true }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
