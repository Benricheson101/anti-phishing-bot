FROM node:16 AS builder

RUN apt update -y && apt install -y protobuf-compiler
RUN yarn global add prisma grpc-tools

WORKDIR /usr/src/app

COPY \
  ./services/bot/package.json \
  ./services/bot/yarn.lock \
  ./services/bot/tsconfig.json \
  ./

RUN yarn

COPY ./services/bot/. .
COPY ./protos ./protos

RUN prisma generate

RUN mkdir -p ./lib/protos
RUN protoc \
  -I="./protos" \
  --plugin="protoc-gen-ts=./node_modules/.bin/protoc-gen-ts" \
  --plugin="protoc-gen-grpc=$(which grpc_tools_node_protoc_plugin)" \
  --grpc_out="grpc_js:./lib/protos" \
  --js_out="import_style=commonjs,binary:./lib/protos" \
  --ts_out="service=grpc-node,mode=grpc-js:./lib/protos" \
  ./protos/*.proto

RUN yarn run build

ENTRYPOINT ["yarn", "run", "start"]
