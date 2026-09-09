FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends restic ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server/backup.ts server/backup-worker.ts ./server/
USER node
CMD ["node", "--import", "tsx", "server/backup-worker.ts"]
