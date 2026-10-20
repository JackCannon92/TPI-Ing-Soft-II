/* LubriGest demo — utilidades (fechas, formato, DOM). Sin dependencias externas. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = (LG.U = {});

  /* ---------- DOM ---------- */
  var PROPS = { checked: 1, selected: 1, disabled: 1, readOnly: 1, required: 1, multiple: 1, hidden: 1 };

  function append(el, kids) {
    kids.forEach(function (k) {
      if (k == null || k === false) return;
      if (Array.isArray(k)) return append(el, k);
      if (typeof k === 'string' || typeof k === 'number') el.appendChild(document.createTextNode(String(k)));
      else el.appendChild(k);
    });
  }

  U.h = function (tag, props) {
    var el = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2);
    var value = null;
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) { if (PROPS[k] && v === false) el[k] = false; return; }
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'value') value = v;
        else if (PROPS[k]) el[k] = !!v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    append(el, kids);
    if (value != null) el.value = value; // después de crear las <option>
    return el;
  };

  /* ---------- Fechas (ISO local, sin zona horaria) ---------- */
  var pad = function (n) { return String(n).padStart(2, '0'); };
  U.pad = pad;
  U.iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  U.parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  U.addDays = function (s, n) { var d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.diffDays = function (a, b) { return Math.round((U.parse(a) - U.parse(b)) / 86400000); };
  U.realToday = function () { return U.iso(new Date()); };
  U.dow = function (s) { return U.parse(s).getDay(); };
  U.fmt = function (s) { if (!s) return '—'; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  U.fmtCorta = function (s) { var p = s.split('-'); return DIAS[U.dow(s)] + ' ' + p[2] + '/' + p[1]; };
  U.fmtLarga = function (s) { var p = s.split('-'); return DIAS_L[U.dow(s)] + ' ' + Number(p[2]) + '/' + p[1] + '/' + p[0]; };
  U.mesClave = function (s) { return s.slice(0, 7); };

  /* ---------- Formato ---------- */
  U.money = function (n) { return '$ ' + Math.round(n || 0).toLocaleString('es-AR'); };
  U.num = function (n) { return Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 }); };
  U.norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  U.hace = function (ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'recién';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    return 'hace ' + Math.round(s / 86400) + ' d';
  };

  /* Hash simple (cyrb53) para no guardar contraseñas en texto plano. Es solo para la demo. */
  U.hash = function (str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };

  U.next = function (db, col) { db.seq[col] = (db.seq[col] || 0) + 1; return db.seq[col]; };
})(typeof window !== 'undefined' ? window : globalThis);
