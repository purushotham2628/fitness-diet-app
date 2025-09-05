import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Components
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import WorkoutTracker from './components/WorkoutTracker';
import DietTracker from './components/DietTracker';
import Progress from './components/Progress';
import Community from './components/Community';
import Profile from './components/Profile';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {user && <Navbar />}
      <div className="container">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <Register />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/workouts" 
            element={user ? <WorkoutTracker /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/diet" 
            element={user ? <DietTracker /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/progress" 
            element={user ? <Progress /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/community" 
            element={user ? <Community /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={user ? <Profile /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </>
  );
}

export default App;