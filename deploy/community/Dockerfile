FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY server ./server
COPY src ./src
COPY tsconfig.json ./
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV GYM_API_HOST=0.0.0.0
ENV GYM_API_PORT=8082

EXPOSE 8082
USER node
CMD ["node", "--import", "tsx", "server/index.ts"]
