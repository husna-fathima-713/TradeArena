# TradeArena

TradeArena is a full-stack stock market simulator that allows users to practice trading strategies in a risk-free, real-time environment.

## Tech Stack
- Frontend: React + Recharts
- Backend: Node.js + Express
- Database: MongoDB
- Deployment: Render + Vercel

## Features
- User authentication (login/register)
- Buy and sell stocks
- Real-time price simulation (updates every 5 seconds)
- Portfolio tracking (balance, holdings, total value)
- Profit & Loss (PnL) calculation
- Leaderboard ranking system
- Portfolio value graph

## Live Demo
Frontend: https://your-vercel-link  
Backend: https://tradearena-1.onrender.com  

## How It Works
- Stock prices are simulated and updated every 5 seconds
- Users can buy/sell stocks which updates their portfolio
- Total portfolio value is calculated dynamically
- Leaderboard ranks users based on their total value

## Setup Instructions

1. Clone the repository
2. Install dependencies

Backend:
cd backend  
npm install  
npm start  

Frontend:
cd frontend  
npm install  
npm run dev  

3. Create a `.env` file in backend:

MONGO_URI=your_mongodb_connection_string

## Project Structure
- /backend → API, database, trading logic
- /frontend → React UI and charts

## Author
Your Name
