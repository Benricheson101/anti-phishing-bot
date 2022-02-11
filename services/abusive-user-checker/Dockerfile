FROM golang:alpine AS builder

RUN apk add protoc
RUN go install github.com/golang/protobuf/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

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

FROM alpine AS runtime
COPY --from=builder /usr/src/app/abusive-user-checker /bin
ENTRYPOINT [ "abusive-user-checker" ]
