#!/bin/bash

echo "⚠️ Ejecutando el Seed localmente con Bun (Esto borrará los datos actuales)..."
bun run seed

echo "✅ ¡Base de datos poblada exitosamente!"
echo "Puedes probar los usuarios:"
echo "1. admin@test.com / Password123!"
echo "2. juan@test.com / Password123!"
echo "3. maria@test.com / Password123!"