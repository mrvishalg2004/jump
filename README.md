# Treasure Hunt Game

An interactive web-based treasure hunt where players must find a hidden link to proceed to the next round. Only the first 15 players who find and click the correct link qualify for Round 2.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Authentication**: Unique Player IDs (stored in MongoDB)
- **Real-time Updates**: Socket.io

## Game Flow

1. **Landing Page**: A visually engaging landing page with multiple distractions to mislead players. Only one hidden link leads to Round 2.
2. **Hidden Link Mechanism**: The real link is hidden within HTML, CSS, or JavaScript Console.
3. **Backend Logic**: Express.js routes to handle player validation and progress tracking.
4. **Admin Panel**: For tracking players and game progress.

## How to Run the Project

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following content:
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://rounds:rounds123@aiodysseyrounds.rr88p.mongodb.net/?retryWrites=true&w=majority&appName=AIODYSSEYRounds
   ```

4. Start the backend server:
   ```
   npm run dev
   ```

### Frontend Setup

1. In the root directory, install dependencies:
   ```
   npm install
   ```

2. Start the React development server:
   ```
   npm start
   ```

3. The application will be available at `http://localhost:3000`

## Game Routes

- `/treasure-hunt` - The main treasure hunt page
- `/round2` - The page for qualified players
- `/admin` - Admin dashboard (Email: vishalgolhar10@gmail.com, Password: vishalgolhar10@gmail.com#8421236102#7350168049)

## Hidden Link Clues

The hidden link to Round 2 can be found in one of the following ways:
- Inspect the page source code
- Check the browser console
- Look for transparent text
- Find the invisible link on the page

Good luck!
