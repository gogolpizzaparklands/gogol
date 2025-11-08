# Backend Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and install only production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Use environment PORT (default 5000)
EXPOSE 5000

CMD ["node", "server.js"]
