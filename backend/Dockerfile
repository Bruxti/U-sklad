# syntax=docker/dockerfile:1.7

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

# OpenSSL нужен Prisma на Alpine (см. https://github.com/prisma/orm/issues/25817)
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- dev (docker-compose: hot-reload, devDeps intact) ----------
FROM build AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- prod-deps (урезанные зависимости для runtime) ----------
FROM build AS prod-deps
RUN npm prune --omit=dev

# ---------- runner (Render: без devDeps, USER node) ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build     --chown=node:node /app/dist         ./dist
COPY --from=build     --chown=node:node /app/prisma       ./prisma
COPY --from=build     --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/server.js"]
