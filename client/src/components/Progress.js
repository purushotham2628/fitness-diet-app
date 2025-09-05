import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const Progress = () => {
  const [progressData, setProgressData] = useState({
    weekly: [],
    monthly: [],
    workoutTypes: [],
    nutritionBreakdown: []
  });
  const [timeframe, setTimeframe] = useState('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, [timeframe]);

  const fetchProgressData = async () => {
    try {
      const response = await axios.get(`/api/progress/${timeframe}`, {
        withCredentials: true
      });
      setProgressData(response.data);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

  if (loading) {
    return <div className="loading">Loading progress data...</div>;
  }

  const currentData = progressData[timeframe] || [];

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>📊 Progress Tracking</h1>
          <div>
            <button 
              className={`btn ${timeframe === 'weekly' ? '' : 'btn-secondary'}`}
              onClick={() => setTimeframe('weekly')}
              style={{ marginRight: '10px' }}
            >
              Weekly
            </button>
            <button 
              className={`btn ${timeframe === 'monthly' ? '' : 'btn-secondary'}`}
              onClick={() => setTimeframe('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Calorie Balance Chart */}
      {currentData.length > 0 && (
        <div className="chart-container">
          <h2 className="chart-title">
            Calories Burned vs Consumed ({timeframe === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'})
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [
                  `${value} calories`,
                  name === 'caloriesBurned' ? 'Burned' : 'Consumed'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="caloriesBurned" 
                stroke="#667eea" 
                strokeWidth={3}
                name="Calories Burned"
                dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="caloriesConsumed" 
                stroke="#764ba2" 
                strokeWidth={3}
                name="Calories Consumed"
                dot={{ fill: '#764ba2', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-2">
        {/* Workout Types Breakdown */}
        {progressData.workoutTypes && progressData.workoutTypes.length > 0 && (
          <div className="chart-container">
            <h2 className="chart-title">Workout Types Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={progressData.workoutTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {progressData.workoutTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} workouts`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Nutrition Breakdown */}
        {progressData.nutritionBreakdown && progressData.nutritionBreakdown.length > 0 && (
          <div className="chart-container">
            <h2 className="chart-title">Average Daily Nutrition</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progressData.nutritionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`${value}g`, 'Amount']} />
                <Bar dataKey="value" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-3">
        <div className="card">
          <h3>🔥 Total Calories Burned</h3>
          <div className="stat-value">
            {currentData.reduce((sum, day) => sum + (day.caloriesBurned || 0), 0)}
          </div>
          <div className="stat-label">
            {timeframe === 'weekly' ? 'This Week' : 'This Month'}
          </div>
        </div>

        <div className="card">
          <h3>🍽️ Total Calories Consumed</h3>
          <div className="stat-value">
            {currentData.reduce((sum, day) => sum + (day.caloriesConsumed || 0), 0)}
          </div>
          <div className="stat-label">
            {timeframe === 'weekly' ? 'This Week' : 'This Month'}
          </div>
        </div>

        <div className="card">
          <h3>⚖️ Calorie Balance</h3>
          <div className="stat-value" style={{
            color: currentData.reduce((sum, day) => sum + ((day.caloriesBurned || 0) - (day.caloriesConsumed || 0)), 0) >= 0 ? '#28a745' : '#dc3545'
          }}>
            {currentData.reduce((sum, day) => sum + ((day.caloriesBurned || 0) - (day.caloriesConsumed || 0)), 0) >= 0 ? '+' : ''}
            {currentData.reduce((sum, day) => sum + ((day.caloriesBurned || 0) - (day.caloriesConsumed || 0)), 0)}
          </div>
          <div className="stat-label">
            {timeframe === 'weekly' ? 'This Week' : 'This Month'}
          </div>
        </div>
      </div>

      {/* Goals and Achievements */}
      <div className="card">
        <h2>🎯 Goals & Achievements</h2>
        <div className="grid grid-2">
          <div>
            <h3>Weekly Goals</h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Workout Days (Goal: 4/week)</span>
                <span>{Math.min(currentData.filter(day => day.caloriesBurned > 0).length, 4)}/4</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min((currentData.filter(day => day.caloriesBurned > 0).length / 4) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Calories Burned (Goal: 2000/week)</span>
                <span>{Math.min(currentData.reduce((sum, day) => sum + (day.caloriesBurned || 0), 0), 2000)}/2000</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min((currentData.reduce((sum, day) => sum + (day.caloriesBurned || 0), 0) / 2000) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div>
            <h3>Achievements</h3>
            <div className="achievement-list">
              {currentData.reduce((sum, day) => sum + (day.caloriesBurned || 0), 0) >= 2000 && (
                <div className="achievement-item">
                  🏆 Weekly Calorie Goal Achieved!
                </div>
              )}
              {currentData.filter(day => day.caloriesBurned > 0).length >= 4 && (
                <div className="achievement-item">
                  🔥 4+ Workout Days This Week!
                </div>
              )}
              {currentData.some(day => (day.caloriesBurned || 0) > 500) && (
                <div className="achievement-item">
                  💪 High-Intensity Workout Completed!
                </div>
              )}
              {currentData.filter(day => day.caloriesBurned > 0).length === 0 && (
                <div className="achievement-item" style={{ color: '#666' }}>
                  Start your first workout to unlock achievements!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {currentData.length === 0 && (
        <div className="card text-center">
          <h2>No Data Available</h2>
          <p>Start logging workouts and meals to see your progress here!</p>
        </div>
      )}
    </div>
  );
};

export default Progress;