#!/bin/bash

# Use the clean package.json without google-maps-react
echo "Using clean package.json file..."
if [ -f "fresh-package.json" ]; then
  cp fresh-package.json package.json
  echo "Successfully copied fresh-package.json to package.json"
else
  echo "WARNING: fresh-package.json not found!"
  # Try to remove google-maps-react directly as a fallback
  sed -i 's/"google-maps-react": "[^"]*",//g' package.json
  echo "Removed google-maps-react from package.json via sed"
fi

# Remove package-lock.json
echo "Removing package-lock.json..."
rm -f package-lock.json

# Install dependencies with legacy-peer-deps and force
echo "Installing dependencies with legacy-peer-deps and force flags..."
npm install --legacy-peer-deps --force

# Build the project
echo "Building project..."
npm run build 