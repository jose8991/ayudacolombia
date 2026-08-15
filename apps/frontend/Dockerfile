# El contexto es la raíz del monorepo: el frontend depende de packages/kit, que vive
# fuera de apps/frontend y npm debe poder resolver como workspace.
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/kit/package.json ./packages/kit/
RUN npm ci --ignore-scripts || npm install --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/kit ./packages/kit
COPY apps/frontend ./apps/frontend
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /repo/apps/frontend
RUN npm run build

FROM nginx:1.31-alpine AS final
LABEL org.opencontainers.image.description="SOS Pereira Frontend"
RUN apk add --no-cache wget
COPY --from=builder /repo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
