/* LubriGest demo — reglas de negocio (RF01–RF24, Cobrar Servicio, Recibir Alertas, Iniciar Sesión).
   Todas las operaciones reciben el "db" a modificar y el usuario que actúa; validan y lanzan errores. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U;
  var D = (LG.D = {});

  /* ---------- Constantes ---------- */
  D.ROLES = { CEO: 'CEO', GA: 'Gerente Administrativa', MEC: 'Mecánicos', CLI: 'Cliente' };
  D.ROL_KEY = { 'CEO': 'CEO', 'Gerente Administrativa': 'GA', 'Mecánicos': 'MEC', 'Cliente': 'CLI' };

  D.TIPOS_SERVICIO = [
    { id: 'aceite', nombre: 'Cambio de aceite y filtro', manoObra: 12000, dias: 180, insumos: [['Aceite 10W-40 semisintético', 4], ['Filtro de aceite', 1]] },
    { id: 'filtros', nombre: 'Cambio de filtros de aire y habitáculo', manoObra: 9000, dias: 180, insumos: [['Filtro de aire', 1], ['Filtro de habitáculo', 1]] },
    { id: 'alineacion', nombre: 'Alineación y balanceo', manoObra: 28000, dias: 180, insumos: [] },
    { id: 'frenos', nombre: 'Cambio de líquido de frenos', manoObra: 15000, dias: 365, insumos: [['Líquido de frenos DOT 4', 1]] },
    { id: 'refrigerante', nombre: 'Cambio de refrigerante', manoObra: 14000, dias: 365, insumos: [['Refrigerante orgánico', 5]] },
    { id: 'engrase', nombre: 'Engrase general', manoObra: 8000, dias: 90, insumos: [['Grasa multipropósito', 1]] },
    { id: 'revision', nombre: 'Revisión general', manoObra: 10000, dias: 180, insumos: [] }
  ];
  D.UNIDADES = ['unidad', 'litros', 'kg'];
  D.TIPOS_STOCK = ['Lubricante', 'Filtro', 'Fluido', 'Repuesto', 'Producto'];
  D.MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Tarjeta de crédito'];

  var SLOTS_MANANA = ['08:00', '08:45', '09:30', '10:15', '11:00', '11:45'];
  var SLOTS_TARDE = ['15:00', '15:45', '16:30', '17:15', '18:00'];
  D.slotsDia = function (fecha) {
    var w = U.dow(fecha);
    if (w === 0) return [];
    if (w === 6) return SLOTS_MANANA.slice();
    return SLOTS_MANANA.concat(SLOTS_TARDE);
  };

  /* Permisos por rol: c=registrar, r=consultar, u=modificar, d=suspender, k=cobrar */
  D.PERM = {
    clientes: { GA: 'crud', CEO: 'r' },
    vehiculos: { GA: 'crud', CEO: 'r' },
    turnos: { GA: 'crud', CEO: 'r', CLI: 'crud' },
    servicios: { GA: 'rudk', MEC: 'c', CEO: 'r', CLI: 'r' },
    stock: { GA: 'crud', MEC: 'r', CEO: 'r' },
    usuarios: { CEO: 'crud' }
  };
  D.can = function (user, ent, acc) {
    if (!user) return false;
    var p = (D.PERM[ent] || {})[D.ROL_KEY[user.rol]] || '';
    return p.indexOf(acc) >= 0;
  };

  /* ---------- Errores ---------- */
  function Validacion(errores, mensaje) {
    this.name = 'Validacion';
    this.errores = errores || {};
    this.message = mensaje || 'Hay datos para corregir.';
  }
  Validacion.prototype = Object.create(Error.prototype);
  D.Validacion = Validacion;
  function falla(msg, campo) { var e = {}; if (campo) e[campo] = msg; throw new Validacion(e, msg); }
  function fallaSi(errores) { if (Object.keys(errores).length) throw new Validacion(errores); }
  D.exigir = function (user, ent, acc) {
    if (!D.can(user, ent, acc)) { var e = new Error('Tu rol no tiene permiso para esta operación.'); e.name = 'Permiso'; throw e; }
  };

  /* ---------- Consultas básicas ---------- */
  D.hoy = function (db) { return U.addDays(U.realToday(), (db.config && db.config.offset) || 0); };
  var byId = function (col) { return function (db, id) { return db[col].find(function (x) { return x.id === id; }) || null; }; };
  D.cliente = byId('clientes');
  D.vehiculo = byId('vehiculos');
  D.turno = byId('turnos');
  D.servicio = byId('servicios');
  D.item = byId('stock');
  D.usuario = byId('usuarios');
  D.tipoServ = function (id) { return D.TIPOS_SERVICIO.find(function (t) { return t.id === id; }) || null; };
  D.nombreTipo = function (id) { var t = D.tipoServ(id); return t ? t.nombre : id; };
  D.nombreCliente = function (c) { return c ? c.apellido + ', ' + c.nombre : '—'; };
  D.vehLabel = function (v) { return v ? v.marca + ' ' + v.modelo + ' — ' + v.patente : '—'; };
  D.stockBajo = function (it) { return it.estado === 'Activo' && Number(it.cantidad) < Number(it.minimo); };
  D.nombreUsuario = function (db, id) { var u = D.usuario(db, id); return u ? u.usuario : '—'; };

  var ACTIVO = function (t) { return t.estado === 'Reservado' || t.estado === 'Confirmado'; };
  D.turnosActivos = function (db) { return db.turnos.filter(ACTIVO); };
  // un turno ya realizado sigue ocupando su bahía en ese horario; solo se libera si se suspende
  D.ocupacion = function (db, fecha, hora, excluirId) {
    return db.turnos.filter(function (t) { return t.estado !== 'Suspendido' && t.fecha === fecha && t.hora === hora && t.id !== excluirId; }).length;
  };
  D.libres = function (db, fecha, hora, excluirId) { return (db.config.bahias || 2) - D.ocupacion(db, fecha, hora, excluirId); };

  D.totalServicio = function (s) {
    return Number(s.manoObra || 0) + (s.insumos || []).reduce(function (a, i) { return a + i.cantidad * i.precio; }, 0);
  };

  /* ---------- Eventos (campanita de actividad) ---------- */
  D.evento = function (db, e) {
    var id = U.next(db, 'eventos');
    db.eventos.unshift({ id: id, ts: Date.now(), tipo: e.tipo, texto: e.texto, roles: e.roles, clienteId: e.clienteId || null, autor: e.autor || null, ruta: e.ruta || null });
    if (db.eventos.length > 60) db.eventos.length = 60;
  };
  D.visible = function (ev, user) {
    if (!user || ev.roles.indexOf(user.rol) < 0) return false;
    if (user.rol === D.ROLES.CLI && ev.clienteId != null && ev.clienteId !== user.clienteId) return false;
    return true;
  };

  /* ---------- Validadores ---------- */
  var T = function (s) { return String(s == null ? '' : s).trim(); };
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RE_TEL = /^\+?[\d\s\-()]{7,18}$/;
  var RE_PATENTE = /^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3})$/;
  var OBL = 'Campo obligatorio';

  function vCliente(db, d, idActual) {
    var e = {};
    if (!T(d.nombre)) e.nombre = OBL;
    if (!T(d.apellido)) e.apellido = OBL;
    if (!T(d.telefono)) e.telefono = OBL; else if (!RE_TEL.test(T(d.telefono)) || U.digits(d.telefono).length < 7) e.telefono = 'Teléfono con formato incorrecto';
    if (!T(d.email)) e.email = OBL; else if (!RE_EMAIL.test(T(d.email))) e.email = 'Email con formato incorrecto';
    if (!T(d.direccion)) e.direccion = OBL;
    db.clientes.forEach(function (c) {
      if (c.id === idActual) return;
      if (!e.telefono && U.digits(c.telefono) === U.digits(d.telefono)) e.telefono = 'Ya existe un cliente con ese teléfono (' + D.nombreCliente(c) + ')';
      if (!e.email && c.email.toLowerCase() === T(d.email).toLowerCase()) e.email = 'Ya existe un cliente con ese email (' + D.nombreCliente(c) + ')';
    });
    return e;
  }
  function vVehiculo(db, d, idActual) {
    var e = {};
    var cli = D.cliente(db, d.clienteId);
    if (!cli) e.clienteId = 'Seleccionar el cliente propietario'; else if (cli.estado !== 'Activo') e.clienteId = 'El cliente está suspendido';
    var pat = T(d.patente).toUpperCase().replace(/\s+/g, '');
    if (!pat) e.patente = OBL; else if (!RE_PATENTE.test(pat)) e.patente = 'Formato esperado: AB123CD o ABC123';
    if (!T(d.marca)) e.marca = OBL;
    if (!T(d.modelo)) e.modelo = OBL;
    var anio = Number(d.anio);
    var max = new Date().getFullYear() + 1;
    if (!String(d.anio).trim()) e.anio = OBL; else if (!Number.isInteger(anio) || anio < 1960 || anio > max) e.anio = 'Año entre 1960 y ' + max;
    if (!e.patente) db.vehiculos.forEach(function (v) {
      if (v.id !== idActual && v.patente === pat) e.patente = 'Ya existe un vehículo con esa patente (' + D.vehLabel(v) + ')';
    });
    return e;
  }
  function vTurno(db, d, idActual) {
    var e = {};
    var cli = D.cliente(db, d.clienteId);
    if (!cli) e.clienteId = 'Seleccionar el cliente'; else if (cli.estado !== 'Activo') e.clienteId = 'El cliente está suspendido';
    var veh = D.vehiculo(db, d.vehiculoId);
    if (!veh) e.vehiculoId = 'Seleccionar el vehículo';
    else if (cli && veh.clienteId !== cli.id) e.vehiculoId = 'El vehículo no pertenece al cliente';
    else if (veh.estado !== 'Activo') e.vehiculoId = 'El vehículo está suspendido';
    if (!D.tipoServ(d.tipo)) e.tipo = 'Seleccionar el tipo de servicio';
    if (!d.fecha) e.fecha = OBL;
    else if (d.fecha < D.hoy(db)) e.fecha = 'La fecha no puede ser anterior a hoy';
    else if (U.dow(d.fecha) === 0) e.fecha = 'El Lubricentro no atiende los domingos';
    if (!d.hora) e.hora = 'Seleccionar un horario';
    else if (!e.fecha) {
      if (D.slotsDia(d.fecha).indexOf(d.hora) < 0) e.hora = 'Horario fuera de atención';
      else if (D.libres(db, d.fecha, d.hora, idActual) <= 0) e.hora = 'El horario ya no está disponible, elegir otro';
    }
    return e;
  }
  function limpiarInsumos(list) {
    return (list || []).filter(function (i) { return i && (i.stockId || i.cantidad); });
  }
  /* devuelve {errores, insumos normalizados}; "previos" = insumos ya descontados por este servicio (modificación) */
  function vInsumos(db, list, previos) {
    var out = [], err = null, vistos = {};
    limpiarInsumos(list).forEach(function (i) {
      if (err) return;
      var it = D.item(db, Number(i.stockId));
      var cant = Number(i.cantidad);
      if (!it) { err = 'Seleccionar el insumo en todas las filas'; return; }
      if (vistos[it.id]) { err = 'El insumo "' + it.nombre + '" está repetido'; return; }
      vistos[it.id] = true;
      if (it.estado !== 'Activo') { err = 'El insumo "' + it.nombre + '" está suspendido'; return; }
      if (!(cant > 0)) { err = 'Cantidad inválida para "' + it.nombre + '"'; return; }
      var prev = (previos || []).find(function (p) { return p.stockId === it.id; });
      var disp = Number(it.cantidad) + (prev ? prev.cantidad : 0);
      if (cant > disp) { err = 'Stock insuficiente de "' + it.nombre + '": disponible ' + U.num(disp) + ' ' + it.unidad; return; }
      out.push({ stockId: it.id, nombre: it.nombre, unidad: it.unidad, cantidad: cant, precio: it.precio });
    });
    return { error: err, insumos: out };
  }
  function vServicio(db, d, previos) {
    var e = {};
    var veh = D.vehiculo(db, d.vehiculoId);
    if (!veh) e.vehiculoId = 'El vehículo no está registrado. Solicitar su registro a la Gerente Administrativa';
    else if (veh.estado !== 'Activo') e.vehiculoId = 'El vehículo está suspendido';
    if (!d.fecha) e.fecha = OBL; else if (d.fecha > D.hoy(db)) e.fecha = 'La fecha no puede ser futura';
    if (!D.tipoServ(d.tipo)) e.tipo = 'Seleccionar el tipo de servicio';
    var km = Number(d.km);
    if (String(d.km).trim() === '') e.km = OBL; else if (!Number.isFinite(km) || km < 0 || km > 2000000) e.km = 'Kilometraje inválido';
    var r = vInsumos(db, d.insumos, previos);
    if (r.error) e.insumos = r.error;
    return { errores: e, insumos: r.insumos };
  }
  function vStock(db, d, idActual) {
    var e = {};
    if (!T(d.nombre)) e.nombre = OBL;
    if (D.TIPOS_STOCK.indexOf(d.tipo) < 0) e.tipo = 'Seleccionar el tipo';
    if (D.UNIDADES.indexOf(d.unidad) < 0) e.unidad = 'Seleccionar la unidad';
    var nn = function (v) { return String(v).trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0; };
    if (String(d.cantidad).trim() === '') e.cantidad = OBL; else if (!nn(d.cantidad)) e.cantidad = 'Número no negativo';
    if (String(d.minimo).trim() === '') e.minimo = OBL; else if (!nn(d.minimo)) e.minimo = 'Número no negativo';
    if (String(d.precio).trim() === '') e.precio = OBL; else if (!nn(d.precio)) e.precio = 'Número no negativo';
    if (!e.nombre && !e.tipo) db.stock.forEach(function (s) {
      if (s.id !== idActual && U.norm(s.nombre) === U.norm(d.nombre) && s.tipo === d.tipo) e.nombre = 'Ya existe un ítem con el mismo nombre y tipo';
    });
    return e;
  }
  function vClave(clave) {
    if (String(clave).length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return 'Mínimo 8 caracteres, con letras y números';
    return null;
  }
  function vUsuario(db, d, idActual, claveObligatoria) {
    var e = {};
    var nom = T(d.usuario).toLowerCase();
    if (!nom) e.usuario = OBL; else if (!/^[a-z0-9._-]{3,20}$/.test(nom)) e.usuario = '3 a 20 caracteres: letras, números, punto, guion';
    else if (db.usuarios.some(function (u) { return u.id !== idActual && u.usuario === nom; })) e.usuario = 'El nombre de usuario ya existe';
    if (claveObligatoria || String(d.clave || '') !== '') {
      if (!String(d.clave || '')) e.clave = OBL; else { var m = vClave(d.clave); if (m) e.clave = m; }
    }
    if (Object.keys(D.ROLES).map(function (k) { return D.ROLES[k]; }).indexOf(d.rol) < 0) e.rol = 'Seleccionar el rol';
    if (d.rol === D.ROLES.CLI) {
      var cli = D.cliente(db, Number(d.clienteId));
      if (!cli) e.clienteId = 'Seleccionar el cliente asociado';
      else if (cli.estado !== 'Activo') e.clienteId = 'El cliente está suspendido';
      else if (db.usuarios.some(function (u) { return u.id !== idActual && u.clienteId === cli.id; })) e.clienteId = 'El cliente ya tiene un usuario asociado';
    }
    return e;
  }

  /* ---------- Clientes ---------- */
  D.registrarCliente = function (db, actor, d) {
    D.exigir(actor, 'clientes', 'c');
    fallaSi(vCliente(db, d, null));
    var c = { id: U.next(db, 'clientes'), nombre: T(d.nombre), apellido: T(d.apellido), telefono: T(d.telefono), email: T(d.email).toLowerCase(), direccion: T(d.direccion), estado: 'Activo' };
    db.clientes.push(c);
    return c;
  };
  D.modificarCliente = function (db, actor, id, d) {
    D.exigir(actor, 'clientes', 'u');
    var c = D.cliente(db, id);
    if (!c) falla('El cliente no existe.');
    if (c.estado !== 'Activo') falla('El cliente está suspendido y no puede modificarse.');
    fallaSi(vCliente(db, d, id));
    c.nombre = T(d.nombre); c.apellido = T(d.apellido); c.telefono = T(d.telefono); c.email = T(d.email).toLowerCase(); c.direccion = T(d.direccion);
    return c;
  };
  D.suspenderCliente = function (db, actor, id) {
    D.exigir(actor, 'clientes', 'd');
    var c = D.cliente(db, id);
    if (!c) falla('El cliente no existe.');
    if (c.estado !== 'Activo') falla('El cliente ya se encuentra suspendido, la operación no es necesaria.');
    c.estado = 'Suspendido';
    return c;
  };

  /* ---------- Vehículos ---------- */
  D.registrarVehiculo = function (db, actor, d) {
    D.exigir(actor, 'vehiculos', 'c');
    d.clienteId = Number(d.clienteId);
    fallaSi(vVehiculo(db, d, null));
    var v = { id: U.next(db, 'vehiculos'), clienteId: d.clienteId, patente: T(d.patente).toUpperCase().replace(/\s+/g, ''), marca: T(d.marca), modelo: T(d.modelo), anio: Number(d.anio), estado: 'Activo' };
    db.vehiculos.push(v);
    return v;
  };
  D.modificarVehiculo = function (db, actor, id, d) {
    D.exigir(actor, 'vehiculos', 'u');
    var v = D.vehiculo(db, id);
    if (!v) falla('El vehículo no existe.');
    if (v.estado !== 'Activo') falla('El vehículo está suspendido y no puede modificarse.');
    d.clienteId = v.clienteId;
    fallaSi(vVehiculo(db, d, id));
    v.patente = T(d.patente).toUpperCase().replace(/\s+/g, ''); v.marca = T(d.marca); v.modelo = T(d.modelo); v.anio = Number(d.anio);
    return v;
  };
  D.suspenderVehiculo = function (db, actor, id) {
    D.exigir(actor, 'vehiculos', 'd');
    var v = D.vehiculo(db, id);
    if (!v) falla('El vehículo no existe.');
    if (v.estado !== 'Activo') falla('El vehículo ya se encuentra suspendido, la operación no es necesaria.');
    v.estado = 'Suspendido';
    return v;
  };

  /* ---------- Turnos ---------- */
  function turnoTexto(db, t) {
    var v = D.vehiculo(db, t.vehiculoId);
    return U.fmtCorta(t.fecha) + ' ' + t.hora + ' — ' + D.nombreTipo(t.tipo) + (v ? ' (' + v.patente + ')' : '');
  }
  D.turnoTexto = turnoTexto;
  function propioTurno(actor, t) {
    if (actor.rol === D.ROLES.CLI && t.clienteId !== actor.clienteId) { var e = new Error('Solo podés operar sobre tus propios turnos.'); e.name = 'Permiso'; throw e; }
  }
  D.registrarTurno = function (db, actor, d) {
    D.exigir(actor, 'turnos', 'c');
    var datos = { clienteId: actor.rol === D.ROLES.CLI ? actor.clienteId : Number(d.clienteId), vehiculoId: Number(d.vehiculoId), tipo: d.tipo, fecha: d.fecha, hora: d.hora, observaciones: T(d.observaciones) };
    fallaSi(vTurno(db, datos, null));
    var t = { id: U.next(db, 'turnos'), clienteId: datos.clienteId, vehiculoId: datos.vehiculoId, tipo: datos.tipo, fecha: datos.fecha, hora: datos.hora, observaciones: datos.observaciones, estado: 'Reservado', origen: actor.rol === D.ROLES.CLI ? 'Cliente' : D.ROLES.GA, creado: Date.now() };
    db.turnos.push(t);
    if (actor.rol === D.ROLES.CLI) {
      D.evento(db, { tipo: 'turno', texto: D.nombreCliente(D.cliente(db, t.clienteId)) + ' reservó un turno: ' + turnoTexto(db, t), roles: [D.ROLES.GA, D.ROLES.CEO], autor: actor.id, ruta: 'turnos' });
    }
    return t;
  };
  D.modificarTurno = function (db, actor, id, d) {
    D.exigir(actor, 'turnos', 'u');
    var t = D.turno(db, id);
    if (!t) falla('El turno no existe.');
    propioTurno(actor, t);
    if (!ACTIVO(t)) falla('El turno ya fue realizado o se encuentra suspendido, no puede modificarse.');
    var datos = { clienteId: t.clienteId, vehiculoId: Number(d.vehiculoId) || t.vehiculoId, tipo: d.tipo, fecha: d.fecha, hora: d.hora };
    fallaSi(vTurno(db, datos, id));
    var cambioHorario = t.fecha !== datos.fecha || t.hora !== datos.hora;
    var estadoAntes = t.estado;
    t.vehiculoId = datos.vehiculoId; t.tipo = datos.tipo; t.fecha = datos.fecha; t.hora = datos.hora; t.observaciones = T(d.observaciones);
    if (actor.rol !== D.ROLES.CLI && (d.estado === 'Reservado' || d.estado === 'Confirmado')) t.estado = d.estado;
    if (actor.rol === D.ROLES.CLI && cambioHorario && t.estado === 'Confirmado') t.estado = 'Reservado'; // hay que volver a confirmarlo
    if (actor.rol === D.ROLES.CLI) {
      D.evento(db, { tipo: 'turno', texto: D.nombreCliente(D.cliente(db, t.clienteId)) + ' modificó su turno: ' + turnoTexto(db, t), roles: [D.ROLES.GA, D.ROLES.CEO], autor: actor.id, ruta: 'turnos' });
    } else if (cambioHorario || (estadoAntes !== t.estado && t.estado === 'Confirmado')) {
      D.evento(db, { tipo: 'turno', texto: (t.estado === 'Confirmado' ? 'Turno confirmado: ' : 'Tu turno fue reprogramado: ') + turnoTexto(db, t), roles: [D.ROLES.CLI], clienteId: t.clienteId, autor: actor.id, ruta: 'portal' });
    }
    return t;
  };
  D.confirmarTurno = function (db, actor, id) {
    D.exigir(actor, 'turnos', 'u');
    var t = D.turno(db, id);
    if (!t) falla('El turno no existe.');
    if (t.estado !== 'Reservado') falla('Solo se pueden confirmar turnos en estado Reservado.');
    t.estado = 'Confirmado';
    D.evento(db, { tipo: 'turno', texto: 'Turno confirmado: ' + turnoTexto(db, t), roles: [D.ROLES.CLI], clienteId: t.clienteId, autor: actor.id, ruta: 'portal' });
    return t;
  };
  D.suspenderTurno = function (db, actor, id) {
    D.exigir(actor, 'turnos', 'd');
    var t = D.turno(db, id);
    if (!t) falla('El turno no existe.');
    propioTurno(actor, t);
    if (!ACTIVO(t)) falla('El turno ya fue realizado o ya se encuentra suspendido, no puede suspenderse.');
    t.estado = 'Suspendido';
    if (actor.rol === D.ROLES.CLI) {
      D.evento(db, { tipo: 'turno', texto: D.nombreCliente(D.cliente(db, t.clienteId)) + ' suspendió su turno: ' + turnoTexto(db, t) + '. El horario quedó libre.', roles: [D.ROLES.GA, D.ROLES.CEO], autor: actor.id, ruta: 'turnos' });
    } else {
      D.evento(db, { tipo: 'turno', texto: 'Se suspendió tu turno: ' + turnoTexto(db, t), roles: [D.ROLES.CLI], clienteId: t.clienteId, autor: actor.id, ruta: 'portal' });
    }
    return t;
  };

  /* ---------- Servicios ---------- */
  function descontar(db, insumos, signo, actor, avisar) {
    insumos.forEach(function (i) {
      var it = D.item(db, i.stockId);
      if (!it) return;
      var antes = Number(it.cantidad);
      it.cantidad = Math.round((antes + signo * i.cantidad) * 100) / 100;
      if (avisar && antes >= Number(it.minimo) && it.cantidad < Number(it.minimo)) {
        D.evento(db, { tipo: 'stock', texto: 'Stock bajo el mínimo: ' + it.nombre + ' (' + U.num(it.cantidad) + ' ' + it.unidad + ', mínimo ' + U.num(it.minimo) + ')', roles: [D.ROLES.GA, D.ROLES.CEO], autor: actor.id, ruta: 'stock' });
      }
    });
  }
  D.registrarServicio = function (db, actor, d) {
    D.exigir(actor, 'servicios', 'c');
    var datos = { vehiculoId: Number(d.vehiculoId), fecha: d.fecha, tipo: d.tipo, km: d.km, observaciones: T(d.observaciones), insumos: d.insumos };
    var r = vServicio(db, datos, []);
    fallaSi(r.errores);
    var veh = D.vehiculo(db, datos.vehiculoId), tipo = D.tipoServ(datos.tipo);
    var s = { id: U.next(db, 'servicios'), fecha: datos.fecha, vehiculoId: veh.id, clienteId: veh.clienteId, tipo: tipo.id, km: Number(datos.km), observaciones: datos.observaciones,
      insumos: r.insumos, manoObra: tipo.manoObra, mecanicoId: actor.id, turnoId: null, estado: 'Finalizado',
      proximaFecha: U.addDays(datos.fecha, tipo.dias), recordatorioEnviado: false, cobro: null };
    s.total = D.totalServicio(s);
    descontar(db, s.insumos, -1, actor, true);
    // vincula el turno de hoy (si existe) y lo marca como realizado
    var tid = Number(d.turnoId) || null;
    var turno = tid ? D.turno(db, tid) : db.turnos.find(function (t) { return ACTIVO(t) && t.vehiculoId === veh.id && t.fecha === D.hoy(db) && t.tipo === tipo.id; });
    if (turno && ACTIVO(turno) && turno.vehiculoId === veh.id) { turno.estado = 'Realizado'; s.turnoId = turno.id; }
    db.servicios.push(s);
    var cli = D.cliente(db, s.clienteId);
    D.evento(db, { tipo: 'servicio', texto: 'Servicio finalizado: ' + tipo.nombre + ' de ' + veh.patente + ' (' + D.nombreCliente(cli) + '), pendiente de cobro.', roles: [D.ROLES.GA], autor: actor.id, ruta: 'servicios' });
    D.evento(db, { tipo: 'servicio', texto: 'Se registró el servicio "' + tipo.nombre + '" de tu ' + veh.marca + ' ' + veh.modelo + '. Próximo servicio estimado: ' + U.fmt(s.proximaFecha) + '.', roles: [D.ROLES.CLI], clienteId: s.clienteId, autor: actor.id, ruta: 'portal' });
    D.procesarRecordatorios(db);
    return s;
  };
  D.modificarServicio = function (db, actor, id, d) {
    D.exigir(actor, 'servicios', 'u');
    var s = D.servicio(db, id);
    if (!s) falla('El servicio no existe.');
    if (s.estado === 'Suspendido') falla('El servicio está suspendido y no puede modificarse.');
    if (s.estado === 'Cobrado') falla('El servicio ya fue cobrado y no puede modificarse.');
    var datos = { vehiculoId: s.vehiculoId, fecha: d.fecha, tipo: d.tipo, km: d.km, observaciones: T(d.observaciones), insumos: d.insumos };
    var r = vServicio(db, datos, s.insumos);
    fallaSi(r.errores);
    var tipo = D.tipoServ(datos.tipo);
    descontar(db, s.insumos, +1, actor, false);   // restituye lo anterior
    descontar(db, r.insumos, -1, actor, true);    // descuenta lo nuevo
    s.fecha = datos.fecha; s.tipo = tipo.id; s.km = Number(datos.km); s.observaciones = datos.observaciones; s.insumos = r.insumos; s.manoObra = tipo.manoObra;
    s.total = D.totalServicio(s);
    s.proximaFecha = U.addDays(s.fecha, tipo.dias); s.recordatorioEnviado = false;
    D.procesarRecordatorios(db);
    return s;
  };
  D.suspenderServicio = function (db, actor, id) {
    D.exigir(actor, 'servicios', 'd');
    var s = D.servicio(db, id);
    if (!s) falla('El servicio no existe.');
    if (s.estado === 'Cobrado') falla('El servicio ya fue cobrado, no puede suspenderse.');
    if (s.estado === 'Suspendido') falla('El servicio ya se encuentra suspendido, la operación no es necesaria.');
    descontar(db, s.insumos, +1, actor, false);
    s.estado = 'Suspendido';
    return s;
  };
  D.cobrarServicio = function (db, actor, id, d) {
    D.exigir(actor, 'servicios', 'k');
    var s = D.servicio(db, id);
    if (!s) falla('El servicio no existe.');
    if (s.estado === 'Cobrado') falla('El servicio ya fue cobrado, no puede cobrarse nuevamente.');
    if (s.estado !== 'Finalizado') falla('El servicio no está finalizado o se encuentra suspendido, no puede cobrarse.');
    if (D.MEDIOS_PAGO.indexOf(d.medio) < 0) falla('Seleccionar el medio de pago.', 'medio');
    var nro = U.next(db, 'comprobantes');
    s.estado = 'Cobrado';
    s.cobro = { fecha: D.hoy(db), medio: d.medio, monto: s.total, comprobante: 'C-' + String(nro).padStart(4, '0'), cobradoPor: actor.id };
    var v = D.vehiculo(db, s.vehiculoId);
    D.evento(db, { tipo: 'cobro', texto: 'Servicio cobrado: ' + D.nombreTipo(s.tipo) + ' de ' + (v ? v.patente : '') + ' — ' + U.money(s.total) + ' (' + s.cobro.comprobante + ')', roles: [D.ROLES.CEO], autor: actor.id, ruta: 'servicios' });
    D.evento(db, { tipo: 'cobro', texto: 'Tu servicio "' + D.nombreTipo(s.tipo) + '" fue cobrado. Comprobante ' + s.cobro.comprobante + '.', roles: [D.ROLES.CLI], clienteId: s.clienteId, autor: actor.id, ruta: 'portal' });
    return s;
  };

  /* ---------- Stock ---------- */
  D.registrarStock = function (db, actor, d) {
    D.exigir(actor, 'stock', 'c');
    fallaSi(vStock(db, d, null));
    var it = { id: U.next(db, 'stock'), nombre: T(d.nombre), tipo: d.tipo, unidad: d.unidad, cantidad: Number(d.cantidad), minimo: Number(d.minimo), precio: Number(d.precio), estado: 'Activo' };
    db.stock.push(it);
    return it;
  };
  D.modificarStock = function (db, actor, id, d) {
    D.exigir(actor, 'stock', 'u');
    var it = D.item(db, id);
    if (!it) falla('El ítem no existe.');
    if (it.estado !== 'Activo') falla('El ítem está suspendido y no puede modificarse.');
    fallaSi(vStock(db, d, id));
    var antes = Number(it.cantidad);
    it.nombre = T(d.nombre); it.tipo = d.tipo; it.unidad = d.unidad; it.cantidad = Number(d.cantidad); it.minimo = Number(d.minimo); it.precio = Number(d.precio);
    if (antes >= it.minimo && it.cantidad < it.minimo) {
      D.evento(db, { tipo: 'stock', texto: 'Stock bajo el mínimo: ' + it.nombre + ' (' + U.num(it.cantidad) + ' ' + it.unidad + ', mínimo ' + U.num(it.minimo) + ')', roles: [D.ROLES.GA, D.ROLES.CEO], autor: actor.id, ruta: 'stock' });
    }
    return it;
  };
  D.suspenderStock = function (db, actor, id) {
    D.exigir(actor, 'stock', 'd');
    var it = D.item(db, id);
    if (!it) falla('El ítem no existe.');
    if (it.estado !== 'Activo') falla('El ítem ya se encuentra suspendido, la operación no es necesaria.');
    it.estado = 'Suspendido';
    return it;
  };

  /* ---------- Usuarios ---------- */
  D.registrarUsuario = function (db, actor, d) {
    D.exigir(actor, 'usuarios', 'c');
    fallaSi(vUsuario(db, d, null, true));
    var u = { id: U.next(db, 'usuarios'), usuario: T(d.usuario).toLowerCase(), clave: U.hash(T(d.usuario).toLowerCase() + ':' + d.clave), rol: d.rol, clienteId: d.rol === D.ROLES.CLI ? Number(d.clienteId) : null, estado: 'Activo' };
    db.usuarios.push(u);
    return u;
  };
  D.modificarUsuario = function (db, actor, id, d) {
    D.exigir(actor, 'usuarios', 'u');
    var u = D.usuario(db, id);
    if (!u) falla('El usuario no existe.');
    if (u.estado !== 'Activo') falla('El usuario está suspendido y no puede modificarse.');
    fallaSi(vUsuario(db, d, id, false));
    if (u.id === actor.id && d.rol !== u.rol) falla('No podés cambiar el rol de tu propio usuario.', 'rol');
    var nuevo = T(d.usuario).toLowerCase();
    var sinClave = String(d.clave || '') === '';
    if (nuevo !== u.usuario && sinClave) falla('Al cambiar el nombre de usuario hay que ingresar una contraseña nueva.', 'clave');
    u.usuario = nuevo;
    if (!sinClave) u.clave = U.hash(nuevo + ':' + d.clave);
    u.rol = d.rol; u.clienteId = d.rol === D.ROLES.CLI ? Number(d.clienteId) : null;
    return u;
  };
  D.suspenderUsuario = function (db, actor, id) {
    D.exigir(actor, 'usuarios', 'd');
    var u = D.usuario(db, id);
    if (!u) falla('El usuario no existe.');
    if (u.id === actor.id) falla('No podés suspender tu propio usuario.');
    if (u.estado !== 'Activo') falla('El usuario ya se encuentra suspendido, la operación no es necesaria.');
    u.estado = 'Suspendido';
    return u;
  };

  /* ---------- Iniciar sesión ---------- */
  D.login = function (db, usuario, clave) {
    var nom = T(usuario).toLowerCase();
    var e = {};
    if (!nom) e.usuario = OBL;
    if (!clave) e.clave = OBL;
    fallaSi(e);
    var u = db.usuarios.find(function (x) { return x.usuario === nom; });
    if (!u || u.clave !== U.hash(nom + ':' + clave)) falla('Usuario o contraseña incorrectos.');
    if (u.estado !== 'Activo') falla('El usuario se encuentra suspendido. Acceso denegado.');
    if (u.rol === D.ROLES.CLI) {
      var c = D.cliente(db, u.clienteId);
      if (!c || c.estado !== 'Activo') falla('El cliente asociado se encuentra suspendido. Acceso denegado.');
    }
    return u;
  };

  /* ---------- Alertas de servicio (próximo servicio) ---------- */
  D.alertas = function (db, filtro) {
    var hoy = D.hoy(db), ventana = db.config.diasAlerta || 15, grupos = {};
    db.servicios.forEach(function (s) {
      if (s.estado === 'Suspendido') return;
      var k = s.vehiculoId + '|' + s.tipo, g = grupos[k];
      if (!g || s.fecha > g.fecha || (s.fecha === g.fecha && s.id > g.id)) grupos[k] = s;
    });
    var out = [];
    Object.keys(grupos).forEach(function (k) {
      var s = grupos[k], v = D.vehiculo(db, s.vehiculoId);
      if (!v || v.estado !== 'Activo') return;
      var c = D.cliente(db, v.clienteId);
      if (!c || c.estado !== 'Activo') return;
      var dias = U.diffDays(s.proximaFecha, hoy);
      if (dias > ventana) return;
      var turno = db.turnos.find(function (t) { return t.vehiculoId === v.id && t.tipo === s.tipo && ACTIVO(t) && t.fecha >= hoy; }) || null;
      out.push({ servicioId: s.id, vehiculoId: v.id, clienteId: c.id, tipo: s.tipo, proxima: s.proximaFecha, dias: dias, vencida: dias < 0, turno: turno });
    });
    out.sort(function (a, b) { return a.dias - b.dias; });
    if (filtro && filtro.clienteId) out = out.filter(function (a) { return a.clienteId === filtro.clienteId; });
    return out;
  };
  D.procesarRecordatorios = function (db, silencioso) {
    D.alertas(db).forEach(function (a) {
      var s = D.servicio(db, a.servicioId);
      if (s.recordatorioEnviado) return;
      s.recordatorioEnviado = true;
      if (silencioso) return;
      var v = D.vehiculo(db, a.vehiculoId), c = D.cliente(db, a.clienteId);
      D.evento(db, { tipo: 'alerta', texto: 'Recordatorio enviado a ' + D.nombreCliente(c) + ': ' + D.nombreTipo(a.tipo) + ' de ' + v.patente + ' (estimado ' + U.fmt(a.proxima) + ').', roles: [D.ROLES.GA], ruta: 'inicio' });
      D.evento(db, { tipo: 'alerta', texto: 'Alerta de servicio: ' + D.nombreTipo(a.tipo) + ' de tu ' + v.marca + ' ' + v.modelo + ' hacia el ' + U.fmt(a.proxima) + '.', roles: [D.ROLES.CLI], clienteId: c.id, ruta: 'portal' });
    });
  };

  /* ---------- Demo: reloj del sistema ---------- */
  D.moverFecha = function (db, dias) {
    db.config.offset = (db.config.offset || 0) + dias;
    D.procesarRecordatorios(db);
  };
  D.fechaReal = function (db) { db.config.offset = 0; };
})(typeof window !== 'undefined' ? window : globalThis);
