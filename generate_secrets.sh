#!/bin/bash

# Генерация безопасных ключей для продакшена

echo "🔐 Generating secure secrets..."

# Генерация JWT ключа
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Генерация пароля для БД
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

echo ""
echo "Generated secrets (save these securely!):"
echo "========================================="
echo "JWT_SECRET_KEY=$JWT_SECRET"
echo "POSTGRES_PASSWORD=$DB_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Save these values in your .env.production file"
echo "⚠️  Never commit these values to git!"
