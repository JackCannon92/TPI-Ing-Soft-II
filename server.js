/* LubriGest demo — servidor local sin dependencias (solo Node.js).
   Sirve la aplicación y guarda los datos en data/db.json. Uso:  node server.js  [--port 3000] [--lan] [--no-open]  */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var cp = require('child_process');

var ROOT = __dirname;
var DATA_DIR = path.join(ROOT, 'data');
var DATA_FILE = path.join(DATA_DIR, 'db.json');
var args = process.argv.slice(2);
function argValue(name) { var i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
var PORT = Number(argValue('--port') || process.env.PORT || 3000);
var LAN = args.indexOf('--lan') >= 0 || process.env.LAN === '1';
var NO_OPEN = args.indexOf('--no-open') >= 0;

var MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
var PUBLICO = /^\/(index\.html|css\/[\w.-]+|js\/[\w.-]+)?$/;

/* ---------- Datos en memoria + archivo ---------- */
var state = { rev: 0, db: null };
try {
  var guardado = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (guardado && guardado.db) state = { rev: Number(guardado.rev) || 1, db: guardado.db };
} catch (e) { /* primera ejecución: el navegador crea los datos de ejemplo */ }

function persistir() {
  try { fs.mkdirSync(DATA_DIR); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  var tmp = DATA_FILE + '.tmp', texto = JSON.stringify({ rev: state.rev, db: state.db }, null, 1);
  try { fs.writeFileSync(tmp, texto); fs.renameSync(tmp, DATA_FILE); }
  catch (e) { fs.writeFileSync(DATA_FILE, texto); }
}

function json(res, code, obj) {
  var cuerpo = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(cuerpo) });
  res.end(cuerpo);
}

function leerCuerpo(req, cb) {
  var partes = [], total = 0;
  req.on('data', function (c) { total += c.length; if (total > 8 * 1024 * 1024) { req.destroy(); } else partes.push(c); });
  req.on('end', function () { cb(Buffer.concat(partes).toString('utf8')); });
}

function api(req, res, ruta) {
  if (ruta === '/api/rev' && req.method === 'GET') return json(res, 200, { rev: state.rev });
  if (ruta === '/api/db' && req.method === 'GET') return json(res, 200, { rev: state.rev, db: state.db });
  if (ruta === '/api/db' && req.method === 'PUT') {
    return leerCuerpo(req, function (texto) {
      var body;
      try { body = JSON.parse(texto); } catch (e) { return json(res, 400, { error: 'JSON inválido' }); }
      if (!body || typeof body.db !== 'object' || body.db === null) return json(res, 400, { error: 'Falta db' });
      if (!body.force && Number(body.baseRev) !== state.rev) return json(res, 409, { rev: state.rev, db: state.db });
      state.db = body.db; state.rev += 1;
      try { persistir(); } catch (e) { return json(res, 500, { error: 'No se pudo escribir data/db.json: ' + e.message }); }
      json(res, 200, { rev: state.rev });
    });
  }
  json(res, 404, { error: 'No existe' });
}

function estatico(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  var rel = ruta === '/' ? '/index.html' : ruta;
  if (!PUBLICO.test(rel) || rel.indexOf('..') >= 0) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
  var archivo = path.join(ROOT, rel);
  fs.readFile(archivo, function (err, buf) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': buf.length });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

var server = http.createServer(function (req, res) {
  var ruta;
  try { ruta = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (ruta.indexOf('/api/') === 0) return api(req, res, ruta);
  estatico(req, res, ruta);
});

/* ---------- Arranque ---------- */
function direcciones() {
  var out = [], ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (k) { ifs[k].forEach(function (i) { if (i.family === 'IPv4' && !i.internal) out.push(i.address); }); });
  return out;
}
function abrir(url) {
  if (NO_OPEN) return;
  var cmd = process.platform === 'win32' ? 'start "" "' + url + '"' : process.platform === 'darwin' ? 'open "' + url + '"' : 'xdg-open "' + url + '"';
  cp.exec(cmd, function () { /* si no se puede abrir solo, alcanza con la dirección impresa */ });
}
var intentos = 0;
function escuchar() {
  server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1');
}
server.on('error', function (e) {
  if (e.code === 'EADDRINUSE' && intentos < 10) { intentos++; PORT++; return escuchar(); }
  console.error('\nNo se pudo iniciar el servidor: ' + e.message);
  process.exit(1);
});
server.on('listening', function () {
  var url = 'http://localhost:' + PORT + '/';
  console.log('\n  LubriGest está funcionando.\n');
  console.log('  Abrí en el navegador:  ' + url);
  if (LAN) direcciones().forEach(function (ip) { console.log('  Desde otra computadora de la red:  http://' + ip + ':' + PORT + '/'); });
  console.log('\n  Los datos se guardan en:  ' + DATA_FILE);
  console.log('  Para empezar de cero: borrá ese archivo con el servidor apagado (o usá "Restablecer" en el panel Demo).');
  console.log('  Para apagar el servidor: Ctrl + C\n');
  abrir(url);
});
process.on('SIGINT', function () { console.log('\n  Servidor apagado. Los datos quedaron guardados.\n'); process.exit(0); });
escuchar();
