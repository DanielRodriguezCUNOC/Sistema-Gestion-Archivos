#!/bin/bash

echo "🚀 Levantando base de datos MongoDB en Docker..."
docker-compose up -d

echo "🚀 Levantando el servidor de desarrollo..."
bun run start:dev