#!/bin/sh

# Wait for database to be ready
echo "Waiting for database..."
until pg_isready -h db -p 5432 -U lobby_user; do
  sleep 2
done

# Import data if it exists and database is empty
if [ -f "/app/lobby_data.sql" ]; then
  echo "Checking if database needs initialization..."
  TABLE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
  
  if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "Importing initial data..."
    psql $DATABASE_URL < /app/lobby_data.sql
    echo "Data import complete"
  else
    echo "Database already has data, skipping import"
  fi
fi

# Start the application
cd /app/server
exec node index.js