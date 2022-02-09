FROM node:16 AS builder

RUN apt update -y && apt install -y protobuf-compiler
RUN yarn global add prisma ts-protoc-gen

WORKDIR /usr/src/app

COPY \
  ./services/bot/package.json \
  ./services/bot/yarn.lock \
  ./services/bot/tsconfig.json \
  ./

RUN yarn

COPY ./services/bot/. .
COPY ./protos ./protos

RUN mkdir -p build/lib/protos
RUN protoc \
  -I=./protos \
  --ts_out="./lib/protos" \
  --js_out="import_style=commonjs,binary:./build/lib/protos" \
  ./protos/*.proto

RUN prisma generate
RUN yarn run build

ENTRYPOINT ["yarn", "run", "start"]
