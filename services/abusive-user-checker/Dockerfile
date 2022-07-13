# FROM golang:alpine AS builder

# RUN apk add protoc

FROM golang:bullseye AS builder

RUN apt-get update -y
RUN apt-get install -y protobuf-compiler curl
RUN go install github.com/golang/protobuf/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
RUN curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-amd64 \
  && chmod +x /usr/local/bin/dbmate

WORKDIR /usr/src/app

COPY ./services/abusive-user-checker/. .
COPY ./protos ./protos

RUN mkdir -p pkg/protos
RUN protoc \
  -I=./protos \
  --go_out="." \
  --go-grpc_out="." \
  ./protos/*.proto

RUN go build -o abusive-user-checker cmd/server/main.go

FROM debian:stable-slim AS runtime
COPY --from=builder /usr/src/app/abusive-user-checker /bin
# this is such a hack -- idk how i should do db migrations
COPY --from=builder /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --from=builder /usr/src/app/db /db
ENTRYPOINT [ "/bin/abusive-user-checker" ]
