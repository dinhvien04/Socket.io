// Cookie helper functions
function setCookie(name, value, maxAgeSeconds) {
    document.cookie = `${name}=${value}; max-age=${maxAgeSeconds}; path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
}

// Check authentication
document.addEventListener('DOMContentLoaded', async () => {
    const token = getCookie('authToken');
    if (!token) {
        showToast('Vui lòng đăng nhập', 'error');
        window.location.replace('index.html');
        return;
    }

    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // Token expired, try to refresh
            const refreshToken = getCookie('refreshToken');
            if (refreshToken) {
                try {
                    const refreshResponse = await fetch('/api/auth/refresh-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (refreshResponse.ok) {
                        const data = await refreshResponse.json();
                        setCookie('authToken', data.token, 600);
                        // Retry the profile request with new token
                        return loadProfile(data.token);
                    }
                } catch (error) {
                    console.error('Không thể làm mới token:', error);
                }
            }
            showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
            deleteCookie('authToken');
            deleteCookie('refreshToken');
            window.location.replace('index.html');
            return;
        }

        if (!response.ok) {
            throw new Error('Không thể tải thông tin người dùng');
        }

        const user = await response.json();
        loadProfileData(user);
    } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
        showToast('Lỗi khi tải thông tin người dùng', 'error');
    }
});

// Load profile data
function loadProfileData(user) {
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('bio').value = user.bio || '';

    if (user.avatar) {
        document.getElementById('avatar-preview').src = `/uploads/avatars/${user.avatar}`;
    }
}

// Load profile with token
async function loadProfile(token) {
    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải thông tin người dùng');
        }

        const user = await response.json();
        loadProfileData(user);
    } catch (error) {
        console.error('Không thể tải thông tin người dùng:', error);
        showToast('Lỗi khi tải thông tin người dùng', 'error');
    }
}

// Update profile
async function updateProfile() {
    try {
        const token = getCookie('authToken');
        if (!token) {
            showToast('Vui lòng đăng nhập', 'error');
            window.location.replace('index.html');
            return;
        }

        const fullName = document.getElementById('fullName').value;
        const bio = document.getElementById('bio').value;

        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fullName, bio })
        });

        if (!response.ok) {
            throw new Error('Không thể cập nhật thông tin');
        }

        showToast('Cập nhật thông tin thành công', 'success');
    } catch (error) {
        showToast('Lỗi khi cập nhật thông tin', 'error');
    }
}

// Change password
async function changePassword() {
    try {
        const token = getCookie('authToken');
        if (!token) {
            showToast('Vui lòng đăng nhập', 'error');
            window.location.replace('index.html');
            return;
        }

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Mật khẩu mới không khớp', 'error');
            return;
        }

        const response = await fetch('/api/users/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Không thể đổi mật khẩu');
        }

        showToast('Đổi mật khẩu thành công', 'success');

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // Xóa token cũ và chuyển về trang đăng nhập
        deleteCookie('authToken');
        deleteCookie('refreshToken');
        setTimeout(() => {
            window.location.replace('index.html');
        }, 1500);
    } catch (error) {
        showToast(error.message || 'Lỗi khi đổi mật khẩu', 'error');
    }
}

// Handle avatar upload
document.getElementById('avatar-input').addEventListener('change', async (e) => {
    try {
        const token = getCookie('authToken');
        if (!token) {
            showToast('Vui lòng đăng nhập', 'error');
            window.location.replace('index.html');
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        // Preview image
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload image
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/users/avatar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Không thể tải lên ảnh đại diện');
        }

        const data = await response.json();
        if (data.avatar) {
            showToast('Cập nhật ảnh đại diện thành công', 'success');
            // Cập nhật ảnh đại diện trong profile
            document.getElementById('avatar-preview').src = `/uploads/avatars/${data.avatar}`;
        } else {
            throw new Error('Không thể cập nhật ảnh đại diện');
        }
    } catch (error) {
        showToast('Lỗi khi cập nhật ảnh đại diện', 'error');
        console.error('Lỗi khi cập nhật ảnh đại diện:', error);
    }
});

// Forgot password
function forgotPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        showToast('Vui lòng nhập email', 'error');
        return;
    }

    fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
        .then(response => response.json())
        .then(data => {
            showToast('Đã gửi email khôi phục mật khẩu', 'success');
        })
        .catch(error => {
            showToast('Lỗi khi gửi email khôi phục', 'error');
        });
}

// Logout
function logout() {
    showToast('Đang đăng xuất...', 'info');
    deleteCookie('authToken');
    deleteCookie('refreshToken');
    window.location.replace('index.html');
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
} 