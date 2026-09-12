#!/bin/sh
set -e

echo "=========================================================="
echo " Starting Retail Sales Application for Google Cloud Run"
echo "=========================================================="

# 1. Start Python Multi-Batch Backend Server on port 8000
echo "[1/2] Starting Python Multi-Batch Backend (port ${BACKEND_PORT:-8000})..."
python3 server.py &
PYTHON_PID=$!

# Trap termination signals to kill Python background process cleanly
trap "echo 'Stopping container services...'; kill -TERM $PYTHON_PID 2>/dev/null || true; exit 0" TERM INT

# Wait for backend health check to succeed
echo "Waiting for backend API initialization..."
for i in $(seq 1 30); do
  if curl -s "http://127.0.0.1:${BACKEND_PORT:-8000}/api/products" > /dev/null 2>&1; then
    echo "✓ Python Backend is active and healthy!"
    break
  fi
  sleep 1
done

# 2. Start Next.js Frontend Server on Cloud Run $PORT (default: 8080)
TARGET_PORT="${PORT:-8080}"
echo "[2/2] Starting Next.js Production Frontend on port ${TARGET_PORT}..."
export PORT="${TARGET_PORT}"
export HOSTNAME="0.0.0.0"

if [ -f "server.js" ]; then
  exec node server.js
elif [ -f "frontend/server.js" ]; then
  exec node frontend/server.js
elif [ -f "node_modules/.bin/next" ]; then
  exec npx next start -p "${TARGET_PORT}" -H "0.0.0.0"
else
  echo "Error: Next.js server entrypoint not found!"
  exit 1
fi
