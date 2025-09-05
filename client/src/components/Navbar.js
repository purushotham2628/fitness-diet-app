import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="navbar-content">
        <Link to="/dashboard" className="navbar-brand">
          🏃‍♀️ Fitness &amp; Diet Tracker
        </Link>
        <div className="navbar-nav">
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/workouts" className={isActive('/workouts') ? 'active' : ''}>
            Workouts
          </Link>
          <Link to="/diet" className={isActive('/diet') ? 'active' : ''}>
            Diet
          </Link>
          <Link to="/progress" className={isActive('/progress') ? 'active' : ''}>
            Progress
          </Link>
          <Link to="/community" className={isActive('/community') ? 'active' : ''}>
            Community
          </Link>
          <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
            Profile
          </Link>
          <span style={{ marginLeft: '1rem', fontWeight: 'bold' }}>
            Hello, {user?.username || 'Guest'}!
          </span>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            aria-label="Logout"
            style={{ marginLeft: '1rem' }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
