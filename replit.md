# Fitness Diet App

## Overview
A full-stack fitness and diet tracking application built with Node.js, Express, and SQLite. The app allows users to register, login, and manage their fitness journey through a clean web interface.

## Architecture
- **Backend**: Node.js with Express framework
- **Database**: SQLite for user data storage
- **Frontend**: Vanilla JavaScript with responsive CSS
- **Authentication**: Session-based with bcrypt password hashing

## Project Structure
```
fitness-diet-app/
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── client/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Styling
│   └── script.js      # Frontend JavaScript
└── fitness_diet.db    # SQLite database (auto-created)
```

## Features
- User registration and authentication
- Session management
- Responsive web design
- RESTful API endpoints
- SQLite database with user management

## Development
- Port: 5000 (configured for Replit environment)
- Development server: `npm run dev` (uses nodemon)
- Production server: `npm start`

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/user` - Get current user
- `POST /api/logout` - User logout

## Recent Changes
- Configured for Replit environment with proper host settings (0.0.0.0:5000)
- Set up Express 5.x compatible routing
- Created responsive frontend with authentication flow
- Configured SQLite database with user table
- Set up deployment configuration for autoscale

## User Preferences
- Project imported from GitHub
- Minimal setup preferred - focus on functionality
- Full-stack application structure maintained