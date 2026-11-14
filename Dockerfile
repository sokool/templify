FROM node:24-alpine AS export-tool
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY LICENSE ./LICENSE
COPY ui/ ./ui/
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

COPY --chown=101:101 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
COPY --chown=101:101 favicon.ico favicon.svg /usr/share/nginx/html/
COPY --chown=101:101 workspace/ /usr/share/nginx/html/workspace/
COPY --chown=101:101 storage/ /usr/share/nginx/html/storage/
COPY --chown=101:101 ui/ /usr/share/nginx/html/ui/
COPY --from=export-tool --chown=101:101 /app/ui/tools/export/dist/ /usr/share/nginx/html/ui/tools/export/dist/
