import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalCaloriesBurned: 0,
    totalMeals: 0,
    averageCaloriesConsumed: 0
  });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, workoutsRes, mealsRes, progressRes] = await Promise.all([
        axios.get('/api/dashboard/stats', { withCredentials: true }),
        axios.get('/api/workouts/recent', { withCredentials: true }),
        axios.get('/api/meals/recent', { withCredentials: true }),
        axios.get('/api/dashboard/weekly-progress', { withCredentials: true })
      ]);
      setStats(statsRes.data || {});
      setRecentWorkouts(Array.isArray(workoutsRes.data) ? workoutsRes.data : []);
      setRecentMeals(Array.isArray(mealsRes.data) ? mealsRes.data : []);
      // weeklyProgress can sometimes be an object instead of an array, so check and correct:
      setWeeklyProgress(Array.isArray(progressRes.data) ? progressRes.data : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({});
      setRecentWorkouts([]);
      setRecentMeals([]);
      setWeeklyProgress([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  // Defensive: if weeklyProgress is not array, set to empty array
  const safeWeeklyProgress = Array.isArray(weeklyProgress) ? weeklyProgress : [];

  return (
    <div>
      <div className="card">
        <h1>Welcome back, {user?.username}! 🎉</h1>
        <p>Here's your fitness journey overview</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalWorkouts}</div>
          <div className="stat-label">Total Workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCaloriesBurned}</div>
          <div className="stat-label">Calories Burned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalMeals}</div>
          <div className="stat-label">Meals Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.averageCaloriesConsumed)}</div>
          <div className="stat-label">Avg Daily Calories</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2>Quick Actions</h2>
        <div className="grid grid-2">
          <Link to="/workouts" className="btn">
            🏋️‍♂️ Log Workout
          </Link>
          <Link to="/diet" className="btn">
            🍎 Add Meal
          </Link>
          <Link to="/progress" className="btn">
            📊 View Progress
          </Link>
          <Link to="/community" className="btn">
            👥 Community
          </Link>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      {safeWeeklyProgress.length > 0 && (
        <div className="chart-container">
          <h2 className="chart-title">Weekly Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safeWeeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="caloriesBurned"
                stroke="#667eea"
                strokeWidth={3}
                name="Calories Burned"
              />
              <Line
                type="monotone"
                dataKey="caloriesConsumed"
                stroke="#764ba2"
                strokeWidth={3}
                name="Calories Consumed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-2">
        {/* Recent Workouts */}
        <div className="card">
          <h2>Recent Workouts</h2>
          {Array.isArray(recentWorkouts) && recentWorkouts.length > 0 ? (
            recentWorkouts.map((workout) => (
              <div key={workout.id} className="workout-item">
                <div className="item-header">
                  <div className="item-title">{workout.exercise_name}</div>
                  <div className="item-date">
                    {workout.date ? new Date(workout.date).toLocaleDateString() : 'No date'}
                  </div>
                </div>
                <div className="item-details">
                  <div className="detail-item">
                    <div className="detail-value">{workout.duration}</div>
                    <div className="detail-label">Minutes</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-value">{workout.calories_burned}</div>
                    <div className="detail-label">Calories</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No workouts logged yet. <Link to="/workouts">Add your first workout!</Link></p>
          )}
        </div>

        {/* Recent Meals */}
        <div className="card">
          <h2>Recent Meals</h2>
          {Array.isArray(recentMeals) && recentMeals.length > 0 ? (
            recentMeals.map((meal) => (
              <div key={meal.id} className="meal-item">
                <div className="item-header">
                  <div className="item-title">{meal.food_name}</div>
                  <div className="item-date">
                    {meal.date ? new Date(meal.date).toLocaleDateString() : 'No date'}
                  </div>
                </div>
                <div className="item-details">
                  <div className="detail-item">
                    <div className="detail-value">{meal.calories}</div>
                    <div className="detail-label">Calories</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-value">{meal.quantity}</div>
                    <div className="detail-label">Serving</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No meals logged yet. <Link to="/diet">Add your first meal!</Link></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
