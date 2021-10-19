FROM node:16 AS builder

RUN yarn global add prisma

# ENV DATABASE_URL=postgresql://postgers@localhost/fish

WORKDIR /usr/src/app

COPY package.json yarn.lock tsconfig.json ./

RUN yarn

COPY . .

RUN prisma generate
RUN yarn run build:clean

CMD ["yarn", "run", "start"]
