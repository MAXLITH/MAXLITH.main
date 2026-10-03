FROM node:22-alpine
WORKDIR /app
COPY services/market-stream/package.json services/market-stream/package-lock.json ./
RUN npm ci --omit=dev
COPY services/market-stream/server.mjs ./server.mjs
ENV NODE_ENV=production
EXPOSE 4100
CMD ["node", "server.mjs"]
