/**
 * Customatch Authentication Module
 * Client-side user authentication with Google Sheets storage integration
 * Uses localStorage for client-side session management
 */

// ============================================
// Constants & Configuration
// ============================================

const AUTH_USERS_KEY = 'customatchUsers';
const AUTH_SESSION_KEY = 'customatchCurrentUser';
const AUTH_ATTEMPTS_KEY = 'customatchLoginAttempts';
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const DEMO_USER_EMAIL = 'demo@customatch.com';
const DEMO_USER_PASSWORD = 'Password123';

// Google Sheets integration
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyTgDArAbinaTureISHkz6uzymkApvjnN2fiKCjpselw6PTyigZjx8tNBYJ2e9ORI_v/exec';

// Auto-initialize demo user on first load
(function initializeDemoUser() {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    const demoExists = users.some(u => u.email === DEMO_USER_EMAIL);
    if (!demoExists) {
        users.push({
            id: 'demo-user-001',
            name: 'Demo User',
            email: DEMO_USER_EMAIL,
            password: DEMO_USER_PASSWORD,
            createdAt: new Date().toISOString(),
            status: 'active'
        });
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    }
})();

// ============================================
// Utility Functions
// ============================================

function sanitizeInput(input) {
    return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .trim();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

function validatePasswordStrength(password) {
    if (!password || password.length < 8) {
        return {score: 0, feedback: 'Password must be at least 8 characters.'};
    }
    
    let score = 1;
    const strength = {
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    if (strength.hasUpper && strength.hasLower) score++;
    if (strength.hasNumber || strength.hasSpecial) score++;
    
    let feedback = '';
    if (score === 1) feedback = 'Weak - add upper/lowercase & numbers';
    else if (score === 2) feedback = 'Fair - add special characters';
    else if (score === 3) feedback = 'Strong password';
    
    return {score: Math.min(score, 3), feedback, strength};
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ============================================
// Google Sheets Integration
// ============================================

function sendToGoogleSheets(userData) {
    /**
     * Send user credentials to Google Sheets via Google Apps Script webhook
     */
    const payload = {
        action: 'addUser',
        name: userData.name,
        email: userData.email,
        password: userData.password,
        createdAt: userData.createdAt,
        status: userData.status || 'active'
    };
    
    fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        console.log('User data saved to Google Sheets:', userData.email);
    }).catch(err => {
        console.error('Error saving to Google Sheets:', err);
    });
}

// ============================================
// Login Attempt Tracking (Rate Limiting)
// ============================================

function getLoginAttempts(email) {
    try {
        const attempts = JSON.parse(
            localStorage.getItem(`${AUTH_ATTEMPTS_KEY}_${email}`) || '{"count": 0, "lastAttempt": 0}'
        );
        return attempts;
    } catch (e) {
        return {count: 0, lastAttempt: 0};
    }
}

function recordLoginAttempt(email, success) {
    const attempts = getLoginAttempts(email);
    const now = Date.now();
    
    if (success) {
        localStorage.removeItem(`${AUTH_ATTEMPTS_KEY}_${email}`);
    } else {
        attempts.count++;
        attempts.lastAttempt = now;
        localStorage.setItem(`${AUTH_ATTEMPTS_KEY}_${email}`, JSON.stringify(attempts));
    }
}

function isAccountLocked(email) {
    const attempts = getLoginAttempts(email);
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_DURATION_MS) {
            return true;
        } else {
            localStorage.removeItem(`${AUTH_ATTEMPTS_KEY}_${email}`);
            return false;
        }
    }
    return false;
}

function getRemainingLockoutTime(email) {
    const attempts = getLoginAttempts(email);
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        const remainingMs = LOCKOUT_DURATION_MS - timeSinceLastAttempt;
        if (remainingMs > 0) {
            return Math.ceil(remainingMs / 60000);
        }
    }
    return 0;
}

// ============================================
// User Storage Management
// ============================================

function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
    } catch (e) {
        console.error('Error reading users storage', e);
        return [];
    }
}

function saveStoredUsers(users) {
    try {
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Error saving users storage', e);
        return false;
    }
}

// ============================================
// Authentication Core Functions
// ============================================

function registerUser({name, email, password}) {
    // Validate inputs
    if (!name || !email || !password) {
        return {success: false, message: 'All fields are required.'};
    }
    
    const trimmedName = sanitizeInput(name);
    const trimmedEmail = sanitizeInput(email).toLowerCase();
    
    if (trimmedName.length < 2) {
        return {success: false, message: 'Name must be at least 2 characters.'};
    }
    
    if (password.length < 8) {
        return {success: false, message: 'Password must be at least 8 characters.'};
    }
    
    const strengthCheck = validatePasswordStrength(password);
    if (strengthCheck.score < 2) {
        return {success: false, message: `Password is ${strengthCheck.feedback}`};
    }
    
    if (!validateEmail(trimmedEmail)) {
        return {success: false, message: 'Please enter a valid email address.'};
    }

    const users = getStoredUsers();
    const existing = users.find(u => u.email === trimmedEmail);
    if (existing) {
        return {success: false, message: 'This email is already registered. Please log in instead.'};
    }

    const user = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: trimmedName,
        email: trimmedEmail,
        password: password,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        status: 'active'
    };
    
    users.push(user);
    if (!saveStoredUsers(users)) {
        return {success: false, message: 'Failed to create account. Please try again.'};
    }
    
    // Send to Google Sheets
    sendToGoogleSheets(user);
    
    // Create session
    const sessionData = {
        userId: user.id,
        name: user.name,
        email: user.email,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString()
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    localStorage.removeItem(`${AUTH_ATTEMPTS_KEY}_${trimmedEmail}`);

    return {
        success: true,
        user: sessionData,
        message: `Welcome ${trimmedName}! Account created successfully.`
    };
}

function loginUser({email, password}) {
    if (!email || !password) {
        return {success: false, message: 'Email and password are required.'};
    }
    
    const trimmedEmail = sanitizeInput(email).toLowerCase();
    
    // Check if account is locked
    if (isAccountLocked(trimmedEmail)) {
        const remainingTime = getRemainingLockoutTime(trimmedEmail);
        return {
            success: false,
            message: `Too many failed attempts. Try again in ${remainingTime} minute(s).`,
            locked: true
        };
    }
    
    const users = getStoredUsers();
    const user = users.find(u => u.email === trimmedEmail && u.password === password);
    
    if (!user) {
        recordLoginAttempt(trimmedEmail, false);
        const attempts = getLoginAttempts(trimmedEmail);
        const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
        
        let message = 'Email or password is incorrect.';
        if (remaining <= 2 && remaining > 0) {
            message += ` (${remaining} attempt${remaining > 1 ? 's' : ''} left)`;
        }
        
        return {success: false, message};
    }

    // Check session timeout
    if (user.lastLogin) {
        const lastLoginTime = new Date(user.lastLogin).getTime();
        if (Date.now() - lastLoginTime > SESSION_TIMEOUT_MS) {
            return {
                success: false,
                message: 'Your previous session expired. Please log in again.'
            };
        }
    }

    recordLoginAttempt(trimmedEmail, true);
    user.lastLogin = new Date().toISOString();
    saveStoredUsers(users);

    const sessionData = {
        userId: user.id,
        name: user.name,
        email: user.email,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS).toISOString()
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    
    return {
        success: true,
        user: sessionData,
        message: `Welcome back, ${user.name}!`
    };
}

function logoutUser() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    if (window.sessionCheckInterval) {
        clearInterval(window.sessionCheckInterval);
    }
    window.location.href = '/pages/login.html';
}

function getCurrentUser() {
    try {
        const session = localStorage.getItem(AUTH_SESSION_KEY);
        if (!session) return null;
        
        const user = JSON.parse(session);
        const expiresAt = new Date(user.expiresAt).getTime();
        
        // Check if session expired
        if (Date.now() > expiresAt) {
            localStorage.removeItem(AUTH_SESSION_KEY);
            return null;
        }
        
        return user;
    } catch (e) {
        return null;
    }
}

// ============================================
// Session & Navigation Utilities
// ============================================

function requireAuth(redirect = null) {
    const user = getCurrentUser();
    if (!user) {
        // Use provided redirect or determine context-aware default
        const redirectPath = redirect || (window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html');
        window.location.href = redirectPath;
        return false;
    }
    return true;
}

function renderAuthActions(targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    // Determine context-aware paths
    const isInPages = window.location.pathname.includes('/pages/');
    const loginPath = isInPages ? 'login.html' : '/pages/login.html';
    const signupPath = isInPages ? 'signup.html' : '/pages/signup.html';

    const user = getCurrentUser();
    if (user) {
        container.innerHTML = `
            <span style="margin-right: var(--spacing-md); display: flex; align-items: center; gap: var(--spacing-sm);">
                <i class="fas fa-user-circle" style="font-size: 1.2rem;"></i>
                <span>Welcome, ${escapeHTML(user.name)}</span>
            </span>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: var(--font-size-sm);" onclick="logoutUser()">
                <i class="fas fa-sign-out-alt" style="margin-right: 0.5rem;"></i>Logout
            </button>
        `;
    } else {
        container.innerHTML = `
            <a class="btn btn-secondary" href="${loginPath}" style="padding: 0.5rem 1rem; font-size: var(--font-size-sm);">
                <i class="fas fa-sign-in-alt" style="margin-right: 0.5rem;"></i>Login
            </a>
            <a class="btn btn-primary" href="${signupPath}" style="padding: 0.5rem 1rem; font-size: var(--font-size-sm); margin-left: var(--spacing-sm);">
                <i class="fas fa-user-plus" style="margin-right: 0.5rem;"></i>Sign Up
            </a>
        `;
    }
}

function navigateTo(path) {
    // Protected routes require authentication
    const protectedRoutes = ['customize', 'checkout', 'providers', 'tracking', 'confirmation'];
    const isProtected = protectedRoutes.some(route => path.includes(route));
    
    if (isProtected && !getCurrentUser()) {
        localStorage.setItem('postAuthRedirect', path);
        // Determine context-aware login path
        const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : '/pages/login.html';
        window.location.href = loginPath;
        return;
    }
    
    window.location.href = path;
}

function applyPostAuthRedirect(defaultPath = null) {
    const redirect = localStorage.getItem('postAuthRedirect');
    if (redirect) {
        localStorage.removeItem('postAuthRedirect');
        window.location.href = redirect;
        return true;
    }
    // Use provided default or determine context-aware default (redirects to index.html)
    const finalPath = defaultPath || (window.location.pathname.includes('/pages/') ? '../index.html' : '/index.html');
    window.location.href = finalPath;
    return false;
}

// ============================================
// Session Monitoring
// ============================================

function startSessionMonitor() {
    window.sessionCheckInterval = setInterval(() => {
        const user = getCurrentUser();
        if (!user) {
            // Session expired or user logged out
            if (window.location.pathname.includes('customize') || 
                window.location.pathname.includes('checkout')) {
                window.location.href = '/pages/login.html';
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}

// Initialize on page load if an auth-protected page
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', startSessionMonitor);
}