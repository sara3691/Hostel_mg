FROM node:20-alpine

WORKDIR /app

# Copy package files and prisma schema first for caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of backend code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose backend port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Sync database schema & start node server
CMD ["sh", "-c", "npx prisma db push && npm start"]
