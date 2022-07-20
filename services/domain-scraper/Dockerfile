FROM rust:alpine AS builder
RUN rustup default stable && rustup update stable
RUN apk add openssl-dev gcc libc-dev
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

FROM alpine AS runtime
COPY --from=builder /usr/src/app/target/release/fish-domain-scraper /bin/fish-domain-scraper
ENTRYPOINT [ "/bin/fish-domain-scraper" ]
