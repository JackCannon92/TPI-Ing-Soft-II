/* LubriGest demo — datos de ejemplo (las fechas son relativas al día en que se genera). */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, D = LG.D;
  var PASS = 'Demo1234';
  LG.DEMO_PASS = PASS;

  LG.makeSeed = function () {
    var T = U.realToday();
    // día hábil cercano: los domingos el lubricentro está cerrado
    function lab(n) {
      var d = U.addDays(T, n);
      if (U.dow(d) === 0) d = U.addDays(d, n < 0 ? -1 : 1);
      return d;
    }
    var db = {
      config: { offset: 0, bahias: 2, diasAlerta: 15, seedId: Math.random().toString(36).slice(2, 8) },
      seq: { clientes: 0, vehiculos: 0, turnos: 0, servicios: 0, stock: 0, usuarios: 0, eventos: 0, comprobantes: 0 },
      clientes: [], vehiculos: [], turnos: [], servicios: [], stock: [], usuarios: [], eventos: []
    };

    /* Clientes */
    [
      ['Juan', 'Pérez', '345 4551234', 'juan.perez@mail.com', 'Urquiza 1240'],
      ['Ana', 'Gómez', '345 4602211', 'ana.gomez@mail.com', 'San Lorenzo 560'],
      ['Carlos', 'Ríos', '345 4187733', 'carlos.rios@mail.com', 'Entre Ríos 982'],
      ['Marcela', 'Benítez', '345 4659080', 'marcela.benitez@mail.com', 'Pellegrini 310'],
      ['Lucas', 'Acosta', '345 4330417', 'lucas.acosta@mail.com', 'Mitre 1475'],
      ['Fernando', 'Sosa', '345 4721650', 'fernando.sosa@mail.com', 'Moreno 78'],
      ['Patricia', 'Romero', '345 4513902', 'patricia.romero@mail.com', 'Chacabuco 633'],
      ['Hernán', 'Giménez', '345 4044518', 'hernan.gimenez@mail.com', 'Buenos Aires 1021'],
      ['Valeria', 'Ledesma', '345 4892266', 'valeria.ledesma@mail.com', 'La Rioja 245'],
      ['Rodrigo', 'Fernández', '345 4275509', 'rodrigo.fernandez@mail.com', 'Salto Uruguay 1702']
    ].forEach(function (c, i) {
      db.clientes.push({ id: U.next(db, 'clientes'), nombre: c[0], apellido: c[1], telefono: c[2], email: c[3], direccion: c[4], estado: i === 9 ? 'Suspendido' : 'Activo' });
    });

    /* Vehículos */
    [
      [1, 'AB123CD', 'Ford', 'Fiesta', 2016], [1, 'AD812KP', 'Toyota', 'Hilux', 2019],
      [2, 'NKR482', 'Volkswagen', 'Gol Trend', 2014], [3, 'AC231FG', 'Renault', 'Sandero', 2018],
      [4, 'AE554HJ', 'Chevrolet', 'Onix', 2020], [5, 'AF019LM', 'Fiat', 'Cronos', 2021],
      [6, 'AD377NP', 'Peugeot', '208', 2019], [7, 'AA902QR', 'Toyota', 'Corolla', 2017],
      [8, 'OAR731', 'Ford', 'Ranger', 2015], [9, 'AC640ST', 'Citroën', 'C3', 2018],
      [10, 'AA185UV', 'Volkswagen', 'Amarok', 2016]
    ].forEach(function (v) {
      db.vehiculos.push({ id: U.next(db, 'vehiculos'), clienteId: v[0], patente: v[1], marca: v[2], modelo: v[3], anio: v[4], estado: 'Activo' });
    });

    /* Stock (algunos ítems por debajo del mínimo) */
    [
      ['Aceite 10W-40 semisintético', 'Lubricante', 'litros', 38, 20, 4800],
      ['Aceite 5W-30 sintético', 'Lubricante', 'litros', 14, 20, 7200],
      ['Filtro de aceite', 'Filtro', 'unidad', 22, 8, 3500],
      ['Filtro de aire', 'Filtro', 'unidad', 4, 6, 5200],
      ['Filtro de habitáculo', 'Filtro', 'unidad', 9, 5, 4300],
      ['Líquido de frenos DOT 4', 'Fluido', 'unidad', 4, 4, 6100],
      ['Refrigerante orgánico', 'Fluido', 'litros', 30, 10, 2900],
      ['Grasa multipropósito', 'Producto', 'unidad', 6, 3, 5400],
      ['Pastillas de freno delanteras', 'Repuesto', 'unidad', 3, 4, 21000],
      ['Lámpara H7', 'Repuesto', 'unidad', 12, 5, 2800],
      ['Limpiaparabrisas (par)', 'Repuesto', 'unidad', 7, 3, 6500]
    ].forEach(function (s) {
      db.stock.push({ id: U.next(db, 'stock'), nombre: s[0], tipo: s[1], unidad: s[2], cantidad: s[3], minimo: s[4], precio: s[5], estado: 'Activo' });
    });
    var itemPorNombre = function (n) { return db.stock.find(function (s) { return s.nombre === n; }); };

    /* Usuarios */
    function usuario(nombre, user, rol, clienteId, estado) {
      db.usuarios.push({ id: U.next(db, 'usuarios'), usuario: user, nombre: nombre, clave: U.hash(user + ':' + PASS), rol: rol, clienteId: clienteId || null, estado: estado || 'Activo' });
    }
    usuario('Gustavo Ferrari', 'ceo', D.ROLES.CEO);
    usuario('Laura Medina', 'gerente', D.ROLES.GA);
    usuario('Diego Vera', 'mecanico1', D.ROLES.MEC);
    usuario('Nicolás Brizuela', 'mecanico2', D.ROLES.MEC);
    usuario('Juan Pérez', 'jperez', D.ROLES.CLI, 1);
    usuario('Ana Gómez', 'agomez', D.ROLES.CLI, 2);
    usuario('Carlos Ríos', 'crios', D.ROLES.CLI, 3);
    usuario('Rodrigo Fernández', 'rfernandez', D.ROLES.CLI, 10, 'Suspendido');

    /* Servicios: [vehículo, tipo, días atrás, km, estado, medio de pago, mecánico, turno?] */
    var hist = [
      [1, 'aceite', 351, 41200, 'C', 'Efectivo', 3], [1, 'aceite', 171, 52300, 'C', 'Transferencia', 4], [1, 'revision', 95, 55800, 'C', 'Efectivo', 3],
      [2, 'aceite', 140, 78200, 'C', 'Tarjeta de débito', 4], [2, 'alineacion', 160, 77400, 'C', 'Tarjeta de crédito', 3],
      [3, 'alineacion', 177, 98100, 'C', 'Efectivo', 4], [3, 'aceite', 60, 103500, 'C', 'Efectivo', 3],
      [4, 'filtros', 190, 62800, 'C', 'Transferencia', 3], [4, 'aceite', 150, 64100, 'C', 'Efectivo', 4],
      [5, 'aceite', 158, 33900, 'C', 'Tarjeta de débito', 3], [5, 'engrase', 30, 37400, 'C', 'Efectivo', 4], [5, 'filtros', 85, 36100, 'C', 'Transferencia', 3],
      [6, 'refrigerante', 100, 21800, 'C', 'Tarjeta de crédito', 4], [6, 'filtros', 4, 25300, 'C', 'Efectivo', 3],
      [7, 'revision', 22, 44600, 'C', 'Transferencia', 4], [7, 'aceite', 8, 44900, 'C', 'Efectivo', 3],
      [8, 'aceite', 120, 71200, 'C', 'Efectivo', 4],
      [9, 'frenos', 200, 112000, 'C', 'Tarjeta de débito', 3], [9, 'aceite', 75, 116400, 'C', 'Transferencia', 4],
      [10, 'alineacion', 160, 58900, 'C', 'Efectivo', 3], [10, 'aceite', 110, 60200, 'C', 'Tarjeta de crédito', 4],
      [6, 'aceite', 1, 25360, 'F', null, 3, 'T-ac'], [8, 'engrase', 2, 71600, 'F', null, 4, 'T-en']
    ].map(function (r) {
      var d = U.addDays(T, -r[2]);
      if (U.dow(d) === 0) d = U.addDays(d, -1);
      return { v: r[0], tipo: r[1], fecha: d, km: r[3], estado: r[4], medio: r[5], mec: r[6], ref: r[7] };
    }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });

    var servPorRef = {};
    hist.forEach(function (r) {
      var tipo = D.tipoServ(r.tipo), veh = db.vehiculos[r.v - 1];
      var s = {
        id: U.next(db, 'servicios'), fecha: r.fecha, vehiculoId: veh.id, clienteId: veh.clienteId, tipo: tipo.id, km: r.km, observaciones: '',
        insumos: tipo.insumos.map(function (i) { var it = itemPorNombre(i[0]); return { stockId: it.id, nombre: it.nombre, unidad: it.unidad, cantidad: i[1], precio: it.precio }; }),
        manoObra: tipo.manoObra, mecanicoId: r.mec, turnoId: null, estado: r.estado === 'C' ? 'Cobrado' : 'Finalizado',
        proximaFecha: U.addDays(r.fecha, tipo.dias), recordatorioEnviado: false, cobro: null
      };
      s.total = D.totalServicio(s);
      if (r.estado === 'C') {
        s.cobro = { fecha: r.fecha, medio: r.medio, monto: s.total, comprobante: 'C-' + String(U.next(db, 'comprobantes')).padStart(4, '0'), cobradoPor: 2 };
      }
      db.servicios.push(s);
      if (r.ref) servPorRef[r.ref] = s;
    });

    /* Turnos */
    var H = lab(0);
    function turno(cli, veh, tipo, fecha, hora, estado, origen, hace) {
      var t = { id: U.next(db, 'turnos'), clienteId: cli, vehiculoId: veh, tipo: tipo, fecha: fecha, hora: hora, observaciones: '', estado: estado, origen: origen || D.ROLES.GA, creado: Date.now() - (hace || 86400000) };
      db.turnos.push(t);
      return t;
    }
    turno(6, 7, 'revision', H, '08:45', 'Confirmado');
    turno(7, 8, 'engrase', H, '08:45', 'Confirmado');
    turno(1, 2, 'frenos', H, '09:30', 'Confirmado');
    turno(2, 3, 'aceite', H, '10:15', 'Confirmado');
    turno(3, 4, 'engrase', H, '11:00', 'Confirmado');
    turno(4, 5, 'aceite', H, '11:45', 'Reservado', 'Cliente', 3600000);
    turno(5, 6, 'frenos', lab(1), '10:15', 'Reservado', 'Cliente', 5400000);
    turno(9, 10, 'revision', lab(2), '08:00', 'Confirmado');
    turno(8, 9, 'aceite', lab(2), '08:00', 'Confirmado');
    var tAc = turno(5, 6, 'aceite', lab(-1), '09:30', 'Realizado');
    var tEn = turno(7, 8, 'engrase', lab(-2), '10:15', 'Realizado');
    turno(3, 4, 'aceite', lab(-1), '10:15', 'Suspendido', 'Cliente');
    servPorRef['T-ac'].turnoId = tAc.id;
    servPorRef['T-en'].turnoId = tEn.id;

    /* Actividad reciente (campanita) */
    function ev(minAtras, e) {
      D.evento(db, e);
      db.eventos[0].ts = Date.now() - minAtras * 60000;
    }
    ev(1500, { tipo: 'alerta', texto: 'Recordatorio enviado a Ríos, Carlos: Cambio de filtros de aire y habitáculo de AC231FG (estimado ' + U.fmt(U.addDays(T, -10)) + ').', roles: [D.ROLES.GA], ruta: 'inicio' });
    ev(1500, { tipo: 'alerta', texto: 'Alerta de servicio: Cambio de filtros de aire y habitáculo de tu Renault Sandero ya está vencido (' + U.fmt(U.addDays(T, -10)) + ').', roles: [D.ROLES.CLI], clienteId: 3, ruta: 'portal' });
    ev(900, { tipo: 'alerta', texto: 'Alerta de servicio: Cambio de aceite y filtro de tu Ford Fiesta hacia el ' + U.fmt(U.addDays(T, 9)) + '.', roles: [D.ROLES.CLI], clienteId: 1, ruta: 'portal' });
    ev(900, { tipo: 'alerta', texto: 'Alerta de servicio: Alineación y balanceo de tu Volkswagen Gol Trend hacia el ' + U.fmt(U.addDays(T, 3)) + '.', roles: [D.ROLES.CLI], clienteId: 2, ruta: 'portal' });
    ev(420, { tipo: 'stock', texto: 'Stock bajo el mínimo: Filtro de aire (4 unidad, mínimo 6)', roles: [D.ROLES.GA, D.ROLES.CEO], ruta: 'stock' });
    ev(200, { tipo: 'servicio', texto: 'Servicio finalizado: Engrase general de OAR731 (Giménez, Hernán), pendiente de cobro.', roles: [D.ROLES.GA], ruta: 'servicios' });
    ev(90, { tipo: 'turno', texto: 'Acosta, Lucas reservó un turno: ' + U.fmtCorta(lab(1)) + ' 10:15 — Cambio de líquido de frenos (AF019LM)', roles: [D.ROLES.GA, D.ROLES.CEO], ruta: 'turnos' });
    ev(40, { tipo: 'servicio', texto: 'Servicio finalizado: Cambio de aceite y filtro de AF019LM (Acosta, Lucas), pendiente de cobro.', roles: [D.ROLES.GA], ruta: 'servicios' });
    ev(20, { tipo: 'turno', texto: 'Benítez, Marcela reservó un turno: ' + U.fmtCorta(H) + ' 11:45 — Cambio de aceite y filtro (AE554HJ)', roles: [D.ROLES.GA, D.ROLES.CEO], ruta: 'turnos' });

    D.procesarRecordatorios(db, true); // lo ya vencido al armar los datos no genera avisos nuevos
    return db;
  };
})(typeof window !== 'undefined' ? window : globalThis);
