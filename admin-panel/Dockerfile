# ---------- Stage 1: build ----------
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_URL=/api
ARG VITE_BASE_PATH=/
ARG VITE_PUSH_PUBLIC_KEY=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_BASE_PATH=$VITE_BASE_PATH \
    VITE_PUSH_PUBLIC_KEY=$VITE_PUSH_PUBLIC_KEY

RUN npm run build

# ---------- Stage 2: nginx ----------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
