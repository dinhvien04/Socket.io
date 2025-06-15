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
        console.log('Nhận message mới:', data);
        appendMessage(data);
        if (data.username !== currentUser.username) {
            playNotificationSound();
        }
    });

    // User events
    socket.on('user:joined', (data) => {
        // showNotification(`${data.username} đã tham gia trò chuyện`, 'info');
    });

    socket.on('user:left', (data) => {
        // showNotification(`${data.username} đã rời khỏi trò chuyện`, 'info');
    });

    socket.on('user:typing', (data) => {
        updateTypingStatus(data);
    });

    socket.on('user:online-list', (userList) => {
        renderOnlineUsers(userList);
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
    console.log('[RENDER] appendMessage:', data);
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser.username ? 'sent' : 'received'}`;
    messageDiv.dataset.msgId = data._id;

    let content;
    if (data.type === 'audio' && data.content) {
        let audioUrl = data.content;
        if (audioUrl instanceof Blob) {
            audioUrl = URL.createObjectURL(audioUrl);
        }
        if (typeof audioUrl === 'string' && audioUrl.startsWith('/uploads/')) {
            audioUrl = window.location.origin + audioUrl;
        }
        content = `<audio controls src="${audioUrl}" style="width:180px;outline:none;border-radius:8px;"></audio>`;
    } else if (data.type === 'image' && data.content) {
        content = `<img src="${data.content}" class="chat-image" alt="image" />`;
    } else if (data.type === 'file' && data.content) {
        content = `<div><a href="${data.content}" target="_blank"><i class="fas fa-download"></i> Tải xuống</a></div>`;
    } else {
        content = data.content || data.message;
    }

    // Hiển thị trạng thái đã chỉnh sửa
    let editedTag = '';
    if (data.edited) {
        editedTag = `<span style='font-size:10px;color:#ccc;'>(đã chỉnh sửa)</span>`;
    }

    // Nút xóa và chỉnh sửa nếu là tin nhắn của chính user
    let actionBtns = '';
    if (data.username === currentUser.username && data._id) {
        actionBtns = `
            <button class="edit-msg-btn" onclick="startEditMessage('${data._id}', this)"><i class="fas fa-pen icon-edit"></i></button>
            <button class="delete-msg-btn" onclick="deleteMessage('${data._id}', this)"><i class="fas fa-trash icon-delete"></i></button>
        `;
    }

    // Nếu đang chỉnh sửa tin nhắn này
    if (editingMsgId === data._id) {
        messageDiv.innerHTML = `
            <strong>${data.username}</strong>
            <input type="text" class="edit-msg-input" value="${data.content || data.message}" style="width:70%" />
            <button class="btn-save-edit" onclick="saveEditMessage('${data._id}', this)">Lưu</button>
            <button class="btn-cancel-edit" onclick="cancelEditMessage()">Hủy</button>
            <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
            ${editedTag}
        `;
        setTimeout(() => {
            editingInput = messageDiv.querySelector('.edit-msg-input');
            if (editingInput) editingInput.focus();
        }, 0);
    } else {
        messageDiv.innerHTML = `
            <strong>${data.username}</strong>
            <p>${content}</p>
            <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
            ${editedTag}
            ${actionBtns}
        `;
    }

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
        console.log('[HISTORY] Tin nhắn từ API:', messages);
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        messages.forEach(message => {
            appendMessage({
                _id: message._id,
                username: message.sender.username,
                message: message.content,
                content: message.content,
                type: message.type,
                fileName: message.fileName,
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

// Hiện/ẩn menu chọn loại file
function toggleFileMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('fileMenu');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    if (menu.style.display === 'block') {
        setTimeout(() => {
            document.addEventListener('mousedown', closeFileMenuOnClickOutside);
        }, 0);
    } else {
        document.removeEventListener('mousedown', closeFileMenuOnClickOutside);
    }
}
function closeFileMenuOnClickOutside(e) {
    const menu = document.getElementById('fileMenu');
    const icon = document.querySelector('.file-attach i');
    if (!menu.contains(e.target) && !icon.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', closeFileMenuOnClickOutside);
    }
}
function triggerImageInput() {
    document.getElementById('fileMenu').style.display = 'none';
    document.getElementById('imageInput').click();
}
function triggerFileInput() {
    document.getElementById('fileMenu').style.display = 'none';
    document.getElementById('fileInput').click();
}

// Xử lý xem trước ảnh trước khi gửi
let previewImageFile = null;
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

imageInput.addEventListener('change', function () {
    if (!imageInput.files || imageInput.files.length === 0) return;
    const file = imageInput.files[0];
    if (!file.type.startsWith('image/')) return;
    previewImageFile = file;
    const reader = new FileReader();
    reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
});

// Resize/nén ảnh trước khi upload
async function resizeImageFile(file, maxSize = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = function (e) {
            img.onload = function () {
                let w = img.width;
                let h = img.height;
                if (w > h && w > maxSize) {
                    h = Math.round(h * maxSize / w);
                    w = maxSize;
                } else if (h > w && h > maxSize) {
                    w = Math.round(w * maxSize / h);
                    h = maxSize;
                } else if (w > maxSize) {
                    w = h = maxSize;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.sendImagePreview = async function () {
    if (!previewImageFile) return;
    // Resize/nén ảnh trước khi upload
    let uploadFile = previewImageFile;
    try {
        uploadFile = await resizeImageFile(previewImageFile, 1024, 0.8);
    } catch (e) {
        // Nếu lỗi thì gửi file gốc
        uploadFile = previewImageFile;
    }
    const formData = new FormData();
    formData.append('file', uploadFile, previewImageFile.name);
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.url) {
            const messageData = {
                content: data.url,
                type: 'image'
            };
            socket.emit('message:send', messageData);
        } else {
            showNotification('Tải ảnh thất bại', 'error');
        }
    } catch (err) {
        showNotification('Lỗi khi tải ảnh', 'error');
    }
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    previewImageFile = null;
    imageInput.value = '';
};

window.cancelImagePreview = function () {
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    previewImageFile = null;
    imageInput.value = '';
};

// Xử lý gửi file
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
            const messageData = {
                content: data.url,
                type: 'file',
                fileName: data.originalName
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

function renderOnlineUsers(userList) {
    const onlineUsersDiv = document.getElementById('onlineUsers');
    onlineUsersDiv.innerHTML = '';
    userList.forEach(username => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <i class="fas fa-circle online-icon"></i>
            <span>${username}</span>
        `;
        onlineUsersDiv.appendChild(userElement);
    });
}

// Show user info
async function showUserInfo(userId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Vui lòng đăng nhập', 'error');
            return;
        }

        const response = await fetch(`/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải thông tin người dùng');
        }

        const user = await response.json();

        // Update popup content
        document.getElementById('userInfoAvatar').src = user.avatar ?
            `/uploads/avatars/${user.avatar}` :
            'uploads/avatars/default-avatar.png';
        document.getElementById('userInfoUsername').textContent = user.username;
        document.getElementById('userInfoFullName').textContent = user.fullName || 'Chưa cập nhật';
        document.getElementById('userInfoEmail').textContent = user.email;
        document.getElementById('userInfoBio').textContent = user.bio || 'Chưa có thông tin';

        // Store current user ID for private chat
        currentChatUser = userId;

        // Show popup
        document.getElementById('userInfoPopup').style.display = 'block';
    } catch (error) {
        showToast('Lỗi khi tải thông tin người dùng', 'error');
    }
}

// Close user info popup
function closeUserInfo() {
    document.getElementById('userInfoPopup').style.display = 'none';
    currentChatUser = null;
}

// Start private chat
function startPrivateChat() {
    if (!currentChatUser) return;

    // Switch to private chat mode
    isPrivateChat = true;
    currentChatPartner = currentChatUser;

    // Update UI
    document.querySelector('.chat-header h2').textContent = 'Chat Riêng';
    document.getElementById('messages').innerHTML = '';

    // Load chat history
    loadPrivateChatHistory(currentChatUser);

    // Close popup
    closeUserInfo();
}

// Load private chat history
async function loadPrivateChatHistory(userId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`/api/messages/private/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) return;

        const messages = await response.json();
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Lỗi khi tải lịch sử chat:', error);
    }
}

// Update online users list
function updateOnlineUsers(users) {
    const onlineUsersContainer = document.getElementById('onlineUsers');
    onlineUsersContainer.innerHTML = '';

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <div class="user-avatar">
                <img src="${user.avatar ? `/uploads/avatars/${user.avatar}` : 'uploads/avatars/default-avatar.png'}" 
                     alt="${user.username}">
            </div>
            <div class="user-name" onclick="showUserInfo('${user._id}')">
                ${user.username}
            </div>
        `;
        onlineUsersContainer.appendChild(userElement);
    });
}

// Xóa tin nhắn khỏi giao diện và gọi API xóa thật sự
window.deleteMessage = async function (messageId, btn) {
    // Nếu là tin nhắn pending (chưa gửi lên server)
    if (messageId.startsWith('pending-')) {
        // Xóa khỏi giao diện
        const msgDiv = btn.closest('.message');
        if (msgDiv) msgDiv.remove();
        return;
    }
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này cho tất cả mọi người?')) return;
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (response.ok) {
            // Ẩn tin nhắn khỏi giao diện
            btn.closest('.message').remove();
        } else {
            showNotification('Không thể xóa tin nhắn', 'error');
        }
    } catch (err) {
        showNotification('Lỗi khi xóa tin nhắn', 'error');
    }
}

// Biến lưu trạng thái chỉnh sửa
let editingMsgId = null;
let editingInput = null;

// Bắt đầu chỉnh sửa
function startEditMessage(msgId, btn) {
    editingMsgId = msgId;
    reloadMessagesUI();
}

// Lưu chỉnh sửa
function saveEditMessage(msgId, btn) {
    const input = document.querySelector('.edit-msg-input');
    if (!input) return;
    const newContent = input.value.trim();
    if (!newContent) return;
    socket.emit('message:edit', { messageId: msgId, newContent });
    editingMsgId = null;
    reloadMessagesUI();
}

// Hủy chỉnh sửa
function cancelEditMessage() {
    editingMsgId = null;
    reloadMessagesUI();
}

// Lắng nghe sự kiện sửa tin nhắn
if (socket) {
    socket.on('message:edited', (updatedMsg) => {
        updateMessageInUI(updatedMsg);
    });
}

// Cập nhật lại tin nhắn đã chỉnh sửa trên UI
function updateMessageInUI(updatedMsg) {
    const messagesDiv = document.getElementById('messages');
    const msgDivs = messagesDiv.querySelectorAll('.message');
    msgDivs.forEach(div => {
        if (div.dataset.msgId === updatedMsg.id || div.dataset.msgId === updatedMsg._id) {
            div.querySelector('p').textContent = updatedMsg.content;
            if (updatedMsg.edited) {
                let tag = div.querySelector('span[style*="color:#ccc"]');
                if (!tag) {
                    tag = document.createElement('span');
                    tag.style.fontSize = '10px';
                    tag.style.color = '#ccc';
                    div.appendChild(tag);
                }
                tag.textContent = '(đã chỉnh sửa)';
            }
        }
    });
}

// Reload lại UI tin nhắn (dùng lại loadMessageHistory)
function reloadMessagesUI() {
    loadMessageHistory();
}

// --- Voice Recording UI Logic ---
let mediaRecorder;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let recordedAudioBlob = null;

const recordBtn = document.getElementById('recordBtn');
const inputContainer = document.getElementById('inputContainer');
const voiceRecordingUI = document.getElementById('voiceRecordingUI');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const cancelRecordBtn = document.getElementById('cancelRecordBtn');
const sendRecordBtn = document.getElementById('sendRecordBtn');
const recordingTime = document.getElementById('recordingTime');

function showRecordingUI() {
    inputContainer.style.display = 'none';
    voiceRecordingUI.style.display = 'flex';
    recordingTime.textContent = '0:00';
    sendRecordBtn.style.display = 'none';
    stopRecordBtn.style.display = '';
    recordedAudioBlob = null;
}
function hideRecordingUI() {
    inputContainer.style.display = '';
    voiceRecordingUI.style.display = 'none';
    clearInterval(recordingInterval);
    recordingSeconds = 0;
    recordingTime.textContent = '0:00';
    recordedAudioBlob = null;
}
function startRecording() {
    showRecordingUI();
    recordingSeconds = 0;
    recordingTime.textContent = '0:00';
    recordingInterval = setInterval(() => {
        recordingSeconds++;
        const min = Math.floor(recordingSeconds / 60);
        const sec = recordingSeconds % 60;
        recordingTime.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    }, 1000);
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            clearInterval(recordingInterval);
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendRecordBtn.style.display = '';
            stopRecordBtn.style.display = 'none';
        };
        mediaRecorder.start();
    }).catch(() => {
        alert('Không thể truy cập micro!');
        hideRecordingUI();
    });
}
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}
function cancelRecording() {
    hideRecordingUI();
}
sendRecordBtn.onclick = async function () {
    if (!recordedAudioBlob) return;
    // Render luôn voice message lên chat (pending)
    const fakeId = 'pending-' + Date.now();
    appendMessage({
        _id: fakeId,
        username: currentUser.username,
        content: URL.createObjectURL(recordedAudioBlob),
        type: 'audio',
        timestamp: new Date(),
        pending: true
    });
    // Upload file lên server
    const formData = new FormData();
    formData.append('file', recordedAudioBlob, 'voice-message.webm');
    formData.append('type', 'audio');
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data && data.fileUrl) {
            socket.emit('message:send', {
                type: 'audio',
                content: data.fileUrl
            });
        }
    } catch (e) {
        showNotification('Lỗi khi gửi file ghi âm', 'error');
    }
    hideRecordingUI();
};
recordBtn.onclick = startRecording;
stopRecordBtn.onclick = stopRecording;
cancelRecordBtn.onclick = cancelRecording;

// Lắng nghe message:new từ server, nếu là của mình và có pending thì xóa pending trước khi render
if (socket) {
    socket.on('message:new', (data) => {
        // Nếu là tin nhắn của mình và là audio, xóa pending
        if (data.username === currentUser.username && data.type === 'audio') {
            const messagesDiv = document.getElementById('messages');
            const pendingDiv = messagesDiv.querySelector('.message[data-msg-id^="pending-"]');
            if (pendingDiv) pendingDiv.remove();
        }
        appendMessage(data);
    });
} 