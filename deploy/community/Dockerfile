FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ENV NODE_ENV=production
ENV GYM_API_HOST=0.0.0.0
ENV GYM_API_PORT=8082

EXPOSE 8082
CMD ["npm", "run", "server"]
