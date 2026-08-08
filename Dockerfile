FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm ci

# Copia o restante do código
COPY . .

# Argumento para definir a URL do backend no frontend durante a build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Define a variável de ambiente para produção, 
# para que o servidor sirva a pasta dist/
ENV NODE_ENV=production

# Faz o build do frontend e do backend (server.ts)
RUN npm run build

# Expõe a porta que o server.ts utiliza
EXPOSE 3000

# Inicia o servidor
CMD ["npm", "start"]
