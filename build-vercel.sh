#!/bin/bash

# Exit on errors
set -e

echo "Starting Vercel build process..."

# Remove any existing build artifacts
rm -rf build
rm -rf node_modules/.cache

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the React application
echo "Building React application..."
CI=false npm run build

echo "Creating Vercel-specific files..."

# Create a .vercel directory if it doesn't exist
mkdir -p .vercel/output

# Copy the build directory to the correct location for Vercel
cp -R build .vercel/output/static

# Create the Vercel config.json file
cat > .vercel/output/config.json << EOL
{
  "version": 3,
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/server.js" },
    { "src": "/socket.io(/?.*)", "dest": "/backend/server.js" },
    { "src": "/socket-check", "dest": "/backend/server.js" },
    { "src": "/health", "dest": "/backend/server.js" },
    { "src": "/current-port.txt", "dest": "/backend/server.js" },
    { "src": "/(.*\\.(js|json|css|ico|png|jpg|svg|ttf|woff|woff2)$)", "dest": "/static/\$1" },
    { "src": "/(.*)", "dest": "/static/index.html" }
  ]
}
EOL

# Create a functions directory for serverless functions
mkdir -p .vercel/output/functions

echo "Build process completed successfully!"
echo "You can now deploy to Vercel using 'vercel --prod'" 