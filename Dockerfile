# Use Node.js 20 Alpine (required for Prisma 6.15.0)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Copy Prisma schema BEFORE installing dependencies (needed for postinstall)
COPY prisma ./prisma/

# Install dependencies (use npm install since no package-lock.json exists)
# This will automatically run "prisma generate" via postinstall script
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY src ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Change ownership of the app directory
RUN chown -R backend:nodejs /app
USER backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
