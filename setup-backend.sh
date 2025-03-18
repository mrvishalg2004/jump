#!/bin/bash

# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "PORT=5000" > .env
  echo "MONGO_URI=mongodb+srv://rounds:rounds123@aiodysseyrounds.rr88p.mongodb.net/?retryWrites=true&w=majority&appName=AIODYSSEYRounds" >> .env
  echo ".env file created!"
fi

echo "Backend setup complete!"
echo "To start the backend server, run: cd backend && npm run dev" 