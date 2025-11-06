FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/

# Install dependencies (including dev dependencies for ts-node)
WORKDIR /app/backend
RUN npm ci

# Copy source code
COPY backend/src ./src

# Expose port
ARG BACKEND_PORT=9001
EXPOSE ${BACKEND_PORT}

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node --loader ts-node/esm -e "require('http').get('http://localhost:${BACKEND_PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["npm", "start"]

