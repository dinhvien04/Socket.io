let socket;
const messageSound = document.getElementById('notificationSound');

// Initialize chat connection
function initializeChat() {
    socket = io({
        auth: {
            token: authToken
        }
    });

    // Connection events
    socket.on('connect', () => {
        console.log('Đã kết nối với máy chủ');
        socket.emit('user:join', currentUser.username);
    });

    socket.on('connect_error', (error) => {
        console.error('Lỗi kết nối:', error);
        showNotification('Lỗi kết nối. Vui lòng thử lại.', 'error');
    });

    // Message events
    socket.on('message:new', (data) => {
        appendMessage(data);
        if (data.username !== currentUser.username) {
            playNotificationSound();
        }
    });

    // User events
    socket.on('user:joined', (data) => {
        updateOnlineUsers(data);
        showNotification(`${data.username} đã tham gia trò chuyện`, 'info');
    });

    socket.on('user:left', (data) => {
        updateOnlineUsers(data);
        showNotification(`${data.username} đã rời khỏi trò chuyện`, 'info');
    });

    socket.on('user:typing', (data) => {
        updateTypingStatus(data);
    });

    // Load message history
    loadMessageHistory();
}

// Send message
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    const messageData = {
        content: message,
        type: 'text'
    };

    socket.emit('message:send', messageData);
    messageInput.value = '';
}

// Append message to chat
function appendMessage(data) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser.username ? 'sent' : 'received'}`;

    let content = '';
    if (data.type === 'emoji') {
        content = `<span style="font-size: 2em;">${data.content || data.message}</span>`;
    } else if (data.type === 'image') {
        content = `<img src="${data.content}" alt="image" style="max-width:180px;max-height:180px;border-radius:8px;box-shadow:0 2px 8px #0002;" />`;
    } else if (data.type === 'file') {
        const fileName = data.content.split('/').pop();
        content = `<a href="${data.content}" target="_blank" download style="color:#2196f3;"><i class="fas fa-file-alt"></i> ${fileName}</a>`;
    } else {
        content = data.content || data.message;
    }

    messageDiv.innerHTML = `
        <strong>${data.username}</strong>
        <p>${content}</p>
        <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
    `;

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Load message history
async function loadMessageHistory() {
    try {
        const response = await fetch('/api/messages', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) throw new Error('Không thể tải lịch sử tin nhắn');

        const messages = await response.json();
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';

        messages.forEach(message => {
            appendMessage({
                username: message.sender.username,
                message: message.content,
                type: message.type,
                timestamp: message.createdAt
            });
        });

    } catch (error) {
        showNotification('Không thể tải lịch sử tin nhắn', 'error');
    }
}

// Update online users list
function updateOnlineUsers(data) {
    const onlineUsersDiv = document.getElementById('onlineUsers');
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    userElement.innerHTML = `
        <i class="fas fa-circle online-icon"></i>
        <span>${data.username}</span>
    `;
    onlineUsersDiv.appendChild(userElement);
}

// Update typing status
function updateTypingStatus(data) {
    const typingIndicator = document.getElementById('typingIndicator');
    if (data.isTyping) {
        typingIndicator.textContent = `${data.username} đang nhập tin nhắn...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// Play notification sound
function playNotificationSound() {
    messageSound.play().catch(error => console.log('Không thể phát âm thanh:', error));
}

// Handle typing indicator
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
    socket.emit('user:typing', true);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('user:typing', false);
    }, 1000);
});

// Handle Enter key in message input
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Xử lý gửi file/ảnh
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async function () {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.url) {
            // Gửi tin nhắn kiểu ảnh hoặc file
            const messageData = {
                content: data.url,
                type: data.type // 'image' hoặc 'file'
            };
            socket.emit('message:send', messageData);
        } else {
            showNotification('Tải file thất bại', 'error');
        }
    } catch (err) {
        showNotification('Lỗi khi tải file', 'error');
    }
    fileInput.value = '';
}); 