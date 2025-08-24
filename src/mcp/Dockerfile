# BoardGuru MCP Server Docker Image
# Multi-stage build for production optimization

# Build stage
FROM node:20-alpine AS builder

LABEL maintainer="BoardGuru Team <enterprise@boardguru.com>"
LABEL description="BoardGuru Model Context Protocol Server - AI-powered board governance intelligence"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S boardguru -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=boardguru:nodejs /app/dist ./dist
COPY --from=builder --chown=boardguru:nodejs /app/demo ./demo

# Copy configuration files
COPY --chown=boardguru:nodejs mcp-config.json ./
COPY --chown=boardguru:nodejs README.md ./
COPY --chown=boardguru:nodejs LICENSE ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R boardguru:nodejs /app/logs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: process.env.PORT || 3000, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Switch to non-root user
USER boardguru

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]

# Docker build args for CI/CD
ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE
ARG VCS_REF

# Labels for metadata
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.version=$BUILD_VERSION
LABEL org.label-schema.vcs-ref=$VCS_REF
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="boardguru-mcp-server"
LABEL org.label-schema.description="Enterprise AI-powered board governance intelligence"
LABEL org.label-schema.url="https://boardguru.com"
LABEL org.label-schema.vcs-url="https://github.com/boardguru/mcp-server"
LABEL org.label-schema.vendor="BoardGuru"

# OCI Labels (new standard)
LABEL org.opencontainers.image.title="BoardGuru MCP Server"
LABEL org.opencontainers.image.description="AI-powered board governance intelligence platform"
LABEL org.opencontainers.image.version=$BUILD_VERSION
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.vendor="BoardGuru"
LABEL org.opencontainers.image.authors="BoardGuru Team <enterprise@boardguru.com>"
LABEL org.opencontainers.image.url="https://boardguru.com"
LABEL org.opencontainers.image.source="https://github.com/boardguru/mcp-server"
LABEL org.opencontainers.image.documentation="https://docs.boardguru.com/mcp"
LABEL org.opencontainers.image.licenses="Commercial"