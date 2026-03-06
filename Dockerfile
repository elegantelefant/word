FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
COPY manifest.prod.xml /usr/share/nginx/html/manifest.xml

EXPOSE 8080
