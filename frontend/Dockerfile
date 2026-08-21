FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# O bundle e estatico: a URL da API entra no build, nao no runtime.
# Precisa ser o endereco que o BROWSER alcanca (porta publicada no host),
# nao o nome do service no compose — o browser nao resolve a rede do Docker.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build


FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
