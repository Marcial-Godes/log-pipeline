#!/bin/sh

echo "⏳ Waiting for DB..."
sleep 5

echo "🚀 Running migrations..."
alembic upgrade head

echo "🔥 Starting API..."

# 🔥 USAR PUERTO DE RENDER
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}