# BoardGuru Production Dockerfile
# Multi-stage build for optimization

# Build stage
FROM node:18-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG BUILD_TIME
ARG GIT_SHA

# Add build metadata
LABEL build.time="${BUILD_TIME}"
LABEL build.git-sha="${GIT_SHA}"
LABEL build.node-env="${NODE_ENV}"

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile --production=false && npm cache clean --force

# Copy source code
COPY . .

# Security: Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user for build
USER nextjs

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Security: Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install only production dependencies
RUN npm ci --frozen-lockfile --production=true && npm cache clean --force

# Security: Remove package.json and lock files after installation
RUN rm package*.json

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]