const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const axios = require('axios');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));

  // Handles all requests that don’t match API routes by sending React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}


const db = new Database('./fitness_diet.db');
console.log("Connected to better-sqlite3 database.");
initializeTables();

function initializeTables() {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    age INTEGER,
    height REAL,
    weight REAL,
    fitness_goal TEXT,
    activity_level TEXT,
    target_calories INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    notes TEXT,
    date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    calories INTEGER NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    workout_type TEXT,
    calories_burned INTEGER,
    achievement TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE
  )`).run();

  console.log('Database tables initialized successfully.');
}

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fitness-diet-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
} else {
  app.use(express.static(path.join(__dirname, 'client', 'public')));
  app.use('/static', express.static(path.join(__dirname, 'client', 'src')));
}

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// ===== AUTHENTICATION ROUTES =====
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPassword);
      req.session.userId = result.lastInsertRowid;

      db.prepare('INSERT INTO user_profiles (user_id) VALUES (?)').run(result.lastInsertRowid);

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.lastInsertRowid,
        username
      });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({
      message: 'Login successful',
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// ===== WORKOUT ROUTES =====
app.get('/api/workouts', requireAuth, (req, res) => {
  try {
    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(req.session.userId);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

app.get('/api/workouts/recent', requireAuth, (req, res) => {
  try {
    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5').all(req.session.userId);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent workouts' });
  }
});

app.post('/api/workouts', requireAuth, (req, res) => {
  const { exercise_name, duration, calories_burned, notes } = req.body;
  if (!exercise_name || !duration || !calories_burned) {
    return res.status(400).json({ error: 'Exercise name, duration, and calories burned are required' });
  }
  try {
    const result = db.prepare('INSERT INTO workouts (user_id, exercise_name, duration, calories_burned, notes) VALUES (?, ?, ?, ?, ?)').run(req.session.userId, exercise_name, duration, calories_burned, notes || null);
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add workout' });
  }
});

app.delete('/api/workouts/:id', requireAuth, (req, res) => {
  const workoutId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(workoutId, req.session.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// ===== MEAL ROUTES =====
app.get('/api/meals', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at DESC').all(req.session.userId, today);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.get('/api/meals/recent', requireAuth, (req, res) => {
  try {
    const meals = db.prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5').all(req.session.userId);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent meals' });
  }
});

app.post('/api/meals', requireAuth, (req, res) => {
  const { food_name, quantity, meal_type, calories, protein, carbs, fat, fiber } = req.body;
  if (!food_name || !quantity || !meal_type || !calories) {
    return res.status(400).json({ error: 'Food name, quantity, meal type, and calories are required' });
  }
  try {
    const result = db.prepare('INSERT INTO meals (user_id, food_name, quantity, meal_type, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.session.userId, food_name, quantity, meal_type, calories, protein || 0, carbs || 0, fat || 0, fiber || 0);
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

app.delete('/api/meals/:id', requireAuth, (req, res) => {
  const mealId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM meals WHERE id = ? AND user_id = ?').run(mealId, req.session.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});


// ===== NUTRITION API ROUTE =====
app.get('/api/nutrition/search', requireAuth, async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_API_KEY) {
      const mockFoods = [
        {
          food_name: query.toLowerCase(),
          nf_calories: Math.floor(Math.random() * 300) + 100,
          nf_protein: Math.floor(Math.random() * 20) + 5,
          nf_total_carbohydrate: Math.floor(Math.random() * 40) + 10,
          nf_total_fat: Math.floor(Math.random() * 15) + 2,
          nf_dietary_fiber: Math.floor(Math.random() * 5) + 1
        }
      ];
      return res.json({ foods: mockFoods });
    }

    const response = await axios.post(
      'https://trackapi.nutritionix.com/v2/search/instant',
      { query },
      {
        headers: {
          'x-app-id': process.env.NUTRITIONIX_APP_ID,
          'x-app-key': process.env.NUTRITIONIX_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ foods: response.data.common || [] });
  } catch (error) {
    console.error('Nutritionix API error:', error);
    const mockFoods = [
      {
        food_name: query.toLowerCase(),
        nf_calories: Math.floor(Math.random() * 300) + 100,
        nf_protein: Math.floor(Math.random() * 20) + 5,
        nf_total_carbohydrate: Math.floor(Math.random() * 40) + 10,
        nf_total_fat: Math.floor(Math.random() * 15) + 2,
        nf_dietary_fiber: Math.floor(Math.random() * 5) + 1
      }
    ];
    res.json({ foods: mockFoods });
  }
});

// ===== DASHBOARD ROUTES =====
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  try {
    const workoutStats = db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories FROM workouts WHERE user_id = ?'
    ).get(req.session.userId);

    const mealStats = db.prepare(
      'SELECT COUNT(*) as count, COALESCE(AVG(calories), 0) as avg_calories FROM meals WHERE user_id = ?'
    ).get(req.session.userId);

    res.json({
      totalWorkouts: workoutStats.count,
      totalCaloriesBurned: workoutStats.total_calories,
      totalMeals: mealStats.count,
      averageCaloriesConsumed: Math.round(mealStats.avg_calories)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/weekly-progress', requireAuth, (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const query = `
      SELECT 
        dates.date,
        COALESCE(workout_calories.calories_burned, 0) as caloriesBurned,
        COALESCE(meal_calories.calories_consumed, 0) as caloriesConsumed
      FROM (
        SELECT date(?, '+' || (row_number() OVER () - 1) || ' day') as date
        FROM (SELECT 0 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6)
      ) dates
      LEFT JOIN (
        SELECT date, SUM(calories_burned) as calories_burned
        FROM workouts 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) workout_calories ON dates.date = workout_calories.date
      LEFT JOIN (
        SELECT date, SUM(calories) as calories_consumed
        FROM meals 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) meal_calories ON dates.date = meal_calories.date
      ORDER BY dates.date
    `;

    const results = db.prepare(query).all(
      sevenDaysAgoStr,
      req.session.userId,
      sevenDaysAgoStr,
      req.session.userId,
      sevenDaysAgoStr
    );

    res.json(results);
  } catch (error) {
    console.error('Weekly progress query error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly progress' });
  }
});

// ===== PROGRESS ROUTES =====
app.get('/api/progress/weekly', requireAuth, (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Weekly progress data
    const weeklyQuery = `
      SELECT 
        dates.date,
        COALESCE(workout_calories.calories_burned, 0) as caloriesBurned,
        COALESCE(meal_calories.calories_consumed, 0) as caloriesConsumed
      FROM (
        SELECT date(?, '+' || (row_number() OVER () - 1) || ' day') as date
        FROM (SELECT 0 UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6)
      ) dates
      LEFT JOIN (
        SELECT date, SUM(calories_burned) as calories_burned
        FROM workouts 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) workout_calories ON dates.date = workout_calories.date
      LEFT JOIN (
        SELECT date, SUM(calories) as calories_consumed
        FROM meals 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) meal_calories ON dates.date = meal_calories.date
      ORDER BY dates.date
    `;

    // Workout types
    const workoutTypesQuery = `
      SELECT exercise_name as name, COUNT(*) as count 
      FROM workouts 
      WHERE user_id = ? AND date >= ? 
      GROUP BY exercise_name
    `;

    // Nutrition breakdown
    const nutritionBreakdownQuery = `
      SELECT AVG(protein) as protein, AVG(carbs) as carbs, AVG(fat) as fat, AVG(fiber) as fiber 
      FROM meals 
      WHERE user_id = ? AND date >= ?
    `;

    const weekly = db.prepare(weeklyQuery).all(
      sevenDaysAgoStr,
      req.session.userId,
      sevenDaysAgoStr,
      req.session.userId,
      sevenDaysAgoStr
    );
    const workoutTypes = db.prepare(workoutTypesQuery).all(req.session.userId, sevenDaysAgoStr);
    const nutritionStats = db.prepare(nutritionBreakdownQuery).get(req.session.userId, sevenDaysAgoStr);

    const nutritionBreakdown = nutritionStats
      ? [
          { name: 'Protein', value: Math.round(nutritionStats.protein || 0) },
          { name: 'Carbs', value: Math.round(nutritionStats.carbs || 0) },
          { name: 'Fat', value: Math.round(nutritionStats.fat || 0) },
          { name: 'Fiber', value: Math.round(nutritionStats.fiber || 0) }
        ]
      : [];

    res.json({ weekly, workoutTypes, nutritionBreakdown });
  } catch (error) {
    console.error('Weekly progress error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly progress data' });
  }
});

app.get('/api/progress/monthly', requireAuth, (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Monthly progress data (grouped by week)
    const monthlyQuery = `
      SELECT 
        DATE(date, 'weekday 0', '-6 days') as date,
        SUM(COALESCE(workout_calories.calories_burned, 0)) as caloriesBurned,
        SUM(COALESCE(meal_calories.calories_consumed, 0)) as caloriesConsumed
      FROM (
        SELECT DISTINCT date FROM workouts WHERE user_id = ? AND date >= ?
        UNION
        SELECT DISTINCT date FROM meals WHERE user_id = ? AND date >= ?
      ) all_dates
      LEFT JOIN (
        SELECT date, SUM(calories_burned) as calories_burned
        FROM workouts 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) workout_calories ON all_dates.date = workout_calories.date
      LEFT JOIN (
        SELECT date, SUM(calories) as calories_consumed
        FROM meals 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
      ) meal_calories ON all_dates.date = meal_calories.date
      GROUP BY DATE(all_dates.date, 'weekday 0', '-6 days')
      ORDER BY date
    `;

    const workoutTypesQuery = `
      SELECT exercise_name as name, COUNT(*) as count 
      FROM workouts 
      WHERE user_id = ? AND date >= ? 
      GROUP BY exercise_name
    `;

    const nutritionBreakdownQuery = `
      SELECT AVG(protein) as protein, AVG(carbs) as carbs, AVG(fat) as fat, AVG(fiber) as fiber 
      FROM meals 
      WHERE user_id = ? AND date >= ?
    `;

    const monthly = db.prepare(monthlyQuery).all(
      req.session.userId,
      thirtyDaysAgoStr,
      req.session.userId,
      thirtyDaysAgoStr,
      req.session.userId,
      thirtyDaysAgoStr,
      req.session.userId,
      thirtyDaysAgoStr
    );
    const workoutTypes = db.prepare(workoutTypesQuery).all(req.session.userId, thirtyDaysAgoStr);
    const nutritionStats = db.prepare(nutritionBreakdownQuery).get(req.session.userId, thirtyDaysAgoStr);

    const nutritionBreakdown = nutritionStats
      ? [
          { name: 'Protein', value: Math.round(nutritionStats.protein || 0) },
          { name: 'Carbs', value: Math.round(nutritionStats.carbs || 0) },
          { name: 'Fat', value: Math.round(nutritionStats.fat || 0) },
          { name: 'Fiber', value: Math.round(nutritionStats.fiber || 0) }
        ]
      : [];

    res.json({ monthly, workoutTypes, nutritionBreakdown });
  } catch (error) {
    console.error('Monthly progress error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly progress data' });
  }
});


// ===== COMMUNITY ROUTES =====
app.get('/api/community/posts', (req, res) => {
  const query = `
    SELECT 
      cp.*,
      u.username,
      EXISTS(
        SELECT 1 FROM post_likes pl WHERE pl.post_id = cp.id AND pl.user_id = ?
      ) as user_liked
    FROM community_posts cp
    JOIN users u ON cp.user_id = u.id
    ORDER BY cp.created_at DESC
    LIMIT 50
  `;
  try {
    const posts = db.prepare(query).all(req.session.userId);
    res.json(posts);
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/community/posts', (req, res) => {
  const { content, workout_type, calories_burned, achievement } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    const insert = db.prepare(
      'INSERT INTO community_posts (user_id, content, workout_type, calories_burned, achievement) VALUES (?, ?, ?, ?, ?)'
    );
    const result = insert.run(
      req.session.userId,
      content,
      workout_type || null,
      calories_burned || null,
      achievement || null
    );
    const post = db
      .prepare(
        `SELECT cp.*, u.username, 0 as user_liked
         FROM community_posts cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(post);
  } catch (err) {
    console.error('Failed to create post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.delete('/api/community/posts/:id', (req, res) => {
  const postId = req.params.id;
  try {
    const del = db.prepare('DELETE FROM community_posts WHERE id = ? AND user_id = ?');
    const result = del.run(postId, req.session.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

app.post('/api/community/posts/:id/like', (req, res) => {
  const postId = req.params.id;
  try {
    const findLike = db
      .prepare('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?')
      .get(req.session.userId, postId);
    if (findLike) {
      const delLike = db.prepare('DELETE FROM post_likes WHERE id = ?');
      delLike.run(findLike.id);
      const decLikes = db.prepare('UPDATE community_posts SET likes = likes - 1 WHERE id = ?');
      decLikes.run(postId);
      const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(postId);
      res.json({ likes: post.likes, user_liked: false });
    } else {
      const insLike = db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)');
      insLike.run(req.session.userId, postId);
      const incLikes = db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?');
      incLikes.run(postId);
      const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(postId);
      res.json({ likes: post.likes, user_liked: true });
    }
  } catch (err) {
    console.error('Like/unlike operation failed:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ===== PROFILE ROUTES =====
app.get('/api/profile', (req, res) => {
  try {
    let profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(req.session.userId);
    if (!profile) {
      const insert = db.prepare('INSERT INTO user_profiles (user_id) VALUES (?)');
      insert.run(req.session.userId);
      profile = {
        user_id: req.session.userId,
        age: null,
        height: null,
        weight: null,
        fitness_goal: null,
        activity_level: null,
        target_calories: null,
      };
    }
    res.json(profile);
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profile', (req, res) => {
  const { age, height, weight, fitness_goal, activity_level, target_calories } = req.body;
  try {
    const update = db.prepare(
      `UPDATE user_profiles
       SET age = ?, height = ?, weight = ?, fitness_goal = ?, activity_level = ?, target_calories = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    );
    const result = update.run(
      age,
      height,
      weight,
      fitness_goal,
      activity_level,
      target_calories,
      req.session.userId
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/profile/stats', async (req, res) => {
  try {
    const workoutStats = db
      .prepare('SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories FROM workouts WHERE user_id = ?')
      .get(req.session.userId);

    const mealStats = db
      .prepare('SELECT COUNT(*) as count FROM meals WHERE user_id = ?')
      .get(req.session.userId);

    const userInfo = db
      .prepare('SELECT created_at FROM users WHERE id = ?')
      .get(req.session.userId);

    res.json({
      totalWorkouts: workoutStats.count,
      totalCaloriesBurned: workoutStats.total_calories,
      totalMeals: mealStats.count,
      memberSince: userInfo ? userInfo.created_at : null,
    });
  } catch (err) {
    console.error('Failed to fetch profile stats:', err);
    res.status(500).json({ error: 'Failed to fetch profile stats' });
  }
});

// ===== EMAIL AUTOMATION WITH NODE-CRON =====
// Send weekly fitness reports every Sunday at 9 AM
cron.schedule('0 9 * * 0', async () => {
  console.log('Running weekly fitness job...');

  try {
    // Fetch all users
    const users = db.prepare('SELECT id, username, email FROM users').all();

    for (const user of users) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Fetch user's weekly workout stats
      const workoutStats = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories
         FROM workouts
         WHERE user_id = ? AND date >= ?`
      ).get(user.id, weekAgoStr);

      // Fetch user's weekly meal stats
      const mealStats = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(AVG(calories), 0) as avg_calories
         FROM meals
         WHERE user_id = ? AND date >= ?`
      ).get(user.id, weekAgoStr);

      // Skip users with no activity
      if (workoutStats.count === 0 && mealStats.count === 0) {
        continue;
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">🏃‍♀️ Your Weekly Fitness Report</h1>
          <p>Hi ${user.username},</p>
          <p>Here's your fitness summary for the past week:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #333;">📊 This Week's Stats</h2>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0;"><strong>🏋️‍♂️ Workouts Completed:</strong> ${workoutStats.count}</li>
              <li style="margin: 10px 0;"><strong>🔥 Total Calories Burned:</strong> ${workoutStats.total_calories}</li>
              <li style="margin: 10px 0;"><strong>🍽️ Meals Logged:</strong> ${mealStats.count}</li>
              <li style="margin: 10px 0;"><strong>📈 Average Daily Calories:</strong> ${Math.round(mealStats.avg_calories)}</li>
            </ul>
          </div>
          <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #667eea;">💪 Keep Going!</h3>
            <p>You're making great progress on your fitness journey. Remember:</p>
            <ul>
              <li>Consistency is key to reaching your goals</li>
              <li>Every workout counts, no matter how small</li>
              <li>Proper nutrition fuels success</li>
            </ul>
          </div>
          <p>Keep up the excellent work, and we'll see you in the app!</p>
          <p>Best regards,<br/>Your Fitness & Diet Tracker Team</p>
        </div>
      `;

      // Send email if configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `🏃‍♀️ Your Weekly Fitness Report - ${new Date().toLocaleDateString()}`,
            html: emailHtml,
          });
          console.log(`Sent weekly report to: ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }
    }

    console.log('Weekly fitness job completed.');
  } catch (err) {
    console.error('Error running weekly fitness job:', err);
  }
});

// Serve React app for all unmatched routes
app.use((req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'client', 'public', 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Graceful shutdown
process.on('SIGINT', () => {
  try {
    db.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
});
