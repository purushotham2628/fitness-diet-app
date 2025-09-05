import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    age: '',
    height: '',
    weight: '',
    fitness_goal: '',
    activity_level: '',
    target_calories: ''
  });
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalCaloriesBurned: 0,
    totalMeals: 0,
    memberSince: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile', { withCredentials: true });
      setProfile(response.data || {});
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/profile/stats', { withCredentials: true });
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await axios.put('/api/profile', profile, { withCredentials: true });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const calculateBMI = () => {
    const heightNum = parseFloat(profile.height);
    const weightNum = parseFloat(profile.weight);
    if (heightNum > 0 && weightNum > 0) {
      const heightInMeters = heightNum / 100;
      const bmi = weightNum / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#17a2b8' };
    if (bmi < 25) return { category: 'Normal', color: '#28a745' };
    if (bmi < 30) return { category: 'Overweight', color: '#ffc107' };
    return { category: 'Obese', color: '#dc3545' };
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <div>
      <div className="card">
        <h1>👤 Profile</h1>
        <p>Manage your personal information and fitness goals</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Personal Information</h2>
          {message && (
            <div className={message.includes('successfully') ? 'success' : 'error'}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={profile.age || ''}
                onChange={handleInputChange}
                min="13"
                max="120"
                placeholder="25"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="height">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={profile.height || ''}
                  onChange={handleInputChange}
                  min="100"
                  max="250"
                  placeholder="170"
                />
              </div>
              <div className="form-group">
                <label htmlFor="weight">Weight (kg)</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={profile.weight || ''}
                  onChange={handleInputChange}
                  min="30"
                  max="300"
                  step="0.1"
                  placeholder="70"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fitness_goal">Fitness Goal</label>
              <select
                id="fitness_goal"
                name="fitness_goal"
                value={profile.fitness_goal || ''}
                onChange={handleInputChange}
              >
                <option value="">Select a goal</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="weight_gain">Weight Gain</option>
                <option value="muscle_building">Muscle Building</option>
                <option value="general_fitness">General Fitness</option>
                <option value="endurance">Endurance Training</option>
                <option value="strength">Strength Training</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="activity_level">Activity Level</label>
              <select
                id="activity_level"
                name="activity_level"
                value={profile.activity_level || ''}
                onChange={handleInputChange}
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="target_calories">Daily Calorie Target</label>
              <input
                type="number"
                id="target_calories"
                name="target_calories"
                value={profile.target_calories || ''}
                onChange={handleInputChange}
                min="1000"
                max="5000"
                placeholder="2000"
              />
            </div>

            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div>
          <div className="card">
            <h2>Health Metrics</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{user?.username || 'Anonymous'}</div>
                <div className="stat-label">Username</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{profile.age || 'Not set'}</div>
                <div className="stat-label">Age</div>
              </div>
            </div>

            {bmi && bmiInfo && (
              <div style={{
                background: '#f8f9fa',
                padding: 20,
                borderRadius: 10,
                margin: '20px 0',
                textAlign: 'center'
              }}>
                <h3>BMI Calculator</h3>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: bmiInfo.color,
                  margin: '10px 0'
                }}>{bmi}</div>
                <div style={{ color: bmiInfo.color, fontWeight: 'bold' }}>{bmiInfo.category}</div>
                <small style={{ color: '#666', display: 'block', marginTop: 10 }}>
                  Based on height: {profile.height}cm, weight: {profile.weight}kg
                </small>
              </div>
            )}

            {profile.target_calories && (
              <div style={{ marginTop: 20 }}>
                <h4>Daily Calorie Target: {profile.target_calories} calories</h4>
                <div className="progress-bar" style={{ marginTop: 10 }}>
                  <div className="progress-fill" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Fitness Statistics</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.totalWorkouts || 0}</div>
                <div className="stat-label">Total Workouts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalCaloriesBurned || 0}</div>
                <div className="stat-label">Calories Burned</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.totalMeals || 0}</div>
                <div className="stat-label">Meals Logged</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : 'Today'}
                </div>
                <div className="stat-label">Member Since</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>🎯 Fitness Recommendations</h2>
        <div className="grid grid-2">
          <div>
            <h3>Based on Your Goals</h3>
            {profile.fitness_goal === 'weight_loss' && (
              <div>
                <p>💡 <strong>Weight Loss Tips:</strong></p>
                <ul style={{ marginLeft: 20, marginTop: 10 }}>
                  <li>Maintain a caloric deficit of 300-500 calories per day</li>
                  <li>Focus on cardio exercises 4-5 times per week</li>
                  <li>Include strength training 2-3 times per week</li>
                  <li>Track your meals consistently</li>
                </ul>
              </div>
            )}
            {profile.fitness_goal === 'muscle_building' && (
              <div>
                <p>💡 <strong>Muscle Building Tips:</strong></p>
                <ul style={{ marginLeft: 20, marginTop: 10 }}>
                  <li>Eat in a slight caloric surplus (200-500 calories)</li>
                  <li>Focus on strength training 4-6 times per week</li>
                  <li>Consume 1.6-2.2g protein per kg body weight</li>
                  <li>Allow adequate rest between workouts</li>
                </ul>
              </div>
            )}
            {profile.fitness_goal === 'general_fitness' && (
              <div>
                <p>💡 <strong>General Fitness Tips:</strong></p>
                <ul style={{ marginLeft: 20, marginTop: 10 }}>
                  <li>Aim for 150 minutes of moderate cardio per week</li>
                  <li>Include strength training 2-3 times per week</li>
                  <li>Stay hydrated and eat a balanced diet</li>
                  <li>Get 7-9 hours of sleep per night</li>
                </ul>
              </div>
            )}
            {!profile.fitness_goal && <p>Set your fitness goal above to get personalized recommendations!</p>}
          </div>

          <div>
            <h3>Next Steps</h3>
            <div className="achievement-list">
              {!profile.age && <div className="achievement-item">📝 Complete your profile information</div>}
              {stats.totalWorkouts < 5 && <div className="achievement-item">🏋️‍♂️ Log 5 workouts to unlock achievement</div>}
              {stats.totalMeals < 10 && <div className="achievement-item">🍎 Track 10 meals to improve nutrition insights</div>}
              {profile.fitness_goal && profile.age && stats.totalWorkouts >= 5 && (
                <div className="achievement-item">🎉 You're making great progress! Keep it up!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
