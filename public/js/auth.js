// Authentication state
let currentUser = null;
let authToken = null;

// Show register form
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
}

// Show login form
function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'flex';
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Đăng nhập thất bại');
        }

        // Store auth data
        currentUser = data.user;
        authToken = data.token;
        localStorage.setItem('authToken', data.token);

        // Update UI
        document.getElementById('currentUser').textContent = currentUser.username;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';

        // Initialize chat
        if (typeof initializeChat === 'function') {
            initializeChat();
        }

    } catch (error) {
        alert(error.message);
    }
}

// Handle registration
async function handleRegister() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (!username || !email || !password || !confirmPassword) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }

    if (password !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Đăng ký thất bại');
        }

        // Show success message and switch to login form
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        showLoginForm();

    } catch (error) {
        alert(error.message);
    }
}

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        verifyToken(token);
    }
}

// Verify stored token
async function verifyToken(token) {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            authToken = token;

            // Update UI
            document.getElementById('currentUser').textContent = currentUser.username;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'flex';

            // Initialize chat
            if (typeof initializeChat === 'function') {
                initializeChat();
            }
        } else {
            localStorage.removeItem('authToken');
        }
    } catch (error) {
        localStorage.removeItem('authToken');
    }
}

// Logout function
function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');

    // Disconnect socket
    if (typeof socket !== 'undefined' && socket) {
        socket.disconnect();
    }

    // Reset UI
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
    document.getElementById('onlineUsers').innerHTML = '';
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', checkAuth); 