#!/bin/bash
# Bootstrap script to seed the database after emulators start
# Usage: ./scripts/bootstrap.sh

set -e

EMULATOR_HOST=${FIRESTORE_EMULATOR_HOST:-localhost:8080}
MAX_RETRIES=30
RETRY_DELAY=2

echo "⏳ Waiting for Firebase emulators to be ready..."

# Poll the firestore emulator health
for i in $(seq 1 $MAX_RETRIES); do
  if curl -s "http://$EMULATOR_HOST/health" > /dev/null 2>&1; then
    echo "✅ Emulators are ready!"
    sleep 2  # Give it a bit more time to fully initialize
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "❌ Emulators failed to start after ${MAX_RETRIES} retries"
    exit 1
  fi
  
  echo "Attempt $i/$MAX_RETRIES - retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

echo "🌱 Seeding test data..."
npm run seed
