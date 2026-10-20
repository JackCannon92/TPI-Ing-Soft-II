/* LubriGest demo — inicio de cada rol, agenda del día y componentes compartidos. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, D = LG.D, UI = LG.UI, F = LG.F, h = U.h;
  var V = (LG.V = {});
  LG.vs = LG.vs || {};
  LG.flash = LG.flash || {};
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var db = function () { return LG.Store.db; };
  var activo = function (x) { return x.estado === 'Activo'; };
  var vivo = function (t) { return t.estado === 'Reservado' || t.estado === 'Confirmado'; };

  V.pageHead = function (title, sub, actions) {
    return h('header', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'sub' }, sub) : null), h('div', { class: 'page-actions' }, actions || null));
  };
  V.saludo = function () { var hr = new Date().getHours(); return hr < 12 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches'; };
  V.primerNombre = function (d, u) { return F.nombreUsuario(d, u).split(' ')[0]; };
  V.irA = function (ruta, estado) { if (estado) LG.vs[ruta] = estado; LG.go(ruta); };
  V.btn = function (label, icon, kind, fn) { return h('button', { class: 'btn ' + (kind || ''), type: 'button', onclick: fn }, icon ? UI.icon(icon, 16) : null, label); };

  /* ---------- Agenda del día: lo más "vivo" de la demo ---------- */
  V.agenda = function (o) {
    var d = db(), hoy = D.hoy(d), vs = LG.vs.agenda = LG.vs.agenda || { fecha: null };
    var fecha = vs.fecha || hoy, me = o.me;
    if (!vs.fecha) { for (var k = 0; k < 7 && !D.slotsDia(fecha).length; k++) fecha = U.addDays(fecha, 1); } // domingo: se muestra el próximo día de atención
    var slots = D.slotsDia(fecha), bahias = d.config.bahias || 2;
    var delDia = d.turnos.filter(function (t) { return t.fecha === fecha && t.estado !== 'Suspendido'; });
    var cap = slots.length * bahias;
    function mover(n) {
      var f = U.addDays(fecha, n);
      if (U.dow(f) === 0) f = U.addDays(f, n);
      vs.fecha = f === hoy ? null : f; LG.render();
    }
    var picker = h('input', { type: 'date', value: fecha, 'aria-label': 'Elegir día', class: 'date-in', onchange: function (e) { if (e.target.value) { vs.fecha = e.target.value === hoy ? null : e.target.value; LG.render(); } } });
    var head = h('div', { class: 'ag-head' },
      h('div', { class: 'ag-title' }, h('b', null, fecha === hoy ? 'Hoy' : fecha === U.addDays(hoy, 1) ? 'Mañana' : U.fmtLarga(fecha).split(' ')[0]), h('span', null, U.fmtLarga(fecha)),
        h('em', null, slots.length ? delDia.length + ' de ' + cap + ' lugares ocupados' : 'Cerrado')),
      h('div', { class: 'ag-nav' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Día anterior', onclick: function () { mover(-1); } }, UI.icon('chevL')),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: function () { vs.fecha = null; LG.render(); }, disabled: !vs.fecha }, 'Hoy'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Día siguiente', onclick: function () { mover(1); } }, UI.icon('chevR')),
        picker));
    var body = h('div', { class: 'agenda' });
    if (!slots.length) body.appendChild(UI.empty({ title: 'El Lubricentro no atiende los domingos', text: 'Usá las flechas para ir a otro día.' }));
    if (slots.length) {
      var cab = h('div', { class: 'bays' });
      for (var b = 0; b < bahias; b++) cab.appendChild(h('span', null, 'Bahía ' + (b + 1)));
      body.appendChild(h('div', { class: 'bays-head' }, h('div'), cab));
    }
    var puedeReservar = D.can(me, 'turnos', 'c') && me.rol !== D.ROLES.CLI && fecha >= hoy;
    slots.forEach(function (hora, idx) {
      if (hora === '15:00') body.appendChild(h('div', { class: 'ag-break' }, h('span', null, 'Tarde')));
      if (idx === 0) body.appendChild(h('div', { class: 'ag-break' }, h('span', null, 'Mañana')));
      var ts = delDia.filter(function (t) { return t.hora === hora; }).sort(function (a, b) { return a.id - b.id; });
      var bays = h('div', { class: 'bays' });
      for (var i = 0; i < bahias; i++) {
        var t = ts[i];
        if (t) {
          var veh = D.vehiculo(d, t.vehiculoId), cli = D.cliente(d, t.clienteId);
          var fl = LG.flash[t.id] && LG.flash[t.id] > Date.now();
          bays.appendChild(h('button', { type: 'button', class: 'tn-card est-' + t.estado.toLowerCase() + (fl ? ' flash' : ''), onclick: (function (tt) { return function () { o.onTurno(tt); }; })(t), title: D.nombreCliente(cli) + ' · ' + D.nombreTipo(t.tipo) },
            h('span', { class: 'tn-top' }, h('b', null, veh ? veh.patente : '—'), UI.badge(t.estado)),
            h('span', { class: 'tn-mid' }, D.nombreTipo(t.tipo)),
            h('span', { class: 'tn-bot' }, veh ? veh.marca + ' ' + veh.modelo : '', ' · ', cli ? cli.apellido : '')));
        } else if (puedeReservar) {
          bays.appendChild(h('button', { type: 'button', class: 'bay-free can', 'aria-label': 'Reservar turno a las ' + hora, onclick: (function (hh) { return function () { o.onSlot(fecha, hh); }; })(hora) }, UI.icon('plus', 15), 'Libre'));
        } else bays.appendChild(h('div', { class: 'bay-free' }, 'Libre'));
      }
      body.appendChild(h('div', { class: 'slot-row' }, h('div', { class: 'slot-time' }, hora), bays));
    });
    return UI.card(null, [head, body], { cls: 'agenda-card', flush: true });
  };
  V.abrirTurno = function (t) { F.turnoDetalle(t); };

  /* ---------- Listas reutilizables ---------- */
  function chipDias(a) {
    if (a.dias < 0) return UI.chip('Vencido hace ' + (-a.dias) + (a.dias === -1 ? ' día' : ' días'), 'bad');
    if (a.dias === 0) return UI.chip('Vence hoy', 'bad');
    return UI.chip('Vence en ' + a.dias + (a.dias === 1 ? ' día' : ' días'), 'warn');
  }
  V.alertasLista = function (alertas, rol) {
    var d = db();
    if (!alertas.length) return UI.empty({ title: 'No hay servicios por vencer', text: 'Cuando falten ' + d.config.diasAlerta + ' días o menos para el próximo servicio de un vehículo, aparece acá.' });
    var ul = h('ul', { class: 'list' });
    alertas.forEach(function (a) {
      var v = D.vehiculo(d, a.vehiculoId), c = D.cliente(d, a.clienteId), s = D.servicio(d, a.servicioId);
      var accion;
      if (a.turno) accion = UI.chip('Turno ' + F.turnoCuando(a.turno), 'ok', 'calendar');
      else accion = V.btn('Reservar turno', 'calendar', 'sm', function () { F.turno({ clienteId: c.id, vehiculoId: v.id, tipo: a.tipo }); });
      ul.appendChild(h('li', { class: 'list-item alert-item' },
        h('div', { class: 'li-main' },
          h('div', { class: 'li-title' }, v.patente, h('span', null, ' · ' + v.marca + ' ' + v.modelo)),
          h('div', { class: 'li-sub' }, D.nombreTipo(a.tipo) + ' · ' + (rol === D.ROLES.CLI ? '' : D.nombreCliente(c) + ' · ') + 'estimado ' + U.fmt(a.proxima))),
        h('div', { class: 'li-side' }, chipDias(a), s.recordatorioEnviado && rol !== D.ROLES.CLI ? UI.chip('Recordatorio enviado', 'info', 'bell') : null, rol === D.ROLES.CLI ? null : accion)));
    });
    return ul;
  };
  V.cobrosLista = function (me, limite) {
    var d = db(), pend = d.servicios.filter(function (s) { return s.estado === 'Finalizado'; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    if (!pend.length) return UI.empty({ title: 'No hay cobros pendientes', text: 'Los servicios finalizados por los mecánicos aparecen acá.' });
    var ul = h('ul', { class: 'list' });
    pend.slice(0, limite || 6).forEach(function (s) {
      var v = D.vehiculo(d, s.vehiculoId), c = D.cliente(d, s.clienteId);
      ul.appendChild(h('li', { class: 'list-item' },
        h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, v.patente, h('span', null, ' · ' + D.nombreTipo(s.tipo))), h('div', { class: 'li-sub' }, D.nombreCliente(c) + ' · ' + U.fmtCorta(s.fecha))),
        h('div', { class: 'li-side' }, h('b', { class: 'money' }, U.money(s.total)), D.can(me, 'servicios', 'k') ? V.btn('Cobrar', 'dollar', 'sm primary', function () { F.cobrar(s); }) : null)));
    });
    return ul;
  };
  V.stockBajoLista = function (me) {
    var d = db(), bajos = d.stock.filter(D.stockBajo);
    if (!bajos.length) return UI.empty({ title: 'Todo el stock está sobre el mínimo' });
    return h('ul', { class: 'list' }, bajos.map(function (it) {
      return h('li', { class: 'list-item' }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, it.nombre), h('div', { class: 'li-sub' }, it.tipo + ' · mínimo ' + U.num(it.minimo) + ' ' + it.unidad)),
        h('div', { class: 'li-side' }, UI.chip(U.num(it.cantidad) + ' ' + it.unidad, 'bad')));
    }));
  };
  V.actividad = function (me, n) {
    var d = db(), evs = d.eventos.filter(function (e) { return D.visible(e, me); }).slice(0, n || 8);
    if (!evs.length) return UI.empty({ title: 'Todavía no hay actividad' });
    var ico = { turno: 'calendar', servicio: 'wrench', stock: 'box', cobro: 'dollar', alerta: 'bell' };
    return h('ul', { class: 'feed' }, evs.map(function (e) {
      return h('li', null, h('span', { class: 'feed-ico ' + e.tipo }, UI.icon(ico[e.tipo] || 'bell', 15)), h('div', null, h('div', { class: 'feed-text' }, e.texto), h('div', { class: 'feed-time' }, U.hace(e.ts))));
    }));
  };

  /* ---------- Inicio: Gerente Administrativa ---------- */
  function inicioGA(me, d, hoy) {
    var delDia = d.turnos.filter(function (t) { return t.fecha === hoy && t.estado !== 'Suspendido'; });
    var porConfirmar = d.turnos.filter(function (t) { return t.estado === 'Reservado' && t.fecha >= hoy; });
    var pend = d.servicios.filter(function (s) { return s.estado === 'Finalizado'; });
    var total = pend.reduce(function (a, s) { return a + s.total; }, 0);
    var bajos = d.stock.filter(D.stockBajo);
    var alertas = D.alertas(d);
    return [
      V.pageHead(V.saludo() + ', ' + V.primerNombre(d, me), U.fmtLarga(hoy) + ' · esto es lo que pasa hoy en el Lubricentro',
        [V.btn('Reservar turno', 'plus', 'primary', function () { F.turno(); }), V.btn('Registrar cliente', 'users', '', function () { F.cliente(); })]),
      h('div', { class: 'kpis' },
        UI.kpi({ label: 'Turnos de hoy', icon: 'calendar', value: delDia.length, sub: delDia.filter(function (t) { return t.estado === 'Realizado'; }).length + ' realizados', onClick: function () { LG.vs.agenda = { fecha: null }; LG.render(); } }),
        UI.kpi({ label: 'Por confirmar', icon: 'clock', value: porConfirmar.length, tone: porConfirmar.length ? 'warn' : '', sub: 'turnos reservados', onClick: function () { V.irA('turnos', { q: '', f: { estado: 'Reservado', cuando: 'proximos' } }); } }),
        UI.kpi({ label: 'Pendiente de cobro', icon: 'dollar', value: U.money(total), tone: pend.length ? 'warn' : '', sub: pend.length + (pend.length === 1 ? ' servicio' : ' servicios'), onClick: function () { V.irA('servicios', { q: '', f: { estado: 'Finalizado' } }); } }),
        UI.kpi({ label: 'Stock bajo mínimo', icon: 'box', value: bajos.length, tone: bajos.length ? 'bad' : '', sub: bajos.length ? bajos.slice(0, 2).map(function (i) { return i.nombre; }).join(', ') : 'todo en orden', onClick: function () { V.irA('stock', { q: '', f: { estado: 'bajo' } }); } })),
      h('div', { class: 'grid-main' },
        V.agenda({ me: me, onSlot: function (f, hora) { F.turno({ fecha: f, hora: hora }); }, onTurno: V.abrirTurno }),
        h('div', { class: 'stack' },
          UI.card('Alertas de servicio', V.alertasLista(alertas, me.rol), { sub: alertas.length ? alertas.length + '' : null, flush: true }),
          UI.card('Pendiente de cobro', V.cobrosLista(me), { flush: true, actions: pend.length > 6 ? V.btn('Ver todos', null, 'sm ghost', function () { V.irA('servicios', { q: '', f: { estado: 'Finalizado' } }); }) : null }),
          UI.card('Stock bajo el mínimo', V.stockBajoLista(me), { flush: true })))
    ];
  }

  /* ---------- Inicio: Mecánicos ---------- */
  function inicioMEC(me, d, hoy) {
    var delDia = d.turnos.filter(function (t) { return t.fecha === hoy && t.estado !== 'Suspendido'; });
    var porAtender = delDia.filter(vivo);
    var mios = d.servicios.filter(function (s) { return s.mecanicoId === me.id && s.fecha === hoy && s.estado !== 'Suspendido'; });
    var bajos = d.stock.filter(D.stockBajo);
    var prox = porAtender.sort(function (a, b) { return a.hora < b.hora ? -1 : 1; })[0];
    return [
      V.pageHead(V.saludo() + ', ' + V.primerNombre(d, me), U.fmtLarga(hoy) + ' · tocá un turno para registrar el servicio', V.btn('Registrar servicio', 'plus', 'primary', function () { F.servicio(); })),
      h('div', { class: 'kpis' },
        UI.kpi({ label: 'Turnos de hoy', icon: 'calendar', value: delDia.length, sub: porAtender.length + ' por atender' }),
        UI.kpi({ label: 'Próximo turno', icon: 'clock', value: prox ? prox.hora : '—', sub: prox ? D.vehLabel(D.vehiculo(d, prox.vehiculoId)) : 'sin turnos pendientes' }),
        UI.kpi({ label: 'Registré hoy', icon: 'wrench', value: mios.length, sub: mios.length === 1 ? 'servicio' : 'servicios', onClick: function () { LG.go('servicios'); } }),
        UI.kpi({ label: 'Insumos bajo mínimo', icon: 'box', value: bajos.length, tone: bajos.length ? 'bad' : '', sub: 'consultar stock', onClick: function () { LG.go('stock'); } })),
      h('div', { class: 'grid-main' },
        V.agenda({ me: me, onSlot: function () {}, onTurno: function (t) { if (vivo(t) && t.fecha === hoy) F.servicio({ turno: t }); else F.turnoDetalle(t); } }),
        h('div', { class: 'stack' }, UI.card('Insumos bajo el mínimo', V.stockBajoLista(me), { flush: true }), UI.card('Servicios que registré', mios.length ? h('ul', { class: 'list' }, mios.map(function (s) {
          var v = D.vehiculo(d, s.vehiculoId);
          return h('li', { class: 'list-item clickable', onclick: function () { F.servicioDetalle(s); } }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, v.patente, h('span', null, ' · ' + D.nombreTipo(s.tipo))), h('div', { class: 'li-sub' }, U.num(s.km) + ' km')), h('div', { class: 'li-side' }, UI.badge(s.estado)));
        })) : UI.empty({ title: 'Todavía no registraste servicios hoy' }), { flush: true })))
    ];
  }

  /* ---------- Inicio: CEO ---------- */
  function mesesAtras(hoy, n) {
    var p = hoy.split('-'), y = Number(p[0]), m = Number(p[1]) - 1, out = [];
    for (var i = n - 1; i >= 0; i--) { var mm = m - i, yy = y; while (mm < 0) { mm += 12; yy--; } out.push({ clave: yy + '-' + U.pad(mm + 1), label: MES[mm] }); }
    return out;
  }
  function barras(items) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return h('div', { class: 'bars', role: 'img', 'aria-label': items.map(function (i) { return i.label + ': ' + U.money(i.value); }).join(', ') },
      items.map(function (i) {
        return h('div', { class: 'bar-col' }, h('div', { class: 'bar-val' }, i.value ? U.money(i.value).replace('$ ', '$') : '—'), h('div', { class: 'bar-track' }, h('div', { class: 'bar' + (i.hl ? ' hl' : ''), style: { height: Math.max(i.value ? 3 : 0, Math.round(i.value / max * 100)) + '%' } })), h('div', { class: 'bar-lab' }, i.label));
      }));
  }
  function barrasH(items) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return h('div', { class: 'hbars' }, items.map(function (i) {
      return h('div', { class: 'hbar' }, h('div', { class: 'hb-lab' }, i.label), h('div', { class: 'hb-track' }, h('div', { class: 'hb-fill', style: { width: Math.round(i.value / max * 100) + '%' } })), h('div', { class: 'hb-val' }, String(i.value)));
    }));
  }
  function inicioCEO(me, d, hoy) {
    var meses = mesesAtras(hoy, 6), mesAct = meses[5].clave, mesAnt = meses[4].clave;
    var cobrados = d.servicios.filter(function (s) { return s.estado === 'Cobrado'; });
    var ing = {}; cobrados.forEach(function (s) { var k = U.mesClave(s.cobro.fecha); ing[k] = (ing[k] || 0) + s.cobro.monto; });
    var serv = d.servicios.filter(function (s) { return s.estado !== 'Suspendido'; });
    var delMes = serv.filter(function (s) { return U.mesClave(s.fecha) === mesAct; });
    var pend = serv.filter(function (s) { return s.estado === 'Finalizado'; });
    var prox7 = d.turnos.filter(function (t) { return vivo(t) && t.fecha >= hoy && t.fecha <= U.addDays(hoy, 7); });
    var bajos = d.stock.filter(D.stockBajo);
    var vsAnt = ing[mesAnt] ? Math.round(((ing[mesAct] || 0) - ing[mesAnt]) / ing[mesAnt] * 100) : null;
    var porTipo = {}; serv.filter(function (s) { return s.fecha >= U.addDays(hoy, -180); }).forEach(function (s) { porTipo[s.tipo] = (porTipo[s.tipo] || 0) + 1; });
    var tipos = Object.keys(porTipo).map(function (k) { return { label: D.nombreTipo(k), value: porTipo[k] }; }).sort(function (a, b) { return b.value - a.value; });
    var proximos = d.turnos.filter(function (t) { return vivo(t) && t.fecha >= hoy; }).sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; }).slice(0, 6);
    return [
      V.pageHead(V.saludo() + ', ' + V.primerNombre(d, me), 'Resumen del negocio al ' + U.fmt(hoy)),
      h('div', { class: 'kpis five' },
        UI.kpi({ label: 'Ingresos del mes', icon: 'dollar', value: U.money(ing[mesAct] || 0), sub: vsAnt == null ? 'sin mes anterior' : (vsAnt >= 0 ? '+' : '') + vsAnt + '% vs. mes anterior' }),
        UI.kpi({ label: 'Servicios del mes', icon: 'wrench', value: delMes.length, sub: 'registrados', onClick: function () { LG.go('servicios'); } }),
        UI.kpi({ label: 'Pendiente de cobro', icon: 'clock', value: U.money(pend.reduce(function (a, s) { return a + s.total; }, 0)), tone: pend.length ? 'warn' : '', sub: pend.length + ' servicios', onClick: function () { V.irA('servicios', { q: '', f: { estado: 'Finalizado' } }); } }),
        UI.kpi({ label: 'Turnos próximos 7 días', icon: 'calendar', value: prox7.length, sub: 'reservados o confirmados', onClick: function () { LG.go('turnos'); } }),
        UI.kpi({ label: 'Stock bajo mínimo', icon: 'box', value: bajos.length, tone: bajos.length ? 'bad' : '', sub: 'ítems a reponer', onClick: function () { V.irA('stock', { q: '', f: { estado: 'bajo' } }); } })),
      h('div', { class: 'grid-2' },
        UI.card('Ingresos por mes', barras(meses.map(function (m, i) { return { label: m.label, value: ing[m.clave] || 0, hl: i === 5 }; })), { sub: 'servicios cobrados' }),
        UI.card('Servicios más pedidos', barrasH(tipos), { sub: 'últimos 6 meses' })),
      h('div', { class: 'grid-2' },
        UI.card('Actividad reciente', V.actividad(me, 7), { flush: true }),
        UI.card('Próximos turnos', proximos.length ? h('ul', { class: 'list' }, proximos.map(function (t) {
          var v = D.vehiculo(d, t.vehiculoId), c = D.cliente(d, t.clienteId);
          return h('li', { class: 'list-item clickable', onclick: function () { F.turnoDetalle(t); } }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, F.turnoCuando(t), h('span', null, ' · ' + D.nombreTipo(t.tipo))), h('div', { class: 'li-sub' }, v.patente + ' · ' + D.nombreCliente(c))), h('div', { class: 'li-side' }, UI.badge(t.estado)));
        })) : UI.empty({ title: 'No hay turnos próximos' }), { flush: true }))
    ];
  }

  /* ---------- Inicio: Cliente (portal) ---------- */
  function inicioCLI(me, d, hoy) {
    var cli = D.cliente(d, me.clienteId), alertas = D.alertas(d, { clienteId: me.clienteId });
    var vehs = d.vehiculos.filter(function (v) { return v.clienteId === me.clienteId && activo(v); });
    var turnos = d.turnos.filter(function (t) { return t.clienteId === me.clienteId && vivo(t) && t.fecha >= hoy; }).sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; });
    var alertCards = alertas.length ? h('div', { class: 'alert-cards' }, alertas.map(function (a) {
      var v = D.vehiculo(d, a.vehiculoId);
      return h('article', { class: 'alert-card ' + (a.vencida ? 'bad' : 'warn') },
        h('div', { class: 'ac-when' }, a.vencida ? 'Vencido' : a.dias === 0 ? 'Hoy' : 'En ' + a.dias + (a.dias === 1 ? ' día' : ' días'), h('small', null, a.vencida ? 'hace ' + (-a.dias) + ' d' : U.fmt(a.proxima))),
        h('div', { class: 'ac-body' }, h('b', null, D.nombreTipo(a.tipo)), h('span', null, v.marca + ' ' + v.modelo + ' · ' + v.patente), h('small', null, 'Servicio estimado para el ' + U.fmt(a.proxima))),
        a.turno ? h('div', { class: 'ac-done' }, UI.icon('check', 16), 'Turno reservado', h('small', null, F.turnoCuando(a.turno) + ' · ' + a.turno.estado))
          : V.btn('Reservar turno', 'calendar', 'primary', function () { F.turno({ vehiculoId: v.id, tipo: a.tipo }); }));
    })) : UI.empty({ title: 'No tenés servicios por vencer', text: 'Te avisamos acá cuando falten ' + d.config.diasAlerta + ' días o menos para el próximo servicio de tus vehículos.' });
    return [
      V.pageHead('Hola, ' + (cli ? cli.nombre : me.usuario), 'Tu portal del Lubricentro · ' + U.fmtLarga(hoy), V.btn('Reservar turno', 'plus', 'primary', function () { F.turno(); })),
      UI.card('Próximos servicios', alertCards, { sub: alertas.length ? alertas.length + ' ' + (alertas.length === 1 ? 'aviso' : 'avisos') : null }),
      h('div', { class: 'grid-2' },
        UI.card('Mis turnos', turnos.length ? h('ul', { class: 'list' }, turnos.map(function (t) {
          var v = D.vehiculo(d, t.vehiculoId);
          return h('li', { class: 'list-item' }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, U.fmtLarga(t.fecha).replace(/\/\d{4}$/, '') + ' · ' + t.hora), h('div', { class: 'li-sub' }, D.nombreTipo(t.tipo) + ' · ' + v.patente)),
            h('div', { class: 'li-side' }, UI.badge(t.estado), UI.actions([{ label: 'Modificar', icon: 'edit', onClick: function () { F.turno({ turno: t }); } }, { label: 'Suspender', icon: 'ban', kind: 'danger-ghost', onClick: function () { F.suspenderTurno(t); } }])));
        })) : UI.empty({ title: 'No tenés turnos reservados', action: { label: 'Reservar turno', onClick: function () { F.turno(); } } }), { flush: true }),
        UI.card('Mis vehículos', vehs.length ? h('ul', { class: 'list' }, vehs.map(function (v) {
          var ult = d.servicios.filter(function (s) { return s.vehiculoId === v.id && s.estado !== 'Suspendido'; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0];
          return h('li', { class: 'list-item' }, h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, v.marca + ' ' + v.modelo, h('span', null, ' · ' + v.patente)), h('div', { class: 'li-sub' }, ult ? 'Último servicio: ' + D.nombreTipo(ult.tipo) + ' (' + U.fmt(ult.fecha) + ')' : 'Sin servicios registrados')),
            h('div', { class: 'li-side' }, V.btn('Reservar turno', 'calendar', 'sm', function () { F.turno({ vehiculoId: v.id }); })));
        })) : UI.empty({ title: 'No tenés vehículos activos', text: 'Pedile a la Gerente Administrativa que registre tu vehículo.' }), { flush: true }))
    ];
  }

  V.inicio = function (ctx) {
    var d = ctx.db, me = ctx.me, hoy = D.hoy(d);
    var r = me.rol === D.ROLES.GA ? inicioGA(me, d, hoy) : me.rol === D.ROLES.MEC ? inicioMEC(me, d, hoy) : me.rol === D.ROLES.CEO ? inicioCEO(me, d, hoy) : inicioCLI(me, d, hoy);
    return h('div', { class: 'page inicio' }, r);
  };
})(typeof window !== 'undefined' ? window : globalThis);
