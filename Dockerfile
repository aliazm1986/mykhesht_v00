FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=development
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV WRANGLER_SEND_METRICS=false
ENV CLOUDFLARE_CF_FETCH_ENABLED=false

COPY package.json package-lock.json .npmrc ./
COPY vendor ./vendor
COPY scripts ./scripts

RUN npm ci --include=dev --include=optional --no-audit --no-fund

COPY . .

RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
