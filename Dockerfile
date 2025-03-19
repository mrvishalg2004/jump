FROM node:18-alpine

WORKDIR /app

# Copy package.json and remove problematic dependency
COPY package.json .
RUN grep -v "google-maps-react" package.json > package.json.new && mv package.json.new package.json

# Copy other necessary files
COPY . .

# Install dependencies with flags to ignore peer dependency issues
RUN npm install --legacy-peer-deps --force

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 