/* LubriGest demo — persistencia sin base de datos.
   Modo "servidor": server.js guarda todo en data/db.json.
   Modo "navegador": si no hay servidor (abrir index.html directo), se guarda en localStorage.
   En ambos casos hay un número de revisión (rev) para detectar cambios hechos desde otra ventana. */
(function (root) {
  'use strict';
  var LG = (root.LG = root.LG || {});
  var U = LG.U;
  var KEY = 'lubrigest.db.v1';
  var listeners = [];

  var S = (LG.Store = {
    mode: 'local',      // 'server' | 'local'
    rev: 0,
    db: null,
    online: true,
    _q: Promise.resolve(),
    _timer: null
  });

  S.subscribe = function (fn) {
    listeners.push(fn);
    return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  };
  function emit(kind, prev) { listeners.forEach(function (fn) { try { fn(kind, prev); } catch (e) { console.error(e); } }); }

  /* ---------- Acceso al medio de almacenamiento ---------- */
  function lsRead() {
    try { var t = root.localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function lsWrite(obj) {
    try { root.localStorage.setItem(KEY, JSON.stringify(obj)); return true; } catch (e) { return false; }
  }
  function http(method, url, body) {
    var opt = { method: method, cache: 'no-store', headers: {} };
    if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    return fetch(url, opt).then(function (r) {
      return r.text().then(function (t) {
        var data = null; try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
        return { status: r.status, data: data };
      });
    });
  }

  /* Intenta usar el servidor; si no responde con el formato esperado, usa localStorage. */
  function detect() {
    if (typeof fetch !== 'function' || !/^https?:$/.test(root.location.protocol)) return Promise.resolve(false);
    return http('GET', 'api/rev').then(function (r) { return r.status === 200 && r.data && typeof r.data.rev === 'number'; }, function () { return false; });
  }

  /* ---------- Inicio ---------- */
  S.init = function (makeSeed) {
    return detect().then(function (srv) {
      S.mode = srv ? 'server' : 'local';
      if (srv) {
        return http('GET', 'api/db').then(function (r) {
          if (r.data && r.data.db) { S.db = r.data.db; S.rev = r.data.rev; return; }
          var seed = makeSeed();
          return save(seed, 0, true).then(function (res) { S.db = res.ok ? seed : res.db; S.rev = res.rev; });
        });
      }
      var cur = lsRead();
      if (cur && cur.db) { S.db = cur.db; S.rev = cur.rev; return; }
      var seed = makeSeed();
      S.db = seed; S.rev = 1; lsWrite({ rev: 1, db: seed });
    });
  };

  /* Devuelve {ok:true, rev} o {ok:false, rev, db} si otra ventana cambió los datos antes. */
  function save(db, baseRev, force) {
    if (S.mode === 'server') {
      return http('PUT', 'api/db', { baseRev: baseRev, db: db, force: !!force }).then(function (r) {
        S.online = true;
        if (r.status === 200) return { ok: true, rev: r.data.rev };
        if (r.status === 409) return { ok: false, rev: r.data.rev, db: r.data.db };
        throw new Error('El servidor respondió ' + r.status);
      }, function () {
        S.online = false;
        throw new Error('No se pudo guardar: el servidor no responde. Revisá que siga corriendo "node server.js".');
      });
    }
    var cur = lsRead();
    var curRev = cur ? cur.rev : 0;
    if (!force && cur && curRev !== baseRev) return Promise.resolve({ ok: false, rev: curRev, db: cur.db });
    var nuevo = curRev + 1;
    if (!lsWrite({ rev: nuevo, db: db })) return Promise.reject(new Error('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).'));
    return Promise.resolve({ ok: true, rev: nuevo });
  }

  /* ---------- Modificar datos ----------
     fn(draft) recibe una copia; si lanza un error no se guarda nada.
     Si otra ventana guardó antes, se vuelve a ejecutar sobre los datos nuevos (por eso un horario
     tomado por otra persona se detecta y se informa). */
  S.mutate = function (fn) {
    var run = function () {
      return new Promise(function (resolve, reject) {
        function attempt(n) {
          var draft = U.clone(S.db), res;
          try { res = fn(draft); } catch (e) { return reject(e); }
          save(draft, S.rev).then(function (r) {
            if (r.ok) {
              var prev = S.db;
              S.db = draft; S.rev = r.rev;
              emit('local', prev);
              resolve(res);
            } else if (n < 4) {
              S.db = r.db; S.rev = r.rev;
              attempt(n + 1);
            } else reject(new Error('Los datos cambiaron en otra ventana. Probá de nuevo.'));
          }, reject);
        }
        attempt(0);
      });
    };
    var p = S._q.then(run, run);
    S._q = p.then(function () {}, function () {});
    return p;
  };

  /* ---------- Sincronización entre ventanas ---------- */
  function adopt(rev, db) {
    if (rev === S.rev) return;
    var prev = S.db;
    S.db = db; S.rev = rev;
    emit('remote', prev);
  }
  function poll() {
    if (S.mode === 'server') {
      http('GET', 'api/rev').then(function (r) {
        S.online = true;
        if (r.data && r.data.rev !== S.rev) return http('GET', 'api/db').then(function (d) { if (d.data && d.data.db) adopt(d.data.rev, d.data.db); });
      }, function () { S.online = false; emit('status'); });
    } else {
      var cur = lsRead();
      if (cur && cur.rev !== S.rev) adopt(cur.rev, cur.db);
    }
  }
  S.startSync = function () {
    if (S._timer) return;
    S._timer = setInterval(poll, S.mode === 'server' ? 1200 : 1500);
    if (S.mode === 'local') root.addEventListener('storage', function (e) { if (e.key === KEY) poll(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  };

  /* ---------- Herramientas de demo ---------- */
  S.reset = function (makeSeed) {
    var seed = makeSeed();
    return save(seed, S.rev, true).then(function (r) {
      var prev = S.db; S.db = seed; S.rev = r.rev; emit('local', prev);
    });
  };
  S.exportJSON = function () { return JSON.stringify({ app: 'LubriGest', version: 1, exportado: new Date().toISOString(), db: S.db }, null, 2); };
  S.importJSON = function (text) {
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return Promise.reject(new Error('El archivo no es un JSON válido.')); }
    var db = obj && obj.db ? obj.db : obj;
    var ok = db && ['clientes', 'vehiculos', 'turnos', 'servicios', 'stock', 'usuarios', 'eventos', 'seq', 'config'].every(function (k) { return db[k]; });
    if (!ok) return Promise.reject(new Error('El archivo no tiene el formato de datos de LubriGest.'));
    return save(db, S.rev, true).then(function (r) { var prev = S.db; S.db = db; S.rev = r.rev; emit('local', prev); });
  };
})(typeof window !== 'undefined' ? window : globalThis);
