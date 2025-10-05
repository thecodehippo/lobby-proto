# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install PostgreSQL and supervisor
RUN apk add --no-cache postgresql postgresql-contrib supervisor

# Create directories for postgres (user already exists)
RUN mkdir -p /var/lib/postgresql/data /var/log/postgresql /run/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql /run/postgresql

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy built frontend
COPY --from=builder /app/dist ./dist
COPY server ./server

# Copy data import script
COPY lobby_data.sql ./lobby_data.sql

# Create supervisor config
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:postgresql]' >> /etc/supervisord.conf && \
    echo 'user=postgres' >> /etc/supervisord.conf && \
    echo 'command=/usr/bin/postgres -D /var/lib/postgresql/data' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/var/log/postgresql/postgresql.log' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/var/log/postgresql/postgresql.log' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:app]' >> /etc/supervisord.conf && \
    echo 'command=node server/index.js' >> /etc/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/var/log/app.log' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/var/log/app.log' >> /etc/supervisord.conf

# Initialize PostgreSQL and import data
RUN su - postgres -c 'initdb -D /var/lib/postgresql/data' && \
    su - postgres -c 'pg_ctl -D /var/lib/postgresql/data start' && \
    sleep 5 && \
    su - postgres -c 'createdb lobby_cms' && \
    su - postgres -c 'psql lobby_cms < /app/lobby_data.sql' && \
    su - postgres -c 'pg_ctl -D /var/lib/postgresql/data stop'

EXPOSE 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]