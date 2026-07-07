#!/bin/sh
set -e

# Puebla la BD con datos demo solo si aún no existe (primer arranque del volumen).
DB_FILE="/app/data/monitor.db"
if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] No existe la BD — sembrando datos demo..."
  python seed.py || echo "[entrypoint] seed.py falló o ya estaba sembrado; continúo."
else
  echo "[entrypoint] BD existente encontrada; no se siembra."
fi

exec "$@"
