# Use the latest Node.js version
FROM node:latest

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for efficient caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install PM2 globally
RUN npm install pm2 -g

# Copy the rest of the app
COPY . .

# Expose the port from the .env file
ARG PORT
ENV PORT=${PORT}

# Create a PM2 ecosystem file
COPY ecosystem.config.js .

# Start the application
# CMD ["node", "index.js"]

CMD ["pm2-runtime", "ecosystem.config.js"]
