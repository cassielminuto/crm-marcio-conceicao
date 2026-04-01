# ============================================
# Estágio 1: Build do Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================
# Estágio 2: Backend + Frontend estático
# ============================================
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de sistema (Prisma + ffmpeg para split de audio)
RUN apk add --no-cache openssl ffmpeg

# Copiar dependências do backend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar código do backend
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY uploads/ ./uploads/

# Gerar Prisma Client
RUN npx prisma generate

# Copiar frontend buildado
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Criar diretório de uploads
RUN mkdir -p uploads/calls uploads/prints uploads/avatars

EXPOSE 3001

CMD ["node", "src/server.js"]
