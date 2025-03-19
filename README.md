# Treasure Hunt Educational Game

This is a web-based treasure hunt game built with React frontend and Express/MongoDB backend.

## Features

- Real-time multiplayer treasure hunt game using Socket.io
- Admin dashboard to monitor and control the game
- Three rounds of competitive gameplay
- Authentication system for participants
- MongoDB database for storing player data and game state

## Deployment to Vercel

This project is configured for easy deployment to Vercel. Follow these steps:

### Prerequisites

1. A GitHub account
2. A Vercel account (you can sign up at [vercel.com](https://vercel.com) using your GitHub account)
3. A MongoDB Atlas account for the database

### Step 1: Push your code to GitHub

1. Create a new GitHub repository
2. Initialize git in your project directory if not already done:
   ```
   git init
   ```
3. Add your files to git:
   ```
   git add .
   ```
4. Commit your changes:
   ```
   git commit -m "Initial commit"
   ```
5. Add your GitHub repository as a remote:
   ```
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```
6. Push your code to GitHub:
   ```
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Log in to your Vercel account
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Root Directory: Leave as `/` (default)
   - Build Command: Vercel will automatically detect it from the `vercel.json` file
   - Output Directory: Vercel will automatically detect it
   
5. Add your environment variables:
   - `MONGO_URI`: Your MongoDB connection string
   
6. Click "Deploy"

Vercel will automatically build and deploy your project. Once the deployment is complete, you'll be provided with a URL where your application is hosted.

### Troubleshooting

- If you encounter socket.io connection issues, make sure the path is correctly set in your frontend code
- If MongoDB connections fail, verify your Atlas connection string is correct and the IP is whitelisted
- If you encounter npm dependency conflicts during deployment, the project includes a `.npmrc` file with `legacy-peer-deps=true` which should resolve these issues automatically
- If deployment fails with package conflicts, you may need to manually run `npm install --legacy-peer-deps` before deploying

## Local Development

1. Install dependencies:
   ```
   npm install --legacy-peer-deps
   cd backend && npm install
   ```

2. Start the backend server:
   ```
   cd backend && npm start
   ```

3. In a new terminal, start the frontend:
   ```
   npm start
   ```

## Tech Stack

- Frontend: React, Socket.io client
- Backend: Node.js, Express, Socket.io
- Database: MongoDB
- Deployment: Vercel

## Game Flow

1. **Landing Page**: A visually engaging landing page with multiple distractions to mislead players. Only one hidden link leads to Round 2.
2. **Hidden Link Mechanism**: The real link is hidden within HTML, CSS, or JavaScript Console.
3. **Backend Logic**: Express.js routes to handle player validation and progress tracking.
4. **Admin Panel**: For tracking players and game progress.

## Hidden Link Clues

The hidden link to Round 2 can be found in one of the following ways:
- Inspect the page source code
- Check the browser console
- Look for transparent text
- Find the invisible link on the page

Good luck!