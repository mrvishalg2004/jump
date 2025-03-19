#!/bin/bash

# Remove package-lock.json to prevent cached dependencies
echo "Removing package-lock.json..."
rm -f package-lock.json

# Use the clean package.json without google-maps-react
echo "Using clean package.json without problematic dependencies..."
if [ -f "clean-package.json" ]; then
  cp clean-package.json package.json
fi

# Install dependencies with legacy-peer-deps flag
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build the project
echo "Building project..."
npm run build 