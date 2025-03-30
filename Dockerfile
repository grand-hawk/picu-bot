# Build layer
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY . /build
WORKDIR /build

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN pnpx prisma generate
RUN pnpx prisma migrate deploy

RUN pnpm run build

RUN pnpm prune --prod

# Package layer
FROM node:22-alpine AS package

RUN apk --no-cache add curl file

WORKDIR /bot

COPY --from=build /build/dist dist
COPY --from=build /build/node_modules node_modules
COPY --from=build /build/prisma prisma

CMD ["node", "dist/index.js"]

EXPOSE 3000
