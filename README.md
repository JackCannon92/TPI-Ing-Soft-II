# LubriGest — demo del sistema (LEEME)

Demo completa del sistema (HTML + CSS + JS, sin internet y sin base de datos). Entregable: `LubriGest_Demo.zip`.

## Cómo empezar
- **Con Node.js (recomendado):** Windows → doble clic en `iniciar.bat`; Mac/Linux → `./iniciar.sh` (o `node server.js`). Abre `http://localhost:3000`. Los datos se guardan en `data/db.json`.
- **Sin instalar nada:** doble clic en `index.html`. Los datos quedan en el navegador (localStorage).

## Usuarios (clave de todos: `Demo1234`)
`ceo` (CEO) · `gerente` (Gerente Administrativa) · `mecanico1` / `mecanico2` · `jperez` / `agomez` / `crios` (clientes) · `rfernandez` (suspendido → acceso denegado).

## Guion sugerido (5 min)
1. Demo → Abrir otra ventana: una como Cliente (Juan Pérez) y otra como Gerente (cada ventana tiene su sesión).
2. Cliente: "Reservar turno" desde la alerta → aparece al instante en la agenda de la Gerente; ella lo confirma y el cliente recibe el aviso.
3. Mecánico: toca el turno de las 09:30 → Registrar servicio → se descuenta el stock.
4. Gerente: Cobrar → medio de pago → comprobante imprimible. El CEO ve el cobro en su panel.
5. Demo → +7 días: nuevas alertas y recordatorios a los clientes. Volver a hoy.
6. Validaciones: teléfono repetido, patente duplicada, stock insuficiente, suspender con confirmación, horario que se ocupa mientras otra persona lo elegía.

## Datos
Se guardan solos. Demo → Restablecer datos de ejemplo / Exportar JSON / Importar JSON.
Otros comandos: `node server.js --port 8080`, `--lan` (otra computadora de la red), `--no-open`.
