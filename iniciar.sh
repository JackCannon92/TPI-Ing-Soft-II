#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "No se encontro Node.js. Abri index.html con el navegador (los datos se guardan en el navegador)."
  exit 1
fi
node server.js "$@"
