const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const axios = require('axios');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 5000) : 3001;

// Initialize SQLite database with comprehensive schema
const db = new sqlite3.Database('./fitness_diet.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeTables();
  }
});

// Initialize all database tables
function initializeTables() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // User profiles table
  db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
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
  )`);

  // Workouts table
  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    notes TEXT,
    date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // Meals table
  db.run(`CREATE TABLE IF NOT EXISTS meals (
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
  )`);

  // Community posts table
  db.run(`CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    workout_type TEXT,
    calories_burned INTEGER,
    achievement TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // Post likes table
  db.run(`CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE
  )`);

  console.log('Database tables initialized successfully.');
}

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware
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
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files from client directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
} else {
  app.use(express.static(path.join(__dirname, 'client', 'public')));
  app.use('/static', express.static(path.join(__dirname, 'client', 'src')));
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Fitness Diet App API is running!', timestamp: new Date().toISOString() });
});

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
    
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }
        
        req.session.userId = this.lastID;
        
        // Create default user profile
        db.run(
          'INSERT INTO user_profiles (user_id) VALUES (?)',
          [this.lastID]
        );
        
        res.status(201).json({ 
          message: 'User registered successfully',
          userId: this.lastID,
          username: username
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      try {
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
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );
});

app.get('/api/user', requireAuth, (req, res) => {
  db.get(
    'SELECT id, username, email FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
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
  db.all(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [req.session.userId],
    (err, workouts) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workouts' });
      }
      res.json(workouts);
    }
  );
});

app.get('/api/workouts/recent', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5',
    [req.session.userId],
    (err, workouts) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch recent workouts' });
      }
      res.json(workouts);
    }
  );
});

app.post('/api/workouts', requireAuth, (req, res) => {
  const { exercise_name, duration, calories_burned, notes } = req.body;
  
  if (!exercise_name || !duration || !calories_burned) {
    return res.status(400).json({ error: 'Exercise name, duration, and calories burned are required' });
  }

  db.run(
    'INSERT INTO workouts (user_id, exercise_name, duration, calories_burned, notes) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, exercise_name, duration, calories_burned, notes || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add workout' });
      }
      
      db.get(
        'SELECT * FROM workouts WHERE id = ?',
        [this.lastID],
        (err, workout) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch created workout' });
          }
          res.status(201).json(workout);
        }
      );
    }
  );
});

app.delete('/api/workouts/:id', requireAuth, (req, res) => {
  const workoutId = req.params.id;
  
  db.run(
    'DELETE FROM workouts WHERE id = ? AND user_id = ?',
    [workoutId, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete workout' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Workout not found' });
      }
      
      res.json({ message: 'Workout deleted successfully' });
    }
  );
});

// ===== MEAL ROUTES =====
app.get('/api/meals', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  db.all(
    'SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at DESC',
    [req.session.userId, today],
    (err, meals) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch meals' });
      }
      res.json(meals);
    }
  );
});

app.get('/api/meals/recent', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5',
    [req.session.userId],
    (err, meals) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch recent meals' });
      }
      res.json(meals);
    }
  );
});

app.post('/api/meals', requireAuth, (req, res) => {
  const { food_name, quantity, meal_type, calories, protein, carbs, fat, fiber } = req.body;
  
  if (!food_name || !quantity || !meal_type || !calories) {
    return res.status(400).json({ error: 'Food name, quantity, meal type, and calories are required' });
  }

  db.run(
    'INSERT INTO meals (user_id, food_name, quantity, meal_type, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.session.userId, food_name, quantity, meal_type, calories, protein || 0, carbs || 0, fat || 0, fiber || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add meal' });
      }
      
      db.get(
        'SELECT * FROM meals WHERE id = ?',
        [this.lastID],
        (err, meal) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch created meal' });
          }
          res.status(201).json(meal);
        }
      );
    }
  );
});

app.delete('/api/meals/:id', requireAuth, (req, res) => {
  const mealId = req.params.id;
  
  db.run(
    'DELETE FROM meals WHERE id = ? AND user_id = ?',
    [mealId, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete meal' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      res.json({ message: 'Meal deleted successfully' });
    }
  );
});

// ===== NUTRITION API ROUTE =====
app.get('/api/nutrition/search', requireAuth, async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Check if API keys are available
    if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_API_KEY) {
      // Return mock data if API keys are not configured
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

    const response = await axios.post('https://trackapi.nutritionix.com/v2/search/instant', {
      query: query
    }, {
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID,
        'x-app-key': process.env.NUTRITIONIX_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      foods: response.data.common || []
    });
  } catch (error) {
    console.error('Nutritionix API error:', error);
    // Return mock data as fallback
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
  const promises = [
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories FROM workouts WHERE user_id = ?',
        [req.session.userId],
        (err, result) => resolve(err ? { count: 0, total_calories: 0 } : result)
      );
    }),
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count, COALESCE(AVG(calories), 0) as avg_calories FROM meals WHERE user_id = ?',
        [req.session.userId],
        (err, result) => resolve(err ? { count: 0, avg_calories: 0 } : result)
      );
    })
  ];

  Promise.all(promises).then(([workoutStats, mealStats]) => {
    res.json({
      totalWorkouts: workoutStats.count,
      totalCaloriesBurned: workoutStats.total_calories,
      totalMeals: mealStats.count,
      averageCaloriesConsumed: Math.round(mealStats.avg_calories)
    });
  });
});

app.get('/api/dashboard/weekly-progress', requireAuth, (req, res) => {
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

  db.all(query, [sevenDaysAgoStr, req.session.userId, sevenDaysAgoStr, req.session.userId, sevenDaysAgoStr], (err, results) => {
    if (err) {
      console.error('Weekly progress query error:', err);
      return res.status(500).json({ error: 'Failed to fetch weekly progress' });
    }
    res.json(results);
  });
});

// ===== PROGRESS ROUTES =====
app.get('/api/progress/weekly', requireAuth, (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const queries = [
    // Weekly progress data
    new Promise((resolve) => {
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
      
      db.all(query, [sevenDaysAgoStr, req.session.userId, sevenDaysAgoStr, req.session.userId, sevenDaysAgoStr], (err, results) => {
        resolve(err ? [] : results);
      });
    }),
    
    // Workout types
    new Promise((resolve) => {
      db.all(
        'SELECT exercise_name as name, COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= ? GROUP BY exercise_name',
        [req.session.userId, sevenDaysAgoStr],
        (err, results) => resolve(err ? [] : results)
      );
    }),
    
    // Nutrition breakdown
    new Promise((resolve) => {
      db.get(
        'SELECT AVG(protein) as protein, AVG(carbs) as carbs, AVG(fat) as fat, AVG(fiber) as fiber FROM meals WHERE user_id = ? AND date >= ?',
        [req.session.userId, sevenDaysAgoStr],
        (err, result) => {
          if (err || !result) {
            resolve([]);
          } else {
            resolve([
              { name: 'Protein', value: Math.round(result.protein || 0) },
              { name: 'Carbs', value: Math.round(result.carbs || 0) },
              { name: 'Fat', value: Math.round(result.fat || 0) },
              { name: 'Fiber', value: Math.round(result.fiber || 0) }
            ]);
          }
        }
      );
    })
  ];

  Promise.all(queries).then(([weekly, workoutTypes, nutritionBreakdown]) => {
    res.json({
      weekly,
      workoutTypes,
      nutritionBreakdown
    });
  });
});

app.get('/api/progress/monthly', requireAuth, (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const queries = [
    // Monthly progress data (grouped by week)
    new Promise((resolve) => {
      const query = `
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
      
      db.all(query, [req.session.userId, thirtyDaysAgoStr, req.session.userId, thirtyDaysAgoStr, req.session.userId, thirtyDaysAgoStr, req.session.userId, thirtyDaysAgoStr], (err, results) => {
        resolve(err ? [] : results);
      });
    }),
    
    // Workout types
    new Promise((resolve) => {
      db.all(
        'SELECT exercise_name as name, COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= ? GROUP BY exercise_name',
        [req.session.userId, thirtyDaysAgoStr],
        (err, results) => resolve(err ? [] : results)
      );
    }),
    
    // Nutrition breakdown
    new Promise((resolve) => {
      db.get(
        'SELECT AVG(protein) as protein, AVG(carbs) as carbs, AVG(fat) as fat, AVG(fiber) as fiber FROM meals WHERE user_id = ? AND date >= ?',
        [req.session.userId, thirtyDaysAgoStr],
        (err, result) => {
          if (err || !result) {
            resolve([]);
          } else {
            resolve([
              { name: 'Protein', value: Math.round(result.protein || 0) },
              { name: 'Carbs', value: Math.round(result.carbs || 0) },
              { name: 'Fat', value: Math.round(result.fat || 0) },
              { name: 'Fiber', value: Math.round(result.fiber || 0) }
            ]);
          }
        }
      );
    })
  ];

  Promise.all(queries).then(([monthly, workoutTypes, nutritionBreakdown]) => {
    res.json({
      monthly,
      workoutTypes,
      nutritionBreakdown
    });
  });
});

// ===== COMMUNITY ROUTES =====
app.get('/api/community/posts', requireAuth, (req, res) => {
  const query = `
    SELECT 
      cp.*,
      u.username,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = cp.id AND pl.user_id = ?) as user_liked
    FROM community_posts cp
    JOIN users u ON cp.user_id = u.id
    ORDER BY cp.created_at DESC
    LIMIT 50
  `;
  
  db.all(query, [req.session.userId], (err, posts) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
    res.json(posts);
  });
});

app.post('/api/community/posts', requireAuth, (req, res) => {
  const { content, workout_type, calories_burned, achievement } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  db.run(
    'INSERT INTO community_posts (user_id, content, workout_type, calories_burned, achievement) VALUES (?, ?, ?, ?, ?)',
    [req.session.userId, content, workout_type || null, calories_burned || null, achievement || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create post' });
      }
      
      db.get(
        `SELECT cp.*, u.username, 0 as user_liked 
         FROM community_posts cp 
         JOIN users u ON cp.user_id = u.id 
         WHERE cp.id = ?`,
        [this.lastID],
        (err, post) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch created post' });
          }
          res.status(201).json(post);
        }
      );
    }
  );
});

app.delete('/api/community/posts/:id', requireAuth, (req, res) => {
  const postId = req.params.id;
  
  db.run(
    'DELETE FROM community_posts WHERE id = ? AND user_id = ?',
    [postId, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete post' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Post not found or unauthorized' });
      }
      
      res.json({ message: 'Post deleted successfully' });
    }
  );
});

app.post('/api/community/posts/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  
  // Check if user already liked the post
  db.get(
    'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
    [req.session.userId, postId],
    (err, existingLike) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check like status' });
      }
      
      if (existingLike) {
        // Unlike the post
        db.run(
          'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
          [req.session.userId, postId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to unlike post' });
            }
            
            // Update likes count
            db.run(
              'UPDATE community_posts SET likes = likes - 1 WHERE id = ?',
              [postId],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to update likes count' });
                }
                
                // Get updated likes count
                db.get(
                  'SELECT likes FROM community_posts WHERE id = ?',
                  [postId],
                  (err, post) => {
                    if (err) {
                      return res.status(500).json({ error: 'Failed to get updated likes' });
                    }
                    res.json({ likes: post.likes, user_liked: false });
                  }
                );
              }
            );
          }
        );
      } else {
        // Like the post
        db.run(
          'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
          [req.session.userId, postId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to like post' });
            }
            
            // Update likes count
            db.run(
              'UPDATE community_posts SET likes = likes + 1 WHERE id = ?',
              [postId],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to update likes count' });
                }
                
                // Get updated likes count
                db.get(
                  'SELECT likes FROM community_posts WHERE id = ?',
                  [postId],
                  (err, post) => {
                    if (err) {
                      return res.status(500).json({ error: 'Failed to get updated likes' });
                    }
                    res.json({ likes: post.likes, user_liked: true });
                  }
                );
              }
            );
          }
        );
      }
    }
  );
});

// ===== PROFILE ROUTES =====
app.get('/api/profile', requireAuth, (req, res) => {
  db.get(
    'SELECT * FROM user_profiles WHERE user_id = ?',
    [req.session.userId],
    (err, profile) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      
      if (!profile) {
        // Create default profile if it doesn't exist
        db.run(
          'INSERT INTO user_profiles (user_id) VALUES (?)',
          [req.session.userId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create profile' });
            }
            
            res.json({
              user_id: req.session.userId,
              age: null,
              height: null,
              weight: null,
              fitness_goal: null,
              activity_level: null,
              target_calories: null
            });
          }
        );
      } else {
        res.json(profile);
      }
    }
  );
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { age, height, weight, fitness_goal, activity_level, target_calories } = req.body;
  
  db.run(
    'UPDATE user_profiles SET age = ?, height = ?, weight = ?, fitness_goal = ?, activity_level = ?, target_calories = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [age, height, weight, fitness_goal, activity_level, target_calories, req.session.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

app.get('/api/profile/stats', requireAuth, (req, res) => {
  const promises = [
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories FROM workouts WHERE user_id = ?',
        [req.session.userId],
        (err, result) => resolve(err ? { count: 0, total_calories: 0 } : result)
      );
    }),
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count FROM meals WHERE user_id = ?',
        [req.session.userId],
        (err, result) => resolve(err ? { count: 0 } : result)
      );
    }),
    new Promise((resolve) => {
      db.get(
        'SELECT created_at FROM users WHERE id = ?',
        [req.session.userId],
        (err, result) => resolve(err ? { created_at: new Date().toISOString() } : result)
      );
    })
  ];

  Promise.all(promises).then(([workoutStats, mealStats, userInfo]) => {
    res.json({
      totalWorkouts: workoutStats.count,
      totalCaloriesBurned: workoutStats.total_calories,
      totalMeals: mealStats.count,
      memberSince: userInfo.created_at
    });
  });
});

// ===== EMAIL AUTOMATION WITH NODE-CRON =====
// Send weekly fitness reports every Sunday at 9 AM
cron.schedule('0 9 * * 0', async () => {
  console.log('Running weekly fitness report job...');
  
  try {
    // Get all users with email preferences (for now, all users)
    const users = await new Promise((resolve, reject) => {
      db.all(
        'SELECT u.id, u.username, u.email FROM users u',
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    for (const user of users) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Get user's weekly stats
      const [workoutStats, mealStats] = await Promise.all([
        new Promise((resolve) => {
          db.get(
            'SELECT COUNT(*) as count, COALESCE(SUM(calories_burned), 0) as total_calories FROM workouts WHERE user_id = ? AND date >= ?',
            [user.id, weekAgoStr],
            (err, result) => resolve(err ? { count: 0, total_calories: 0 } : result)
          );
        }),
        new Promise((resolve) => {
          db.get(
            'SELECT COUNT(*) as count, COALESCE(AVG(calories), 0) as avg_calories FROM meals WHERE user_id = ? AND date >= ?',
            [user.id, weekAgoStr],
            (err, result) => resolve(err ? { count: 0, avg_calories: 0 } : result)
          );
        })
      ]);

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
              <li>Proper nutrition fuels your success</li>
            </ul>
          </div>
          
          <p>Keep up the excellent work, and we'll see you in the app!</p>
          <p>Best regards,<br>Your Fitness & Diet Tracker Team</p>
        </div>
      `;

      // Send email (only if email service is configured)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `🏃‍♀️ Your Weekly Fitness Report - ${new Date().toLocaleDateString()}`,
            html: emailHtml
          });
          console.log(`Weekly report sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }
    }
    
    console.log('Weekly fitness report job completed');
  } catch (error) {
    console.error('Error running weekly fitness report job:', error);
  }
});

// Serve React app for all other routes
app.use((req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'client', 'public', 'index.html'));
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Fitness & Diet Tracker API ready!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});