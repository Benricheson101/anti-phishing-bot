FROM rust:alpine AS builder
RUN apk add build-base openssl-dev
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock dummy.rs ./
RUN sed -i 's#src/main.rs#dummy.rs#' Cargo.toml
ENV RUSTFLAGS=-Ctarget-feature=-crt-static
RUN cargo build --release
RUN sed -i 's#dummy.rs#dsrc/main.rs#' Cargo.toml
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo build --release

FROM alpine
RUN apk add build-base openssl
COPY --from=builder /usr/src/app/target/release/app /bin
CMD ["app"]
