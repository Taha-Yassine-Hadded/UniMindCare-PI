FROM node:18

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Supprimer les anciens modules locaux
RUN rm -rf node_modules

# Install dependencies
RUN npm install --build-from-source

# Copy the application code
COPY . .

# Expose the application port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
