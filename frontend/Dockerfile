FROM node:22-alpine

WORKDIR /app

# Copy the whole monorepo first
COPY . .

# Install root + workspace dependencies
RUN npm ci

ARG API_PROXY_ORIGIN
ENV API_PROXY_ORIGIN=$API_PROXY_ORIGIN

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Build turborepo
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
