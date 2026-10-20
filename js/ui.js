/* LubriGest demo — componentes de interfaz (sin librerías externas). */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U, h = U.h;
  var UI = (LG.UI = {});

  /* ---------- Íconos ---------- */
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18.5 14.8c1.5.8 2.5 2.4 2.5 5.2"/>',
    car: '<path d="M4 17v-5l2-5h12l2 5v5"/><path d="M4 12h16M4 17h16"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M16 7l3 3M14 9l2 2"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    logout: '<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    alert: '<path d="M12 3.5 22 20H2z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    chevL: '<path d="M14.5 6 8.5 12l6 6"/>',
    chevR: '<path d="M9.5 6l6 6-6 6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    dollar: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.4-1-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.2-.5-2.5-1.5M12 6.5V8M12 16v1.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 5v3.5h3.5"/><path d="M4 13a8 8 0 0 0 14.5 4M20 19v-3.5h-3.5"/>',
    download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>',
    upload: '<path d="M12 16V5M7.5 9 12 4.5 16.5 9M5 20h14"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    window: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.2 7.5-6.2s7.5 2.2 7.5 6.2"/>'
  };
  UI.icon = function (name, size) {
    var s = document.createElement('span');
    s.className = 'ico';
    s.setAttribute('aria-hidden', 'true');
    var px = size || 18;
    s.innerHTML = '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    return s;
  };

  /* ---------- Avisos (toast) ---------- */
  var toastBox = null;
  UI.toast = function (msg, kind, action) {
    if (!toastBox) {
      toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastBox);
    }
    var t = h('div', { class: 'toast ' + (kind || 'ok') },
      UI.icon(kind === 'err' ? 'alert' : kind === 'info' ? 'bell' : 'check'),
      h('span', { class: 'toast-msg' }, msg));
    if (action) t.appendChild(h('button', { class: 'toast-act', onclick: function () { action.onClick(); gone(); } }, action.label));
    var timer;
    function gone() { clearTimeout(timer); t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220); }
    t.addEventListener('click', function (e) { if (e.target === t || e.target.className === 'toast-msg') gone(); });
    toastBox.appendChild(t);
    while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
    timer = setTimeout(gone, kind === 'err' ? 7000 : 4500);
    return t;
  };

  /* ---------- Ventanas modales ---------- */
  var stack = [];
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) { e.stopPropagation(); stack[stack.length - 1].close(); }
    if (e.key === 'Tab' && stack.length) {
      var box = stack[stack.length - 1].box;
      var f = box.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }, true);

  UI.modal = function (o) {
    var prev = document.activeElement;
    var layer = h('div', { class: 'modal-layer' });
    var box = h('div', { class: 'modal' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title, tabindex: '-1' });
    var closed = false;
    var api = { el: layer, box: box };
    api.close = function () {
      if (closed) return; closed = true;
      var i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      layer.classList.add('out');
      setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 140);
      if (prev && prev.focus && document.body.contains(prev)) { try { prev.focus(); } catch (e) {} }
      if (o.onClose) o.onClose();
    };
    box.appendChild(h('header', { class: 'modal-head' },
      h('h2', null, o.title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cerrar', onclick: api.close }, UI.icon('x'))));
    box.appendChild(h('div', { class: 'modal-body' }, o.body));
    if (o.footer) box.appendChild(h('footer', { class: 'modal-foot' }, o.footer));
    layer.appendChild(box);
    var down = false;
    layer.addEventListener('mousedown', function (e) { down = e.target === layer; });
    layer.addEventListener('click', function (e) { if (down && e.target === layer && !o.sticky) api.close(); down = false; });
    document.body.appendChild(layer);
    stack.push(api);
    setTimeout(function () {
      var first = box.querySelector('[data-autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea');
      (first || box).focus();
    }, 30);
    return api;
  };
  UI.modalOpen = function () { return stack.length > 0; };

  UI.confirm = function (o) {
    return new Promise(function (resolve) {
      var done = false, m;
      function end(v) { if (done) return; done = true; resolve(v); m.close(); }
      m = UI.modal({
        title: o.title, cls: 'confirm', onClose: function () { if (!done) { done = true; resolve(false); } },
        body: [h('p', { class: 'confirm-text' }, o.text), o.detail || null],
        footer: [
          h('button', { class: 'btn ghost', type: 'button', onclick: function () { end(false); } }, o.cancelLabel || 'Cancelar'),
          h('button', { class: 'btn ' + (o.danger ? 'danger' : 'primary'), type: 'button', 'data-autofocus': '', onclick: function () { end(true); } }, o.okLabel || 'Aceptar')
        ]
      });
    });
  };

  /* ---------- Piezas visuales ---------- */
  var TONO = { Confirmado: 'ok', Reservado: 'warn', Realizado: 'info', Suspendido: 'bad', Activo: 'ok', Finalizado: 'warn', Cobrado: 'ok' };
  UI.badge = function (estado, texto) { return h('span', { class: 'badge ' + (TONO[estado] || 'info') }, texto || estado); };
  UI.chip = function (texto, tono, icon) { return h('span', { class: 'chip ' + (tono || ''), }, icon ? UI.icon(icon, 14) : null, texto); };

  UI.empty = function (o) {
    return h('div', { class: 'empty' },
      h('div', { class: 'empty-title' }, o.title),
      o.text ? h('p', null, o.text) : null,
      o.action ? h('button', { class: 'btn primary', type: 'button', onclick: o.action.onClick }, o.action.label) : null);
  };

  UI.card = function (title, body, o) {
    o = o || {};
    return h('section', { class: 'card ' + (o.cls || '') },
      title || o.actions ? h('header', { class: 'card-head' }, h('h3', null, title), o.sub ? h('span', { class: 'card-sub' }, o.sub) : null, h('div', { class: 'card-actions' }, o.actions || null)) : null,
      h('div', { class: 'card-body' + (o.flush ? ' flush' : '') }, body));
  };

  UI.kpi = function (o) {
    var tag = o.onClick ? 'button' : 'div';
    var el = h(tag, { class: 'kpi ' + (o.tone || '') + (o.onClick ? ' link' : ''), type: o.onClick ? 'button' : null, onclick: o.onClick || null },
      h('div', { class: 'kpi-label' }, o.icon ? UI.icon(o.icon, 16) : null, o.label),
      h('div', { class: 'kpi-value' }, o.value),
      o.sub ? h('div', { class: 'kpi-sub' }, o.sub) : null);
    return el;
  };

  UI.seg = function (options, current, onChange, label) {
    var el = h('div', { class: 'seg', role: 'group', 'aria-label': label || 'Filtro' });
    options.forEach(function (op) {
      var b = h('button', { type: 'button', class: op[0] === current ? 'on' : '', 'aria-pressed': op[0] === current ? 'true' : 'false', onclick: function () { onChange(op[0]); } }, op[1]);
      el.appendChild(b);
    });
    return el;
  };

  UI.actions = function (list) {
    var el = h('div', { class: 'row-actions' });
    list.forEach(function (a) {
      if (!a || a.show === false) return;
      el.appendChild(h('button', {
        class: 'btn sm ' + (a.kind || 'ghost') + (a.iconOnly ? ' icon-only' : ''), type: 'button', title: a.title || a.label, 'aria-label': a.iconOnly ? a.label : null,
        onclick: function (e) { e.stopPropagation(); a.onClick(e); }
      }, a.icon ? UI.icon(a.icon, a.iconOnly ? 17 : 15) : null, a.iconOnly ? null : a.label));
    });
    return el;
  };

  UI.dl = function (pairs) {
    var dl = h('dl', { class: 'dl' });
    pairs.forEach(function (p) { if (!p) return; dl.appendChild(h('dt', null, p[0])); dl.appendChild(h('dd', null, p[1])); });
    return dl;
  };

  UI.table = function (o) {
    if (!o.rows.length) return UI.empty(o.empty || { title: 'No hay registros para mostrar' });
    var thead = h('thead', null, h('tr', null, o.cols.map(function (c) { return h('th', { scope: 'col', class: c.cls || '' }, c.label); })));
    var tbody = h('tbody', null, o.rows.map(function (r, i) {
      var tr = h('tr', { class: (o.rowClass ? o.rowClass(r) : '') + (o.onRow ? ' clickable' : '') },
        o.cols.map(function (c) { return h('td', { class: c.cls || '', 'data-label': c.label }, c.render ? c.render(r, i) : r[c.key]); }));
      if (o.onRow) {
        tr.tabIndex = 0;
        tr.addEventListener('click', function () { o.onRow(r); });
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') o.onRow(r); });
      }
      return tr;
    }));
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, thead, tbody));
  };

  /* ---------- Formularios ---------- */
  var uid = 0;
  UI.form = function (o) {
    var fid = 'f' + (++uid);
    var form = h('form', { class: 'form', novalidate: true, autocomplete: 'off' });
    var banner = h('div', { class: 'form-error', role: 'alert', hidden: true });
    var grid = h('div', { class: 'form-grid' });
    var ctl = {};
    var api = {};
    var changeHandler = function (name) { if (ctl[name]) clearError(name); if (o.onChange) o.onChange(name, api); };

    o.fields.forEach(function (f) {
      var id = fid + '-' + f.name;
      var wrap = h('div', { class: 'field' + (f.span === 2 ? ' span2' : '') + (f.hidden ? ' is-hidden' : ''), hidden: !!f.hidden });
      var err = h('div', { class: 'err', id: id + '-err' });
      var c = { f: f, wrap: wrap, err: err };
      var control;
      var val = o.values && o.values[f.name] != null ? o.values[f.name] : '';
      if (f.type === 'custom') {
        var built = f.build(api, val);
        c.get = built.get; c.set = built.set || function () {}; c.focus = built.focus || function () {};
        c.custom = built;
        control = built.el;
      } else if (f.type === 'static') {
        control = h('div', { class: 'static', id: id }, String(val));
        c.get = function () { return val; }; c.set = function (v) { control.textContent = v; };
        c.focus = function () {};
      } else if (f.type === 'select') {
        control = h('select', { id: id, name: f.name, 'aria-describedby': id + '-err', disabled: !!f.disabled });
        c.setOptions = function (opts, keep) {
          var cur = keep === false ? '' : control.value;
          control.innerHTML = '';
          control.appendChild(h('option', { value: '' }, f.placeholder || 'Seleccionar…'));
          opts.forEach(function (op) { control.appendChild(h('option', { value: String(op.value), disabled: !!op.disabled }, op.label)); });
          control.value = cur;
          if (control.value !== cur) control.value = '';
        };
        c.setOptions(f.options || [], false);
        control.value = String(val);
        c.get = function () { return control.value; }; c.set = function (v) { control.value = v == null ? '' : String(v); };
        c.focus = function () { control.focus(); };
        control.addEventListener('change', function () { changeHandler(f.name); });
      } else if (f.type === 'textarea') {
        control = h('textarea', { id: id, name: f.name, rows: f.rows || 2, placeholder: f.placeholder || '', maxlength: f.maxlength || 300, 'aria-describedby': id + '-err' });
        control.value = val;
        c.get = function () { return control.value; }; c.set = function (v) { control.value = v == null ? '' : v; };
        c.focus = function () { control.focus(); };
        control.addEventListener('input', function () { changeHandler(f.name); });
      } else {
        control = h('input', { id: id, name: f.name, type: f.type || 'text', placeholder: f.placeholder || '', min: f.min, max: f.max, step: f.step, maxlength: f.maxlength, inputmode: f.inputmode || null, autocomplete: f.type === 'password' ? 'new-password' : 'off', 'aria-describedby': id + '-err', readOnly: !!f.readOnly });
        control.value = val;
        c.get = function () { return control.value; }; c.set = function (v) { control.value = v == null ? '' : v; };
        c.focus = function () { control.focus(); };
        control.addEventListener('input', function () { changeHandler(f.name); });
        control.addEventListener('change', function () { changeHandler(f.name); });
      }
      c.control = control;
      var label = f.label ? h('label', { for: id }, f.label, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null) : null;
      if (label) wrap.appendChild(label);
      wrap.appendChild(control);
      if (f.hint) wrap.appendChild(h('div', { class: 'hint' }, f.hint));
      wrap.appendChild(err);
      ctl[f.name] = c;
      grid.appendChild(wrap);
    });

    function clearError(name) {
      var c = ctl[name]; if (!c) return;
      c.err.textContent = ''; c.wrap.classList.remove('has-error');
      if (c.control && c.control.removeAttribute) c.control.removeAttribute('aria-invalid');
    }
    api.get = function (n) { return ctl[n] ? ctl[n].get() : ''; };
    api.set = function (n, v) { if (ctl[n]) ctl[n].set(v); };
    api.values = function () { var v = {}; Object.keys(ctl).forEach(function (n) { if (ctl[n].f.type !== 'static') v[n] = ctl[n].get(); }); return v; };
    api.setOptions = function (n, opts, keep) { if (ctl[n] && ctl[n].setOptions) ctl[n].setOptions(opts, keep); };
    api.show = function (n, on) { if (ctl[n]) ctl[n].wrap.hidden = !on; };
    api.disable = function (n, on) { if (ctl[n] && ctl[n].control) ctl[n].control.disabled = !!on; };
    api.focus = function (n) { if (ctl[n]) ctl[n].focus(); };
    api.clearErrors = function () {
      banner.hidden = true; banner.textContent = '';
      Object.keys(ctl).forEach(clearError);
    };
    api.setErrors = function (errs, msg) {
      api.clearErrors();
      var first = null, sueltos = [];
      Object.keys(errs || {}).forEach(function (k) {
        var c = ctl[k];
        if (!c) { sueltos.push(errs[k]); return; }
        c.err.textContent = errs[k]; c.wrap.classList.add('has-error');
        if (c.control && c.control.setAttribute) c.control.setAttribute('aria-invalid', 'true');
        if (c.custom && c.custom.setError) c.custom.setError(errs[k]);
        if (!first) first = c;
      });
      if (first) { first.focus(); }
      var text = sueltos.length ? sueltos.join(' ') : (!first ? msg : '');
      if (first && !text) text = 'Revisá los campos marcados.';
      if (text) { banner.textContent = text; banner.hidden = false; }
    };
    api.changed = changeHandler;
    api.el = form;
    form.appendChild(banner);
    form.appendChild(grid);
    return api;
  };

  /* Formulario dentro de una ventana: submit(values) devuelve una promesa; si falla con Validacion se marcan los campos. */
  UI.formModal = function (o) {
    var api = UI.form(o), busy = false, modal;
    var ok = h('button', { class: 'btn primary', type: 'submit' }, o.submitLabel || 'Guardar');
    var cancel = h('button', { class: 'btn ghost', type: 'button', onclick: function () { modal.close(); } }, 'Cancelar');
    var foot = h('footer', { class: 'modal-foot' }, o.extraFooter || null, cancel, ok);
    api.el.appendChild(foot);
    api.el.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      busy = true; ok.disabled = true;
      api.clearErrors();
      Promise.resolve().then(function () { return o.submit(api.values(), api); }).then(function (r) {
        busy = false; ok.disabled = false;
        modal.close();
        if (o.done) o.done(r);
      }, function (err) {
        busy = false; ok.disabled = false;
        if (err && err.name === 'Validacion') api.setErrors(err.errores, err.message);
        else api.setErrors({}, (err && err.message) || 'Ocurrió un error inesperado.');
      });
    });
    modal = UI.modal({ title: o.title, body: [o.intro ? h('p', { class: 'modal-intro' }, o.intro) : null, api.el], wide: o.wide, sticky: true, onClose: o.onClose });
    api.modal = modal;
    if (o.onChange) o.onChange(null, api);
    return api;
  };
})(typeof window !== 'undefined' ? window : globalThis);
