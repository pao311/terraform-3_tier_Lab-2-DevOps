# Base image with Node 20 and pnpm
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl
RUN corepack enable
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Build stage
FROM deps AS builder
COPY . .
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"
RUN pnpm db:generate
RUN pnpm build

# Production image
FROM base AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main"]