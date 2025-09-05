// DOM Elements
const authBtn = document.getElementById('auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const getStartedBtn = document.getElementById('get-started-btn');
const welcomeSection = document.getElementById('welcome-section');
const dashboardSection = document.getElementById('dashboard-section');
const userWelcome = document.getElementById('user-welcome');
const messageContainer = document.getElementById('message-container');

// State
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    initEventListeners();
});

// Event Listeners
function initEventListeners() {
    authBtn.addEventListener('click', openAuthModal);
    logoutBtn.addEventListener('click', logout);
    closeModal.addEventListener('click', closeAuthModal);
    loginTab.addEventListener('click', () => switchTab('login'));
    registerTab.addEventListener('click', () => switchTab('register'));
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    getStartedBtn.addEventListener('click', openAuthModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });
}

// Authentication functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            updateUI(true);
        } else {
            updateUI(false);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateUI(false);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data;
            showMessage('Login successful!', 'success');
            closeAuthModal();
            updateUI(true);
            loginForm.reset();
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data;
            showMessage('Registration successful! Welcome aboard!', 'success');
            closeAuthModal();
            updateUI(true);
            registerForm.reset();
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            showMessage('Logged out successfully', 'success');
            updateUI(false);
        } else {
            showMessage('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Network error during logout', 'error');
    }
}

// UI functions
function updateUI(isAuthenticated) {
    if (isAuthenticated && currentUser) {
        // Show authenticated state
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        welcomeSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        userWelcome.textContent = `Welcome back, ${currentUser.username}!`;
    } else {
        // Show unauthenticated state
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        welcomeSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }
}

function openAuthModal() {
    authModal.style.display = 'block';
    switchTab('login');
}

function closeAuthModal() {
    authModal.style.display = 'none';
    loginForm.reset();
    registerForm.reset();
}

function switchTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

function showMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    messageContainer.appendChild(messageEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}

// API health check on load
fetch('/api/health')
    .then(response => response.json())
    .then(data => {
        console.log('API Status:', data.message);
    })
    .catch(error => {
        console.error('API health check failed:', error);
    });