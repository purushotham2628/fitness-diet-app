# Fitness & Diet Tracker

## Overview
A comprehensive full-stack fitness and diet tracking application built with React.js, Node.js, Express.js, and SQLite. Features include workout tracking, nutrition analysis via Nutritionix API, progress visualization with Recharts, community sharing, and automated weekly email reports via Node-cron and Nodemailer.

## Architecture
- **Frontend**: React.js with components and context API (Port 5000)
- **Backend**: Node.js with Express.js framework (Port 3001)
- **Database**: SQLite with comprehensive schema for workouts, meals, and community
- **Authentication**: Session-based with bcrypt password hashing
- **APIs**: Nutritionix API for nutrition data
- **Email**: Nodemailer with Node-cron for weekly reports
- **Visualization**: Recharts for progress charts and analytics

## Project Structure
```
fitness-diet-app/
├── server.js                    # Main Express API server
├── package.json                 # Backend dependencies
├── client/                      # React frontend
│   ├── package.json            # Frontend dependencies
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── App.js              # Main React app
│   │   ├── index.js            # React entry point
│   │   ├── components/         # React components
│   │   │   ├── Auth/           # Login/Register
│   │   │   ├── Dashboard.js    # Main dashboard
│   │   │   ├── WorkoutTracker.js # Workout management
│   │   │   ├── DietTracker.js  # Diet and nutrition
│   │   │   ├── Progress.js     # Charts and analytics
│   │   │   ├── Community.js    # Social features
│   │   │   └── Profile.js      # User profile
│   │   ├── context/
│   │   │   └── AuthContext.js  # Authentication context
│   │   └── styles/             # CSS styling
└── fitness_diet.db             # SQLite database
```

## Features
### Core Functionality
- User registration and authentication with secure sessions
- Comprehensive workout tracking with exercises, sets, reps, weights
- Diet tracking with real nutrition data from Nutritionix API
- Progress visualization with interactive charts (weight, workouts, calories)
- Community features for sharing workouts and achievements
- User profiles with goals and statistics

### Advanced Features
- Real-time nutrition analysis using Nutritionix API
- Automated weekly fitness reports via email (Node-cron + Nodemailer)
- Interactive charts and analytics with Recharts
- Responsive design for all devices
- Session-based authentication with secure password hashing

## Development
- **Frontend Port**: 5000 (React development server)
- **Backend Port**: 3001 (Express API server)
- **Frontend Dev**: `cd client && npm start`
- **Backend Dev**: `npm run server`
- **Concurrent Dev**: `npm run dev`

## API Endpoints
### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/user` - Get current user
- `POST /api/logout` - User logout

### Workouts
- `GET /api/workouts` - Get user workouts
- `POST /api/workouts` - Add new workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout

### Diet & Nutrition
- `GET /api/meals` - Get user meals
- `POST /api/meals` - Add new meal
- `POST /api/nutrition/search` - Search food nutrition (Nutritionix)
- `DELETE /api/meals/:id` - Delete meal

### Progress & Analytics
- `GET /api/progress` - Get user progress data
- `POST /api/progress` - Add progress entry

### Community
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create new post
- `POST /api/community/posts/:id/like` - Like/unlike post

## Environment Variables
- `NUTRITIONIX_APP_ID` - Nutritionix API application ID
- `NUTRITIONIX_API_KEY` - Nutritionix API key
- `EMAIL_USER` - Email address for reports
- `EMAIL_PASS` - Email password/app password

## Recent Changes (September 2025)
- **Completed React Migration**: Transformed from vanilla JS to comprehensive React.js frontend
- **Enhanced Backend APIs**: Added full RESTful APIs for all features
- **Database Schema Expansion**: Comprehensive SQLite schema for workouts, meals, progress, community
- **Nutritionix Integration**: Real nutrition data integration for accurate food tracking
- **Email Automation**: Weekly fitness reports with Node-cron and Nodemailer
- **Data Visualization**: Interactive charts and progress tracking with Recharts
- **Community Features**: Social sharing and community posts functionality
- **Deployment Ready**: Configured for Replit autoscale deployment with proper production/development environments

## User Preferences
- Comprehensive full-stack application using modern React.js
- Real API integrations preferred over mock data
- Clean, organized component structure
- Responsive design for all devices
- Automated features like email reports valued