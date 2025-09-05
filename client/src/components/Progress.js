import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
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
    const fetchProgressData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/progress/${timeframe}`, { withCredentials: true });
        const data = response.data || {};
        setProgressData({
          weekly: data.weekly || [],
          monthly: data.monthly || [],
          workoutTypes: data.workoutTypes || [],
          nutritionBreakdown: data.nutritionBreakdown || []
        });
      } catch (error) {
        console.error('Error fetching progress data:', error);
        setProgressData({
          weekly: [],
          monthly: [],
          workoutTypes: [],
          nutritionBreakdown: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [timeframe]);

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];

  if (loading) {
    return <div className="loading">Loading progress data...</div>;
  }

  // Select data for current timeframe
  const currentData = progressData[timeframe] || [];

  const totalCaloriesBurned = currentData.reduce((sum, day) => sum + (day.caloriesBurned || 0), 0);
  const totalCaloriesConsumed = currentData.reduce((sum, day) => sum + (day.caloriesConsumed || 0), 0);
  const calorieBalance = totalCaloriesBurned - totalCaloriesConsumed;
  const formattedCalorieBalance = calorieBalance > 0 ? `+${calorieBalance}` : calorieBalance.toString();

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>📊 Progress Tracking</h1>
          <div>
            <button
              className={`btn ${timeframe === 'weekly' ? '' : 'btn-secondary'}`}
              onClick={() => setTimeframe('weekly')}
              style={{ marginRight: 10 }}
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

      {/* Calorie Line Chart */}
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
                tickFormatter={value => new Date(value).toLocaleDateString()} 
              />
              <YAxis />
              <Tooltip 
                labelFormatter={value => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [`${value} calories`, name === 'caloriesBurned' ? 'Burned' : 'Consumed']}
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
        {/* Workout Types Pie Chart */}
        {progressData.workoutTypes.length > 0 && (
          <div className="chart-container">
            <h2 className="chart-title">Workout Types Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={progressData.workoutTypes}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {progressData.workoutTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} workouts`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Nutrition Breakdown Bar Chart */}
        {progressData.nutritionBreakdown.length > 0 && (
          <div className="chart-container">
            <h2 className="chart-title">Average Daily Nutrition</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progressData.nutritionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}g`, 'Amount']} />
                <Bar dataKey="value" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3">
        <div className="card">
          <h3>🔥 Total Calories Burned</h3>
          <div className="stat-value">{totalCaloriesBurned}</div>
          <div className="stat-label">{timeframe === 'weekly' ? 'This Week' : 'This Month'}</div>
        </div>

        <div className="card">
          <h3>🍽️ Total Calories Consumed</h3>
          <div className="stat-value">{totalCaloriesConsumed}</div>
          <div className="stat-label">{timeframe === 'weekly' ? 'This Week' : 'This Month'}</div>
        </div>

        <div className="card">
          <h3>⚖️ Calorie Balance</h3>
          <div
            className="stat-value"
            style={{ color: calorieBalance >= 0 ? '#28a745' : '#dc3545' }}
          >
            {calorieBalance >= 0 ? '+' : ''}
            {calorieBalance}
          </div>
          <div className="stat-label">{timeframe === 'weekly' ? 'This Week' : 'This Month'}</div>
        </div>
      </div>

      {/* Goals and Achievements */}
      <div className="card">
        <h2>Goals & Achievements</h2>
        <div className="grid grid-2">
          <div>
            <h3>Weekly Goals</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span>Workout Days (Goal: 4/week)</span>
                <span>{Math.min(progressData[timeframe].filter(day => day.caloriesBurned > 0).length, 4)}/4</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((progressData[timeframe].filter(day => day.caloriesBurned > 0).length / 4) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span>Calories Burned (Goal: 2000)</span>
                <span>{Math.min(totalCaloriesBurned, 2000)}/2000</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((totalCaloriesBurned / 2000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <h3>Achievements</h3>
            <div className="achievement-list">
              {totalCaloriesBurned >= 2000 && <div className="achievement-item">🏆 Weekly Calorie Goal Achieved!</div>}
              {progressData[timeframe].filter(day => day.caloriesBurned > 0).length >= 4 && <div className="achievement-item">🔥 4+ Workout Days This Week!</div>}
              {progressData[timeframe].some(day => (day.caloriesBurned || 0) > 500) && <div className="achievement-item">💪 High-Intensity Workout Completed!</div>}
              {progressData[timeframe].length === 0 && <div className="achievement-item" style={{ color: '#666' }}>Start logging workouts to unlock achievements!</div>}
            </div>
          </div>
        </div>
      </div>

      {currentData.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <h2>No Data Available</h2>
          <p>Start logging workouts and meals to see your progress here!</p>
        </div>
      )}
    </div>
  );
};

export default Progress;
