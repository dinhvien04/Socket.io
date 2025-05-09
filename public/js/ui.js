// Theme handling
let isDarkMode = false;

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

    const themeIcon = document.querySelector('.theme-toggle i');
    themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';

    // Save preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Load saved theme preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
        const themeIcon = document.querySelector('.theme-toggle i');
        themeIcon.className = 'fas fa-sun';
    }
}

// Emoji picker
let isEmojiPickerVisible = false;

function toggleEmojiPicker() {
    const messageInput = document.getElementById('messageInput');

    if (!isEmojiPickerVisible) {
        // Create emoji picker container
        const picker = document.createElement('div');
        picker.className = 'emoji-picker-container';
        picker.style.position = 'absolute';
        picker.style.bottom = '80px';
        picker.style.left = '20px';
        picker.style.zIndex = '1000';

        // Add emoji categories
        const categories = {
            'Cảm xúc': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'],
            'Tình yêu': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖'],
            'Cử chỉ': ['👍', '👎', '👏', '🙌', '🤝', '👋', '🤟', '✌️', '🤞', '🤘'],
            'Động vật': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
            'Đồ ăn': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒']
        };

        // Create category tabs
        const tabs = document.createElement('div');
        tabs.className = 'emoji-tabs';
        Object.keys(categories).forEach(category => {
            const tab = document.createElement('button');
            tab.textContent = category;
            tab.onclick = () => showEmojiCategory(category, categories[category], picker);
            tabs.appendChild(tab);
        });
        picker.appendChild(tabs);

        // Create emoji grid
        const grid = document.createElement('div');
        grid.className = 'emoji-grid';
        picker.appendChild(grid);

        // Show first category by default
        showEmojiCategory('Cảm xúc', categories['Cảm xúc'], picker);

        document.querySelector('.input-container').appendChild(picker);
    } else {
        // Remove emoji picker
        const picker = document.querySelector('.emoji-picker-container');
        if (picker) picker.remove();
    }

    isEmojiPickerVisible = !isEmojiPickerVisible;
}

function showEmojiCategory(category, emojis, picker) {
    const grid = picker.querySelector('.emoji-grid');
    grid.innerHTML = '';

    emojis.forEach(emoji => {
        const emojiButton = document.createElement('button');
        emojiButton.textContent = emoji;
        emojiButton.className = 'emoji-button';
        emojiButton.onclick = () => {
            const messageInput = document.getElementById('messageInput');
            messageInput.value += emoji;
            toggleEmojiPicker(); // Close picker after selection
        };
        grid.appendChild(emojiButton);
    });
}

// Add emoji picker styles
const emojiStyles = document.createElement('style');
emojiStyles.textContent = `
    .emoji-picker-container {
        background-color: var(--card-background);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .emoji-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 5px;
    }

    .emoji-tabs button {
        background: none;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
        color: var(--text-color);
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .emoji-tabs button:hover {
        background-color: var(--border-color);
    }

    .emoji-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
        max-height: 200px;
        overflow-y: auto;
    }

    .emoji-button {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .emoji-button:hover {
        background-color: var(--border-color);
    }
`;
document.head.appendChild(emojiStyles);

// Toast notifications
function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        opacity: 0;
        transform: translateY(100%);
        transition: all 0.3s ease;
        z-index: 1000;
    }

    .toast.show {
        opacity: 1;
        transform: translateY(0);
    }

    .toast-info {
        background-color: var(--primary-color);
    }

    .toast-error {
        background-color: #dc3545;
    }

    .toast-success {
        background-color: #28a745;
    }
`;
document.head.appendChild(toastStyles);

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    loadThemePreference();
});

// Hiển thị/ẩn popup thông tin tài khoản
function toggleProfilePopup() {
    const popup = document.getElementById('profilePopup');
    if (popup.style.display === 'none' || popup.style.display === '') {
        // Cập nhật thông tin user
        if (typeof currentUser === 'object' && currentUser) {
            document.getElementById('profileUsername').textContent = currentUser.username || '';
            document.getElementById('profileEmail').textContent = currentUser.email || '';
        }
        popup.style.display = 'block';
        // Đóng popup khi click ra ngoài
        setTimeout(() => {
            document.addEventListener('mousedown', closeProfilePopupOnClickOutside);
        }, 0);
    } else {
        popup.style.display = 'none';
        document.removeEventListener('mousedown', closeProfilePopupOnClickOutside);
    }
}

function closeProfilePopupOnClickOutside(e) {
    const popup = document.getElementById('profilePopup');
    const profile = document.querySelector('.user-profile');
    if (!popup.contains(e.target) && !profile.contains(e.target)) {
        popup.style.display = 'none';
        document.removeEventListener('mousedown', closeProfilePopupOnClickOutside);
    }
}