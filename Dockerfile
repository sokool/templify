FROM nginxinc/nginx-unprivileged:alpine

COPY --chown=101:101 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 app/ /usr/share/nginx/html/app/
COPY --chown=101:101 ui/ /usr/share/nginx/html/ui/
