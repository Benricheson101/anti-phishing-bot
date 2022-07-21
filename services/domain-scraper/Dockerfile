FROM rust:slim AS builder
RUN rustup default stable && rustup update stable
RUN apt-get update -y && apt-get install -y gcc libc-dev libssl-dev openssl pkg-config
WORKDIR /usr/src/app
COPY ./services/domain-scraper/. .
RUN cargo build --release

FROM debian:stable-slim AS runtime
RUN apt-get update -y && apt-get install -y ca-certificates curl
COPY --from=builder /usr/src/app/target/release/fish-domain-scraper /bin/fish-domain-scraper
ENTRYPOINT [ "/bin/fish-domain-scraper" ]
