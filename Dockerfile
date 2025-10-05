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

# Install PostgreSQL client
RUN apk add --no-cache postgresql-client

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy built frontend
COPY --from=builder /app/dist ./dist
COPY server ./server

# Copy data import script
COPY lobby_data.sql ./lobby_data.sql

EXPOSE 3000

# Start script
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]