import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WorkoutTracker = () => {
  const [workouts, setWorkouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    exercise_name: '',
    duration: '',
    calories_burned: '',
    notes: '',
  });

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const response = await axios.get('/api/workouts', { withCredentials: true });
      const data = response.data;
      setWorkouts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/workouts', formData, {
        withCredentials: true,
      });
      const newWorkout = response.data;
      setWorkouts((prevWorkouts) => [newWorkout, ...prevWorkouts]);
      setFormData({
        exercise_name: '',
        duration: '',
        calories_burned: '',
        notes: '',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding workout:', error);
      alert('Failed to add workout');
    }
  };

  const deleteWorkout = async (id) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        await axios.delete(`/api/workouts/${id}`, { withCredentials: true });
        setWorkouts((prevWorkouts) => prevWorkouts.filter((w) => w.id !== id));
      } catch (error) {
        console.error('Error deleting workout:', error);
        alert('Failed to delete workout');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading workouts...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🏋️‍♂️ Workout Tracker</h1>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Workout'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2>Log New Workout</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="exercise_name">Exercise Name</label>
                <input
                  type="text"
                  id="exercise_name"
                  name="exercise_name"
                  value={formData.exercise_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Running, Push-ups, Cycling"
                />
              </div>
              <div className="form-group">
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  min="1"
                  placeholder="30"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="calories_burned">Calories Burned</label>
                <input
                  type="number"
                  id="calories_burned"
                  name="calories_burned"
                  value={formData.calories_burned}
                  onChange={handleInputChange}
                  required
                  min="1"
                  placeholder="250"
                />
              </div>
              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="How did it feel?"
                />
              </div>
            </div>
            <button type="submit" className="btn">
              Save Workout
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Workout History</h2>
        {Array.isArray(workouts) && workouts.length > 0 ? (
          workouts.map((workout) => (
            <div key={workout.id} className="workout-item">
              <div className="item-header">
                <div className="item-title">{workout.exercise_name || 'Unknown Exercise'}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="item-date">
                    {workout.date ? new Date(workout.date).toLocaleDateString() : 'No date'}
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={() => deleteWorkout(workout.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="item-details">
                <div className="detail-item">
                  <div className="detail-value">{workout.duration || '-'}</div>
                  <div className="detail-label">Minutes</div>
                </div>
                <div className="detail-item">
                  <div className="detail-value">{workout.calories_burned || '-'}</div>
                  <div className="detail-label">Calories</div>
                </div>
              </div>
              {workout.notes && (
                <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
                  "{workout.notes}"
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center" style={{ padding: '40px' }}>
            <p>No workouts logged yet.</p>
            <p>Click "Add Workout" to start your fitness journey.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutTracker;
