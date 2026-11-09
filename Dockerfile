FROM nginxinc/nginx-unprivileged:alpine

COPY --chown=101:101 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
COPY --chown=101:101 workspace/ /usr/share/nginx/html/workspace/
COPY --chown=101:101 storage/ /usr/share/nginx/html/storage/
COPY --chown=101:101 ui/ /usr/share/nginx/html/ui/
