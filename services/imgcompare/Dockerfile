FROM golang:alpine AS builder

RUN apk add protoc
RUN go install github.com/golang/protobuf/protoc-gen-go@latest

WORKDIR /usr/src/app

COPY ./services/imgcompare/. .
COPY ./protos ./protos

RUN mkdir -p pkg/protos
RUN protoc \
  -I=./protos \
  --go_out="." \
  ./protos/*.proto

RUN go build -o imgcompare cmd/imagehasher/main.go

FROM alpine AS runtime
COPY --from=builder /usr/src/app/imgcompare /bin
ENTRYPOINT [ "imgcompare" ]
