FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci


FROM deps AS builder

WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server

RUN npm run build -w apps/server


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/apps/server/dist apps/server/dist

USER node

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "apps/server"]