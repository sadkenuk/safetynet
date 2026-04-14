FROM nginx:1.27-alpine

# Copy static assets
COPY index.html /usr/share/nginx/html/index.html
COPY css/       /usr/share/nginx/html/css/
COPY js/        /usr/share/nginx/html/js/

# Replace default nginx config with our proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
