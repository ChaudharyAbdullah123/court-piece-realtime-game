# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code files
COPY . .

# Expose backend port
EXPOSE 5000

# Set environment variables defaults
ENV PORT=5000
ENV NODE_ENV=production

# Run start script
CMD ["npm", "start"]
