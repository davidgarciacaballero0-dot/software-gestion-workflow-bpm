# ============================================================
# Dockerfile - Frontend BPM (Angular 20)
# ============================================================

# --- Etapa 1: Runtime (Nginx) ---
FROM nginx:alpine

# Copiar compilación local
COPY dist/frontend-bpm/browser /usr/share/nginx/html

# Copiar configuración de proxy y rutas SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
