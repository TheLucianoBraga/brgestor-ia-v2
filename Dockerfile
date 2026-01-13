# Dockerfile
# multi-stage build: build com Node, serve estático com nginx
FROM node:20-bullseye AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . .
# Build com as variáveis de ambiente do .env
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL
RUN npm run build

FROM nginx:stable-alpine AS production
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
