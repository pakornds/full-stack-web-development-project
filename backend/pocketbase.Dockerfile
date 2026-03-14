FROM alpine:3.20

ARG PB_VERSION=0.36.6

RUN apk add --no-cache wget unzip ca-certificates

WORKDIR /pb

RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip -d /pb \
    && rm /tmp/pocketbase.zip \
    && chmod +x /pb/pocketbase

EXPOSE 8090

VOLUME ["/pb/pb_data", "/pb/pb_migrations"]

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]