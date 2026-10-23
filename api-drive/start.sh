#!/bin/bash

echo "🚀 Levantando base de datos MongoDB en Docker..."
docker-compose up -d

echo "⏳ Esperando 5 segundos a que MongoDB inicialice correctamente..."
sleep 5

echo "🌱 Ejecutando el Seed localmente con Bun..."
bun run seed

echo "✅ ¡Base de datos poblada exitosamente!"
echo "Puedes probar los usuarios:"
echo "1. admin@test.com / Password123!"
echo "2. juan@test.com / Password123!"
echo "3. maria@test.com / Password123!"

echo "🚀 Levantando el servidor de desarrollo..."
bun run start:dev