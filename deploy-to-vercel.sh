#!/bin/bash

# Remove package-lock.json
echo "Removing package-lock.json..."
rm -f package-lock.json

# Remove google-maps-react from package.json
echo "Removing google-maps-react from package.json..."
sed -i '' '/google-maps-react/d' package.json

# Commit changes
echo "Committing changes..."
git add package.json
git commit -m "Remove google-maps-react dependency for Vercel deployment"

# Push to GitHub
echo "Pushing changes to GitHub..."
git push

# Deploy to Vercel
echo "Deploying to Vercel with force flag..."
vercel --force

echo "Deployment process completed." 