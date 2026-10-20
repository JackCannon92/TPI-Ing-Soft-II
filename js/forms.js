/* LubriGest demo — formularios y ventanas de cada gestión. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, D = LG.D, UI = LG.UI, h = U.h;
  var F = (LG.F = {});
  LG.vs = LG.vs || {};

  var activo = function (x) { return x.estado === 'Activo'; };
  var db = function () { return LG.Store.db; };
  var porApellido = function (a, b) { return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre, 'es'); };

  F.nombreUsuario = function (d, u) {
    if (!u) return '—';
    if (u.nombre) return u.nombre;
    if (u.clienteId) { var c = D.cliente(d, u.clienteId); if (c) return c.nombre + ' ' + c.apellido; }
    return u.usuario;
  };
  F.turnoCuando = function (t) { return U.fmtCorta(t.fecha) + ' ' + t.hora; };
  F.clienteOpts = function (d) { return d.clientes.filter(activo).sort(porApellido).map(function (c) { return { value: c.id, label: D.nombreCliente(c) }; }); };
  F.vehOpts = function (d, clienteId) {
    return d.vehiculos.filter(function (v) { return activo(v) && v.clienteId === Number(clienteId); }).map(function (v) { return { value: v.id, label: v.marca + ' ' + v.modelo + ' — ' + v.patente }; });
  };
  F.tipoOpts = D.TIPOS_SERVICIO.map(function (t) { return { value: t.id, label: t.nombre }; });
  F.opts = function (arr) { return arr.map(function (x) { return { value: x, label: x }; }); };

  function ok(msg) { return function (r) { UI.toast(msg(r)); return r; }; }

  /* ---------- Clientes ---------- */
  F.cliente = function (c) {
    return UI.formModal({
      title: c ? 'Modificar cliente' : 'Registrar cliente',
      intro: c ? null : 'Completá los datos del cliente. Se valida que no exista otro con el mismo teléfono o email.',
      values: c || {}, submitLabel: c ? 'Guardar cambios' : 'Registrar cliente',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true, maxlength: 40 },
        { name: 'apellido', label: 'Apellido', required: true, maxlength: 40 },
        { name: 'telefono', label: 'Teléfono', required: true, type: 'tel', placeholder: '345 4551234', maxlength: 20 },
        { name: 'email', label: 'Email', required: true, type: 'email', placeholder: 'nombre@mail.com', maxlength: 60 },
        { name: 'direccion', label: 'Dirección', required: true, span: 2, maxlength: 80 }
      ],
      submit: function (v) { return LG.mutate(function (d, a) { return c ? D.modificarCliente(d, a, c.id, v) : D.registrarCliente(d, a, v); }); },
      done: ok(function (r) { return c ? 'Cliente modificado: ' + D.nombreCliente(r) : 'Cliente registrado: ' + D.nombreCliente(r); })
    });
  };

  /* ---------- Vehículos ---------- */
  F.vehiculo = function (v, clienteId) {
    var d0 = db();
    return UI.formModal({
      title: v ? 'Modificar vehículo' : 'Registrar vehículo',
      values: v ? v : { clienteId: clienteId || '' }, submitLabel: v ? 'Guardar cambios' : 'Registrar vehículo',
      fields: [
        v ? { name: 'clienteId', label: 'Propietario', type: 'static', span: 2 } : { name: 'clienteId', label: 'Propietario', type: 'select', required: true, span: 2, options: F.clienteOpts(d0), placeholder: 'Seleccionar cliente…' },
        { name: 'patente', label: 'Patente', required: true, placeholder: 'AB123CD', maxlength: 8, hint: 'Formato AB123CD o ABC123' },
        { name: 'anio', label: 'Año', required: true, type: 'number', min: 1960, max: new Date().getFullYear() + 1, inputmode: 'numeric' },
        { name: 'marca', label: 'Marca', required: true, maxlength: 30 },
        { name: 'modelo', label: 'Modelo', required: true, maxlength: 30 }
      ].map(function (f) { if (v && f.name === 'clienteId') { f = U.clone(f); } return f; }),
      submit: function (x) { return LG.mutate(function (d, a) { return v ? D.modificarVehiculo(d, a, v.id, x) : D.registrarVehiculo(d, a, x); }); },
      done: ok(function (r) { return (v ? 'Vehículo modificado: ' : 'Vehículo registrado: ') + r.patente; }),
      onChange: function (name, api) {
        if (v && name === null) api.set('clienteId', D.nombreCliente(D.cliente(db(), v.clienteId)));
      }
    });
  };

  /* ---------- Turnos ---------- */
  function slotPicker(api, excludeId, initial) {
    var sel = initial || '', msg = h('div', { class: 'slots-msg', 'aria-live': 'polite' }), grid = h('div', { class: 'slots', role: 'radiogroup', 'aria-label': 'Horarios' });
    var el = h('div', { class: 'slot-picker' }, msg, grid);
    function refresh() {
      var d = db(), fecha = api.get('fecha');
      grid.innerHTML = ''; msg.textContent = ''; msg.className = 'slots-msg';
      if (!fecha) { msg.textContent = 'Elegí una fecha para ver los horarios disponibles.'; return; }
      if (fecha < D.hoy(d)) { msg.textContent = 'La fecha no puede ser anterior a hoy.'; sel = ''; return; }
      var slots = D.slotsDia(fecha);
      if (!slots.length) { msg.textContent = 'El Lubricentro no atiende los domingos.'; sel = ''; return; }
      if (U.dow(fecha) === 6) msg.textContent = 'Los sábados se atiende solo por la mañana.';
      var perdido = false;
      slots.forEach(function (hora) {
        var libres = D.libres(d, fecha, hora, excludeId), full = libres <= 0, total = d.config.bahias || 2;
        if (full && sel === hora) { sel = ''; perdido = true; }
        var dots = h('span', { class: 'dots', 'aria-hidden': 'true' });
        for (var i = 0; i < total; i++) dots.appendChild(h('i', { class: i < total - libres ? 'on' : '' }));
        grid.appendChild(h('button', {
          type: 'button', class: 'slot-btn' + (sel === hora ? ' on' : '') + (full ? ' full' : ''), disabled: full, role: 'radio', 'aria-checked': sel === hora ? 'true' : 'false',
          onclick: function () { sel = hora; refresh(); api.changed('hora'); }
        }, h('b', null, hora), dots, h('span', { class: 'slot-state' }, full ? 'Completo' : libres === total ? 'Libre' : libres + ' lugar')));
      });
      if (perdido) { msg.textContent = 'El horario que habías elegido se ocupó. Elegí otro.'; msg.className = 'slots-msg warn'; }
    }
    var off = LG.Store.subscribe(function () { if (!document.body.contains(el)) { off(); return; } if (grid.children.length || api.get('fecha')) refresh(); });
    return { el: el, get: function () { return sel; }, set: function (v) { sel = v || ''; refresh(); }, refresh: refresh, focus: function () { var b = grid.querySelector('button:not([disabled])'); if (b) b.focus(); } };
  }

  function primerDiaAbierto(desde) { var f = desde; for (var i = 0; i < 7 && !D.slotsDia(f).length; i++) f = U.addDays(f, 1); return f; }

  F.turno = function (o) {
    o = o || {};
    var t = o.turno || null, me = LG.me(), esCli = me.rol === D.ROLES.CLI, d0 = db(), picker;
    var clienteId = t ? t.clienteId : esCli ? me.clienteId : (o.clienteId || '');
    var vals = { clienteId: clienteId, vehiculoId: t ? t.vehiculoId : (o.vehiculoId || ''), tipo: t ? t.tipo : (o.tipo || ''), fecha: t ? t.fecha : (o.fecha || primerDiaAbierto(D.hoy(d0))), hora: t ? t.hora : (o.hora || ''), observaciones: t ? t.observaciones : '', estado: t ? t.estado : 'Reservado' };
    var fields = [];
    if (!esCli) {
      fields.push(t ? { name: 'clienteId', label: 'Cliente', type: 'static' } : { name: 'clienteId', label: 'Cliente', type: 'select', required: true, options: F.clienteOpts(d0), placeholder: 'Seleccionar cliente…' });
    }
    fields.push(
      { name: 'vehiculoId', label: 'Vehículo', type: 'select', required: true, options: F.vehOpts(d0, clienteId), placeholder: 'Seleccionar vehículo…' },
      { name: 'tipo', label: 'Servicio', type: 'select', required: true, options: F.tipoOpts, placeholder: 'Seleccionar servicio…', span: esCli ? 2 : 1 },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, min: D.hoy(d0) },
      { name: 'hora', label: 'Horario', type: 'custom', required: true, span: 2, build: function (api, v) { picker = slotPicker(api, t ? t.id : null, v); return picker; } },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', span: 2, placeholder: 'Opcional' }
    );
    if (t && !esCli) fields.push({ name: 'estado', label: 'Estado del turno', type: 'select', options: F.opts(['Reservado', 'Confirmado']) });
    var form = UI.formModal({
      title: t ? 'Modificar turno' : 'Reservar turno', wide: true,
      intro: t ? null : 'Elegí el vehículo, el servicio y un horario libre. Hay ' + (d0.config.bahias || 2) + ' bahías de trabajo por horario.',
      values: vals, fields: fields, submitLabel: t ? 'Guardar cambios' : 'Reservar turno',
      onChange: function (name, api) {
        if (name === 'clienteId') { api.setOptions('vehiculoId', F.vehOpts(db(), api.get('clienteId')), false); }
        if (name === 'fecha' || name === null) { if (picker) picker.refresh(); }
        if (name === null && t && !esCli) api.set('clienteId', D.nombreCliente(D.cliente(db(), t.clienteId)));
      },
      submit: function (v) {
        v.vehiculoId = v.vehiculoId; if (esCli) v.clienteId = me.clienteId; else if (t) v.clienteId = t.clienteId;
        return LG.mutate(function (d, a) { return t ? D.modificarTurno(d, a, t.id, v) : D.registrarTurno(d, a, v); });
      },
      done: ok(function (r) { return (t ? 'Turno modificado: ' : 'Turno reservado: ') + F.turnoCuando(r); })
    });
    return form;
  };

  F.turnoDetalle = function (t) {
    var d = db(), me = LG.me(), cli = D.cliente(d, t.clienteId), veh = D.vehiculo(d, t.vehiculoId);
    var activoT = t.estado === 'Reservado' || t.estado === 'Confirmado';
    var m;
    var foot = [h('button', { class: 'btn ghost', type: 'button', onclick: function () { m.close(); } }, 'Cerrar')];
    if (me.rol === D.ROLES.MEC && activoT && t.fecha === D.hoy(d)) foot.push(h('button', { class: 'btn primary', type: 'button', onclick: function () { m.close(); F.servicio({ turno: t }); } }, UI.icon('wrench', 16), 'Registrar servicio'));
    if (D.can(me, 'turnos', 'u') && activoT && me.rol !== D.ROLES.CLI) {
      if (t.estado === 'Reservado') foot.push(h('button', { class: 'btn primary', type: 'button', onclick: function () { m.close(); LG.run(function (dd, a) { return D.confirmarTurno(dd, a, t.id); }, 'Turno confirmado'); } }, UI.icon('check', 16), 'Confirmar'));
      foot.push(h('button', { class: 'btn', type: 'button', onclick: function () { m.close(); F.turno({ turno: t }); } }, UI.icon('edit', 16), 'Modificar'));
    }
    if (D.can(me, 'turnos', 'd') && activoT) foot.push(h('button', { class: 'btn danger-ghost', type: 'button', onclick: function () { m.close(); F.suspenderTurno(t); } }, UI.icon('ban', 16), 'Suspender'));
    m = UI.modal({
      title: 'Turno ' + F.turnoCuando(t),
      body: UI.dl([
        ['Estado', UI.badge(t.estado)], ['Cliente', D.nombreCliente(cli)], ['Teléfono', cli ? cli.telefono : '—'],
        ['Vehículo', D.vehLabel(veh)], ['Servicio', D.nombreTipo(t.tipo)], ['Fecha y horario', U.fmtLarga(t.fecha) + ', ' + t.hora],
        ['Reservado por', t.origen === 'Cliente' ? 'el cliente (portal)' : 'Gerente Administrativa'], t.observaciones ? ['Observaciones', t.observaciones] : null
      ]),
      footer: foot
    });
    return m;
  };

  F.suspenderTurno = function (t) {
    var d = db(), cli = D.cliente(d, t.clienteId), veh = D.vehiculo(d, t.vehiculoId);
    return UI.confirm({
      title: 'Suspender turno', danger: true, okLabel: 'Suspender turno',
      text: 'El turno queda suspendido y el horario se libera para otros clientes.',
      detail: UI.dl([['Turno', F.turnoCuando(t)], ['Cliente', D.nombreCliente(cli)], ['Vehículo', D.vehLabel(veh)], ['Servicio', D.nombreTipo(t.tipo)]])
    }).then(function (si) { if (si) return LG.run(function (dd, a) { return D.suspenderTurno(dd, a, t.id); }, 'Turno suspendido'); });
  };

  /* ---------- Suspensiones de cliente / vehículo / stock / usuario / servicio ---------- */
  F.suspender = function (o) {
    return UI.confirm({ title: o.title, danger: true, okLabel: o.okLabel || 'Suspender', text: o.text, detail: o.detail })
      .then(function (si) { if (si) return LG.run(o.fn, o.okMsg); });
  };
  F.suspenderCliente = function (c) {
    return F.suspender({ title: 'Suspender cliente', okLabel: 'Suspender cliente', text: 'Primero revisá los datos del cliente. Al suspenderlo no se borra su historial, pero no podrá reservar turnos ni ingresar al portal.',
      detail: UI.dl([['Cliente', D.nombreCliente(c)], ['Teléfono', c.telefono], ['Email', c.email], ['Vehículos activos', String(db().vehiculos.filter(function (v) { return v.clienteId === c.id && activo(v); }).length)]]),
      fn: function (d, a) { return D.suspenderCliente(d, a, c.id); }, okMsg: 'Cliente suspendido: ' + D.nombreCliente(c) });
  };
  F.suspenderVehiculo = function (v) {
    return F.suspender({ title: 'Suspender vehículo', okLabel: 'Suspender vehículo', text: 'Revisá los datos del vehículo. Su historial de servicios se conserva.',
      detail: UI.dl([['Vehículo', D.vehLabel(v)], ['Año', String(v.anio)], ['Propietario', D.nombreCliente(D.cliente(db(), v.clienteId))]]),
      fn: function (d, a) { return D.suspenderVehiculo(d, a, v.id); }, okMsg: 'Vehículo suspendido: ' + v.patente });
  };
  F.suspenderStock = function (it) {
    return F.suspender({ title: 'Suspender ítem de stock', okLabel: 'Suspender ítem', text: 'El ítem deja de poder usarse en nuevos servicios.',
      detail: UI.dl([['Ítem', it.nombre], ['Tipo', it.tipo], ['Existencia', U.num(it.cantidad) + ' ' + it.unidad]]),
      fn: function (d, a) { return D.suspenderStock(d, a, it.id); }, okMsg: 'Ítem suspendido: ' + it.nombre });
  };
  F.suspenderUsuario = function (u) {
    return F.suspender({ title: 'Suspender usuario', okLabel: 'Suspender usuario', text: 'La persona no podrá volver a iniciar sesión hasta que se reactive.',
      detail: UI.dl([['Usuario', u.usuario], ['Rol', u.rol]]),
      fn: function (d, a) { return D.suspenderUsuario(d, a, u.id); }, okMsg: 'Usuario suspendido: ' + u.usuario });
  };
  F.suspenderServicio = function (s) {
    var d = db();
    return F.suspender({ title: 'Suspender servicio', okLabel: 'Suspender servicio', text: 'Los insumos usados vuelven al stock. Un servicio cobrado no puede suspenderse.',
      detail: UI.dl([['Servicio', D.nombreTipo(s.tipo)], ['Vehículo', D.vehLabel(D.vehiculo(d, s.vehiculoId))], ['Fecha', U.fmt(s.fecha)], ['Total', U.money(s.total)]]),
      fn: function (dd, a) { return D.suspenderServicio(dd, a, s.id); }, okMsg: 'Servicio suspendido' });
  };

  /* ---------- Stock ---------- */
  F.stock = function (it) {
    return UI.formModal({
      title: it ? 'Modificar ítem de stock' : 'Registrar ítem de stock', values: it || { unidad: 'unidad' }, submitLabel: it ? 'Guardar cambios' : 'Registrar ítem',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true, span: 2, maxlength: 60 },
        { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: F.opts(D.TIPOS_STOCK) },
        { name: 'unidad', label: 'Unidad', type: 'select', required: true, options: F.opts(D.UNIDADES) },
        { name: 'cantidad', label: 'Cantidad disponible', type: 'number', required: true, min: 0, step: 'any', inputmode: 'decimal' },
        { name: 'minimo', label: 'Stock mínimo', type: 'number', required: true, min: 0, step: 'any', inputmode: 'decimal', hint: 'Por debajo de este valor se avisa' },
        { name: 'precio', label: 'Precio unitario ($)', type: 'number', required: true, min: 0, step: 'any', inputmode: 'decimal' }
      ],
      submit: function (v) { return LG.mutate(function (d, a) { return it ? D.modificarStock(d, a, it.id, v) : D.registrarStock(d, a, v); }); },
      done: ok(function (r) { return (it ? 'Ítem modificado: ' : 'Ítem registrado: ') + r.nombre; })
    });
  };

  /* ---------- Usuarios ---------- */
  F.usuario = function (u) {
    var d0 = db();
    var libres = d0.clientes.filter(function (c) { return activo(c) && (!d0.usuarios.some(function (x) { return x.clienteId === c.id && (!u || x.id !== u.id); })); }).sort(porApellido).map(function (c) { return { value: c.id, label: D.nombreCliente(c) }; });
    return UI.formModal({
      title: u ? 'Modificar usuario' : 'Registrar usuario', values: u ? { usuario: u.usuario, rol: u.rol, clienteId: u.clienteId || '', clave: '' } : { rol: '' }, submitLabel: u ? 'Guardar cambios' : 'Registrar usuario',
      fields: [
        { name: 'usuario', label: 'Nombre de usuario', required: true, maxlength: 20, hint: 'Letras, números, punto o guion' },
        { name: 'rol', label: 'Rol', type: 'select', required: true, options: F.opts(Object.keys(D.ROLES).map(function (k) { return D.ROLES[k]; })), placeholder: 'Seleccionar rol…' },
        { name: 'clienteId', label: 'Cliente asociado', type: 'select', required: true, options: libres, placeholder: 'Seleccionar cliente…', span: 2, hidden: true, hint: 'Solo clientes activos sin usuario' },
        { name: 'clave', label: u ? 'Contraseña nueva' : 'Contraseña', type: 'password', required: !u, span: 2, hint: u ? 'Dejá vacío para no cambiarla' : 'Mínimo 8 caracteres, con letras y números', maxlength: 40 }
      ],
      onChange: function (name, api) { if (name === 'rol' || name === null) api.show('clienteId', api.get('rol') === D.ROLES.CLI); },
      submit: function (v) { return LG.mutate(function (d, a) { return u ? D.modificarUsuario(d, a, u.id, v) : D.registrarUsuario(d, a, v); }); },
      done: ok(function (r) { return (u ? 'Usuario modificado: ' : 'Usuario registrado: ') + r.usuario; })
    });
  };

  /* ---------- Servicios ---------- */
  function insumosEditor(api, servicioPrevio) {
    var rows = h('div', { class: 'ins-rows' }), err = h('div', { class: 'ins-msg' });
    var el = h('div', { class: 'ins' }, rows, err);
    var previos = servicioPrevio ? servicioPrevio.insumos : [];
    var dirty = false;
    function opciones(sel) {
      var d = db();
      return d.stock.filter(function (it) { return activo(it) || it.id === sel; }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).map(function (it) {
        var prev = previos.find(function (p) { return p.stockId === it.id; });
        var disp = Number(it.cantidad) + (prev ? prev.cantidad : 0);
        return h('option', { value: it.id }, it.nombre + ' — disp. ' + U.num(disp) + ' ' + it.unidad + ' · ' + U.money(it.precio));
      });
    }
    function addRow(stockId, cant) {
      var sel = h('select', { 'aria-label': 'Insumo', onchange: touch }, h('option', { value: '' }, 'Seleccionar insumo…'), opciones(stockId));
      sel.value = stockId ? String(stockId) : '';
      var qty = h('input', { type: 'number', min: '0', step: 'any', inputmode: 'decimal', 'aria-label': 'Cantidad', placeholder: 'Cant.', oninput: touch });
      qty.value = cant != null ? cant : '';
      var unit = h('span', { class: 'ins-unit' });
      function unitLabel() { var it = D.item(db(), Number(sel.value)); unit.textContent = it ? it.unidad : ''; }
      sel.addEventListener('change', unitLabel); unitLabel();
      var row = h('div', { class: 'ins-row' }, sel, qty, unit, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Quitar insumo', onclick: function () { rows.removeChild(row); touch(); } }, UI.icon('x', 16)));
      row._get = function () { return { stockId: sel.value, cantidad: qty.value }; };
      rows.appendChild(row);
    }
    function touch() { dirty = true; err.textContent = ''; api.changed('insumos'); }
    var add = h('button', { class: 'btn sm ghost', type: 'button', onclick: function () { addRow(); dirty = true; } }, UI.icon('plus', 15), 'Agregar insumo');
    el.appendChild(add);
    return {
      el: el,
      get: function () { return Array.prototype.map.call(rows.children, function (r) { return r._get(); }); },
      set: function (list) { rows.innerHTML = ''; (list || []).forEach(function (i) { addRow(i.stockId, i.cantidad); }); },
      suggest: function (tipoId) {
        if (dirty) return;
        var tipo = D.tipoServ(tipoId), d = db();
        rows.innerHTML = '';
        (tipo ? tipo.insumos : []).forEach(function (i) { var it = d.stock.find(function (s) { return s.nombre === i[0] && activo(s); }); if (it) addRow(it.id, i[1]); });
      },
      setError: function (m) { err.textContent = m; },
      focus: function () { var s = rows.querySelector('select, input'); if (s) s.focus(); else add.focus(); },
      markClean: function () { dirty = false; }
    };
  }

  F.servicio = function (o) {
    o = o || {};
    var s = o.servicio || null, d0 = db(), editor, resumen = h('div', { class: 'resumen', 'aria-live': 'polite' });
    var turno = o.turno || null;
    var hoy = D.hoy(d0);
    var turnosHoy = d0.turnos.filter(function (t) { return (t.estado === 'Reservado' || t.estado === 'Confirmado') && t.fecha === hoy; }).sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });
    var vehOptsAll = d0.vehiculos.filter(function (v) { var c = D.cliente(d0, v.clienteId); return activo(v) && c && activo(c); })
      .map(function (v) { return { value: v.id, label: v.patente + ' — ' + v.marca + ' ' + v.modelo + ' (' + D.nombreCliente(D.cliente(d0, v.clienteId)) + ')' }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
    var vals = s ? { vehiculoId: s.vehiculoId, fecha: s.fecha, tipo: s.tipo, km: s.km, observaciones: s.observaciones }
      : { turnoId: turno ? turno.id : '', vehiculoId: turno ? turno.vehiculoId : (o.vehiculoId || ''), fecha: hoy, tipo: turno ? turno.tipo : '', km: '', observaciones: '' };
    var fields = [];
    if (s) fields.push({ name: 'vehiculoId', label: 'Vehículo', type: 'static', span: 2 });
    else {
      fields.push({ name: 'turnoId', label: 'Turno de hoy (opcional)', type: 'select', span: 2, placeholder: 'Sin turno — elegir el vehículo abajo',
        options: turnosHoy.map(function (t) { return { value: t.id, label: t.hora + ' · ' + D.vehLabel(D.vehiculo(d0, t.vehiculoId)) + ' · ' + D.nombreTipo(t.tipo) }; }), hint: 'Al registrar el servicio, el turno pasa a Realizado' });
      fields.push({ name: 'vehiculoId', label: 'Vehículo', type: 'select', required: true, span: 2, options: vehOptsAll, placeholder: 'Seleccionar vehículo…' });
    }
    fields.push(
      { name: 'tipo', label: 'Servicio', type: 'select', required: true, options: F.tipoOpts, placeholder: 'Seleccionar servicio…' },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true, max: hoy },
      { name: 'km', label: 'Kilometraje', type: 'number', required: true, min: 0, inputmode: 'numeric', placeholder: 'Ej.: 52300' },
      { name: 'resumen', label: 'Costo', type: 'custom', build: function () { return { el: resumen, get: function () { return null; } }; } },
      { name: 'insumos', label: 'Insumos utilizados', type: 'custom', span: 2, hint: 'Se descuentan del stock al registrar', build: function (api) { editor = insumosEditor(api, s); return editor; } },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', span: 2, placeholder: 'Opcional', maxlength: 300 }
    );
    function actualizarResumen(api) {
      var tipo = D.tipoServ(api.get('tipo')), d = db(), subtotal = 0;
      editor.get().forEach(function (i) { var it = D.item(d, Number(i.stockId)); if (it && Number(i.cantidad) > 0) subtotal += it.precio * Number(i.cantidad); });
      var mo = tipo ? tipo.manoObra : 0, fecha = api.get('fecha');
      resumen.innerHTML = '';
      resumen.appendChild(UI.dl([['Mano de obra', U.money(mo)], ['Insumos', U.money(subtotal)], ['Total', h('b', null, U.money(mo + subtotal))],
        tipo && fecha ? ['Próximo servicio', U.fmt(U.addDays(fecha, tipo.dias)) + ' (en ' + tipo.dias + ' días)'] : null]));
    }
    var form = UI.formModal({
      title: s ? 'Modificar servicio' : 'Registrar servicio', wide: true, values: vals, fields: fields, submitLabel: s ? 'Guardar cambios' : 'Registrar servicio',
      intro: s ? null : 'Registrá lo que se hizo. Al guardar se descuentan los insumos del stock y queda pendiente de cobro.',
      onChange: function (name, api) {
        if (name === null && s) { api.set('vehiculoId', D.vehLabel(D.vehiculo(db(), s.vehiculoId)) + ' · ' + D.nombreCliente(D.cliente(db(), s.clienteId))); }
        if (name === 'turnoId') {
          var t = D.turno(db(), Number(api.get('turnoId')));
          if (t) { api.set('vehiculoId', t.vehiculoId); api.set('tipo', t.tipo); editor.markClean(); editor.suggest(t.tipo); }
        }
        if (name === 'tipo') editor.suggest(api.get('tipo'));
        if (name === null) { if (s) editor.set(s.insumos); else editor.suggest(api.get('tipo')); }
        actualizarResumen(api);
      },
      submit: function (v) {
        return LG.mutate(function (d, a) { return s ? D.modificarServicio(d, a, s.id, v) : D.registrarServicio(d, a, v); });
      },
      done: ok(function (r) { return s ? 'Servicio modificado' : 'Servicio registrado — pendiente de cobro. Próximo servicio: ' + U.fmt(r.proximaFecha); })
    });
    return form;
  };

  F.servicioDetalle = function (s) {
    var d = db(), me = LG.me(), veh = D.vehiculo(d, s.vehiculoId), cli = D.cliente(d, s.clienteId), mec = D.usuario(d, s.mecanicoId);
    var m;
    var ins = s.insumos.length ? UI.table({ cols: [
      { label: 'Insumo', render: function (i) { return i.nombre; } },
      { label: 'Cantidad', cls: 'num', render: function (i) { return U.num(i.cantidad) + ' ' + i.unidad; } },
      { label: 'Precio', cls: 'num', render: function (i) { return U.money(i.precio); } },
      { label: 'Importe', cls: 'num', render: function (i) { return U.money(i.precio * i.cantidad); } }], rows: s.insumos }) : h('p', { class: 'muted' }, 'Sin insumos.');
    var foot = [h('button', { class: 'btn ghost', type: 'button', onclick: function () { m.close(); } }, 'Cerrar')];
    if (s.estado === 'Cobrado') foot.push(h('button', { class: 'btn', type: 'button', onclick: function () { m.close(); F.comprobante(s); } }, UI.icon('receipt', 16), 'Ver comprobante'));
    if (D.can(me, 'servicios', 'k') && s.estado === 'Finalizado') foot.push(h('button', { class: 'btn primary', type: 'button', onclick: function () { m.close(); F.cobrar(s); } }, UI.icon('dollar', 16), 'Cobrar'));
    m = UI.modal({
      title: D.nombreTipo(s.tipo), wide: true, footer: foot,
      body: [UI.dl([
        ['Estado', UI.badge(s.estado, s.estado === 'Finalizado' ? 'Finalizado · pendiente de cobro' : null)], ['Vehículo', D.vehLabel(veh)], me.rol === D.ROLES.CLI ? null : ['Cliente', D.nombreCliente(cli)],
        ['Fecha', U.fmtLarga(s.fecha)], ['Kilometraje', U.num(s.km) + ' km'], ['Registrado por', mec ? F.nombreUsuario(d, mec) : '—'],
        ['Próximo servicio', U.fmt(s.proximaFecha)], s.observaciones ? ['Observaciones', s.observaciones] : null]),
        h('h4', { class: 'sub' }, 'Detalle'), ins,
        UI.dl([['Mano de obra', U.money(s.manoObra)], ['Total', h('b', null, U.money(s.total))], s.cobro ? ['Cobro', s.cobro.medio + ' · ' + U.fmt(s.cobro.fecha) + ' · ' + s.cobro.comprobante] : null])]
    });
    return m;
  };

  F.cobrar = function (s) {
    var d = db(), veh = D.vehiculo(d, s.vehiculoId), cli = D.cliente(d, s.clienteId);
    UI.formModal({
      title: 'Cobrar servicio', values: { medio: '' }, submitLabel: 'Confirmar cobro',
      intro: 'Revisá el detalle y elegí cómo paga el cliente. Se genera un comprobante.',
      fields: [
        { name: 'resumen', type: 'custom', span: 2, build: function () { return { get: function () { return null; }, el: UI.dl([['Cliente', D.nombreCliente(cli)], ['Vehículo', D.vehLabel(veh)], ['Servicio', D.nombreTipo(s.tipo) + ' (' + U.fmt(s.fecha) + ')'], ['Total a cobrar', h('b', { class: 'big' }, U.money(s.total))]]) }; } },
        { name: 'medio', label: 'Medio de pago', type: 'select', required: true, span: 2, options: F.opts(D.MEDIOS_PAGO), placeholder: 'Seleccionar medio de pago…' }
      ],
      submit: function (v) { return LG.mutate(function (dd, a) { return D.cobrarServicio(dd, a, s.id, v); }); },
      done: function (r) { UI.toast('Cobro registrado: ' + r.cobro.comprobante); F.comprobante(r); }
    });
  };

  F.comprobante = function (s0) {
    var d = db(), s = D.servicio(d, s0.id) || s0, veh = D.vehiculo(d, s.vehiculoId), cli = D.cliente(d, s.clienteId), cb = s.cobro;
    if (!cb) return;
    var lineas = [['Mano de obra — ' + D.nombreTipo(s.tipo), '', '', U.money(s.manoObra)]].concat(s.insumos.map(function (i) { return [i.nombre, U.num(i.cantidad) + ' ' + i.unidad, U.money(i.precio), U.money(i.precio * i.cantidad)]; }));
    var cobr = D.usuario(d, cb.cobradoPor);
    var rec = h('div', { class: 'receipt' },
      h('div', { class: 'rc-head' }, h('div', { class: 'rc-brand' }, 'LubriGest'), h('div', { class: 'rc-sub' }, 'Lubricentro · Concordia, Entre Ríos')),
      h('div', { class: 'rc-title' }, h('span', null, 'Comprobante'), h('b', null, cb.comprobante)),
      UI.dl([['Fecha de cobro', U.fmt(cb.fecha)], ['Cliente', D.nombreCliente(cli)], ['Vehículo', D.vehLabel(veh)], ['Servicio', D.nombreTipo(s.tipo) + ' · ' + U.fmt(s.fecha) + ' · ' + U.num(s.km) + ' km']]),
      h('table', { class: 'rc-tbl' },
        h('thead', null, h('tr', null, h('th', null, 'Concepto'), h('th', { class: 'num' }, 'Cant.'), h('th', { class: 'num' }, 'Precio'), h('th', { class: 'num' }, 'Importe'))),
        h('tbody', null, lineas.map(function (l) { return h('tr', null, h('td', null, l[0]), h('td', { class: 'num' }, l[1]), h('td', { class: 'num' }, l[2]), h('td', { class: 'num' }, l[3])); })),
        h('tfoot', null, h('tr', null, h('td', { colspan: '3' }, 'Total'), h('td', { class: 'num' }, U.money(cb.monto))))),
      h('div', { class: 'rc-pay' }, 'Pagó con ', h('b', null, cb.medio), ' · cobrado por ', F.nombreUsuario(d, cobr)),
      h('div', { class: 'rc-note' }, 'Comprobante de uso interno. No válido como factura.'));
    var m = UI.modal({
      title: 'Comprobante ' + cb.comprobante, cls: 'receipt-modal', body: rec,
      footer: [h('button', { class: 'btn ghost', type: 'button', onclick: function () { m.close(); } }, 'Cerrar'),
        h('button', { class: 'btn primary', type: 'button', onclick: function () { root.print(); } }, UI.icon('print', 16), 'Imprimir')]
    });
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
