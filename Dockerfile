# Multi-stage Dockerfile for MAXLITH - Indian Equities Paper Trading Platform
FROM node:22-alpine AS base

# Install build dependencies for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all source files
COPY . .

# Set environment for production build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install runtime libraries
RUN apk add --no-cache libc6-compat

# Copy built app and node_modules from base
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/data ./data

EXPOSE 3000

CMD ["npm", "start"]
