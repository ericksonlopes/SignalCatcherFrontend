FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY --chown=node:node package.json package-lock.json ./

# Instala as dependências
RUN npm ci

# Copia explicitamente apenas os arquivos e pastas necessários (evita COPY . . - docker:S6470)
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node index.html tsconfig.json vite.config.ts server.ts ./

# Argumento para definir a URL do backend no frontend durante a build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Define a variável de ambiente para produção, 
# para que o servidor sirva a pasta dist/
ENV NODE_ENV=production

# Faz o build do frontend e do backend (server.ts) e ajusta permissões
RUN npm run build && chown -R node:node /app

# Executa o contêiner com usuário não-root (docker:S6471)
USER node

# Expõe a porta que o server.ts utiliza
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "start"]
