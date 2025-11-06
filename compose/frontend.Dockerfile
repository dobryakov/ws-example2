FROM nginx:alpine

# Copy static files
COPY frontend/public /usr/share/nginx/html

# Create nginx config with environment variable substitution
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index1.html; \
    location / { \
        try_files $uri $uri/ /index1.html; \
    } \
    location /sw.js { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        add_header Pragma "no-cache"; \
        add_header Expires "0"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

