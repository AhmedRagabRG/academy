FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@postgres:5432/alsalam" npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
