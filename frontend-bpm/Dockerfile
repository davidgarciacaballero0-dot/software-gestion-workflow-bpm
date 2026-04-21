# ============================================================
# Dockerfile - Frontend BPM (Angular 20)
# ============================================================

# --- Etapa 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration production

# --- Etapa 2: Runtime (Nginx) ---
FROM nginx:alpine
COPY --from=build /app/dist/frontend-bpm/browser /usr/share/nginx/html
# Copiar configuración de proxy y rutas SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
