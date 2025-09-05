import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DietTracker = () => {
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    food_name: '',
    quantity: 1,
    meal_type: 'breakfast',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: ''
  });

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await axios.get('/api/meals', { withCredentials: true });
      const data = response.data;
      setMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const searchFood = async (foodName) => {
    if (!foodName || foodName.length < 2) {
      setFoodSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`/api/nutrition/search?query=${encodeURIComponent(foodName)}`, {
        withCredentials: true
      });
      const foods = response.data.foods;
      setFoodSearchResults(Array.isArray(foods) ? foods : []);
    } catch (error) {
      console.error('Error searching food:', error);
      setFoodSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectFood = (food) => {
    setFormData({
      ...formData,
      food_name: food.food_name || '',
      calories: Math.round(food.nf_calories || 0),
      protein: Math.round(food.nf_protein || 0),
      carbs: Math.round(food.nf_total_carbohydrate || 0),
      fat: Math.round(food.nf_total_fat || 0),
      fiber: Math.round(food.nf_dietary_fiber || 0)
    });
    setFoodSearchResults([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'food_name') {
      searchFood(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/meals', formData, { withCredentials: true });
      const newMeal = response.data;
      setMeals(prev => [newMeal, ...prev]);
      setFormData({
        food_name: '',
        quantity: 1,
        meal_type: 'breakfast',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: ''
      });
      setShowForm(false);
      setFoodSearchResults([]);
    } catch (error) {
      console.error('Error adding meal:', error);
      alert('Failed to add meal');
    }
  };

  const deleteMeal = async (id) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await axios.delete(`/api/meals/${id}`, { withCredentials: true });
        setMeals(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting meal:', error);
        alert('Failed to delete meal');
      }
    }
  };

  const getMealsByType = (type) => meals.filter(meal => meal.meal_type === type);

  const getTotalNutrition = () => 
    meals.reduce(
      (total, meal) => ({
        calories: total.calories + (parseFloat(meal.calories) || 0),
        protein: total.protein + (parseFloat(meal.protein) || 0),
        carbs: total.carbs + (parseFloat(meal.carbs) || 0),
        fat: total.fat + (parseFloat(meal.fat) || 0),
        fiber: total.fiber + (parseFloat(meal.fiber) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

  if (loading) {
    return <div className="loading">Loading meals...</div>;
  }

  const totalNutrition = getTotalNutrition();

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>🍎 Diet Tracker</h1>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Meal'}
          </button>
        </div>
      </div>

      {/* Daily Nutrition Summary */}
      <div className="card">
        <h2>Today's Nutrition</h2>
        <div className="nutrition-grid">
          <div className="nutrition-item">
            <div className="detail-value">{Math.round(totalNutrition.calories)}</div>
            <div className="detail-label">Calories</div>
          </div>
          <div className="nutrition-item">
            <div className="detail-value">{Math.round(totalNutrition.protein)}g</div>
            <div className="detail-label">Protein</div>
          </div>
          <div className="nutrition-item">
            <div className="detail-value">{Math.round(totalNutrition.carbs)}g</div>
            <div className="detail-label">Carbs</div>
          </div>
          <div className="nutrition-item">
            <div className="detail-value">{Math.round(totalNutrition.fat)}g</div>
            <div className="detail-label">Fat</div>
          </div>
          <div className="nutrition-item">
            <div className="detail-value">{Math.round(totalNutrition.fiber)}g</div>
            <div className="detail-label">Fiber</div>
          </div>
        </div>
      </div>

      {/* Add Meal Form */}
      {showForm && (
        <div className="card">
          <h2>Add New Meal</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="food_name">Food Name</label>
                <input
                  type="text"
                  id="food_name"
                  name="food_name"
                  value={formData.food_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Search for food..."
                  autoComplete="off"
                />
                {searchLoading && (
                  <div style={{ position: 'absolute', right: '10px', top: '35px' }}>
                    Searching...
                  </div>
                )}
                {foodSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                    }}
                  >
                    {foodSearchResults.slice(0, 5).map((food, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                        }}
                        onClick={() => selectFood(food)}
                      >
                        <strong>{food.food_name}</strong>
                        <br />
                        <small>{Math.round(food.nf_calories || 0)} calories per serving</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="meal_type">Meal Type</label>
                <select
                  id="meal_type"
                  name="meal_type"
                  value={formData.meal_type}
                  onChange={handleInputChange}
                  required
                >
                  {mealTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="0.1"
                  step="0.1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="calories">Calories</label>
                <input
                  type="number"
                  id="calories"
                  name="calories"
                  min="0"
                  value={formData.calories}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="protein">Protein (g)</label>
                <input
                  type="number"
                  id="protein"
                  name="protein"
                  min="0"
                  step="0.1"
                  value={formData.protein}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="carbs">Carbs (g)</label>
                <input
                  type="number"
                  id="carbs"
                  name="carbs"
                  min="0"
                  step="0.1"
                  value={formData.carbs}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fat">Fat (g)</label>
                <input
                  type="number"
                  id="fat"
                  name="fat"
                  min="0"
                  step="0.1"
                  value={formData.fat}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="fiber">Fiber (g)</label>
                <input
                  type="number"
                  id="fiber"
                  name="fiber"
                  min="0"
                  step="0.1"
                  value={formData.fiber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <button type="submit" className="btn">Add Meal</button>
          </form>
        </div>
      )}

      {/* Display meals by type */}
      <div className="tab-container">
        <div className="tab-header" style={{ marginBottom: '1rem' }}>
          {mealTypes.map(type => (
            <button
              key={type}
              className="tab-button active"
              style={{ marginRight: '0.5rem' }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {mealTypes.map(type => {
            const mealsOfType = getMealsByType(type);
            return (
              <div key={type}>
                <h3>{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                {mealsOfType.length > 0 ? (
                  mealsOfType.map(meal => (
                    <div key={meal.id} className="meal-item">
                      <div className="item-header">
                        <div className="item-title">{meal.food_name}</div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div className="item-date">{meal.date ? new Date(meal.date).toLocaleDateString() : 'No date'}</div>
                          <button className="btn btn-danger" onClick={() => deleteMeal(meal.id)}>Delete</button>
                        </div>
                      </div>
                      <div className="nutrition-grid">
                        <div className="nutrition-item"><div className="detail-value">{meal.calories || 0}</div><div className="detail-label">Calories</div></div>
                        <div className="nutrition-item"><div className="detail-value">{meal.protein || 0}g</div><div className="detail-label">Protein</div></div>
                        <div className="nutrition-item"><div className="detail-value">{meal.carbs || 0}g</div><div className="detail-label">Carbs</div></div>
                        <div className="nutrition-item"><div className="detail-value">{meal.fat || 0}g</div><div className="detail-label">Fat</div></div>
                        {meal.fiber > 0 && <div className="nutrition-item"><div className="detail-value">{meal.fiber}g</div><div className="detail-label">Fiber</div></div>}
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>Quantity: {meal.quantity}</div>
                    </div>
                  ))
                ) : (
                  <p>No {type} meals logged.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DietTracker;
