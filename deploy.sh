#!/bin/bash

# Скрипт для развертывания с разными окружениями

ENV=${1:-development}

echo "🚀 Deploying Crypto Exchange in $ENV mode"

case $ENV in
  development)
    echo "📦 Using development environment (.env)"
    cp .env .env.current
    ;;
  production)
    echo "📦 Using production environment (.env.production)"
    cp .env.production .env.current
    ;;
  *)
    echo "❌ Unknown environment: $ENV"
    echo "Usage: ./deploy.sh [development|production]"
    exit 1
    ;;
esac

# Загружаем переменные окружения
export $(cat .env.current | grep -v '^#' | xargs)

# Останавливаем старые контейнеры
echo "🛑 Stopping old containers..."
docker-compose down

# Собираем и запускаем
echo "🔨 Building and starting containers..."
docker-compose --env-file .env.current up --build -d

# Проверяем статус
echo "✅ Checking status..."
sleep 5
docker-compose ps

echo "🎉 Deployment complete!"
echo "   Frontend: http://localhost:${FRONTEND_PORT}"
echo "   Backend: http://localhost:${BACKEND_PORT}"
echo "   Database: localhost:${DB_PORT}"
