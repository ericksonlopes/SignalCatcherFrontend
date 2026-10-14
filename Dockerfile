# Estágio 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY --chown=node:node package.json package-lock.json ./

# Instala as dependências de compilação
RUN npm ci

# Copia explicitamente apenas os arquivos e pastas necessários (evita COPY . . - docker:S6470)
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node index.html tsconfig.json vite.config.ts server.ts ./

# Argumento para definir a URL do backend no frontend durante a build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Faz o build do frontend (SPA) e do servidor (server.ts para dist/server.js)
RUN npm run build

# Remove dependências de desenvolvimento mantendo apenas as de runtime
RUN npm prune --omit=dev

# Estágio 2: Imagem final de execução (mínima e segura)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia apenas os artefatos compilados e dependências essenciais de produção
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# Executa o contêiner com usuário não-root (docker:S6471)
USER node

# Expõe a porta que o server.ts utiliza
EXPOSE 3000

# Inicia o servidor diretamente com node (sem overhead do npm)
CMD ["node", "dist/server.js"]
