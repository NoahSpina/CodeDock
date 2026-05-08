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
COPY apps/runner apps/runner

RUN npm run build -w apps/runner


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV EXEC_TIMEOUT_MS=5000
ENV MAX_OUTPUT_BYTES=100000
ENV PYTHON_IMAGE=python:3.12-alpine

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/runner/package.json apps/runner/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/apps/runner/dist apps/runner/dist

# Do not switch to USER node here.
# The runner needs access to /var/run/docker.sock, and socket permissions are easier
# to handle as root in a school-project deployment.
EXPOSE 5000

CMD ["npm", "run", "start", "-w", "apps/runner"]