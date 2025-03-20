# Vercel Deployment Guide

Follow these steps to deploy the application on Vercel:

## 1. Push Changes to GitHub

First, push all the changes to your GitHub repository:

```bash
git add .
git commit -m "Update configuration for Vercel deployment"
git push
```

## 2. Configure Vercel Project Settings

### General Settings

1. Go to your project in the Vercel dashboard
2. Navigate to "Settings" -> "General"
3. Set the following:
   - Framework Preset: Create React App
   - Build Command: `npm run vercel-build`
   - Output Directory: `build`
   - Install Command: `npm install --legacy-peer-deps`

### Environment Variables

Navigate to "Settings" -> "Environment Variables" and add:

```
MONGODB_URI=mongodb+srv://rounds:rounds123@aiodysseyrounds.rr88p.mongodb.net/?retryWrites=true&w=majority&appName=AIODYSSEYRounds
NODE_ENV=production
```

## 3. Redeployment

1. Go to "Deployments" tab
2. Find your latest deployment
3. Click the three dots menu (...) and select "Redeploy"
4. Choose "Redeploy with existing Build Cache"

## 4. Verify Deployment

1. Once deployment completes, click "Visit" to open your site
2. Check the browser console for any errors
3. Test the admin login functionality
4. Verify that WebSocket connections are working properly

## Troubleshooting

If you encounter issues:

1. Check Vercel deployment logs for errors
2. Verify the environment variables are set correctly
3. Check browser console for client-side errors
4. Ensure MongoDB connection is working

### 404 NOT_FOUND Issues

If you get 404 errors:

1. Make sure your vercel.json has proper routes configuration
2. Verify that all API routes are properly configured
3. Check that the serverless function configuration is correct

## Serverless Function Optimization

For production use, it's recommended to:

1. Add proper error handling in serverless functions
2. Implement connection pooling for MongoDB
3. Add caching for frequently accessed resources
4. Monitor performance and adjust resources as needed 