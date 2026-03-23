// script.js - Lap.MS мессенджер

const API_URL = 'https://script.google.com/macros/s/AKfycbwCQ810p1F5XhIO94Armb5iY5_W73MKRcPsHERMdOZvbk7E0zFocR1Qy7hd4rYOhqMPhw/exec';

// Текущее состояние
let state = {
    token: null,
    user: null,
    currentChat: null,
    currentView: 'chats',
    messages: [],
    chats: [],
    groups: [],
    channels: [],
    settings: {
        sound: true,
        showOnline: true
    }
};

// ========== API ЗАПРОСЫ (ТОЛЬКО GET) ==========
async function callAPI(action, params = {}) {
    try {
        // Строим URL с параметрами
        let url = `${API_URL}?action=${action}`;
        
        // Добавляем все параметры в URL
        for (let key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url += `&${key}=${encodeURIComponent(params[key])}`;
            }
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log(`API ${action}:`, result);
        return result;
        
    } catch(e) {
        console.error('API Error:', e);
        return { success: false, error: 'Ошибка соединения' };
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadCachedData();
    initEventListeners();
    
    if (state.token && state.user) {
        showMainScreen();
        loadChats();
    }
});

function loadCachedData() {
    const cached = localStorage.getItem('lapms_session');
    if (cached) {
        const data = JSON.parse(cached);
        state.token = data.token;
        state.user = data.user;
        state.settings = data.settings || state.settings;
    }
}

function saveSession() {
    localStorage.setItem('lapms_session', JSON.stringify({
        token: state.token,
        user: state.user,
        settings: state.settings
    }));
}

// ========== ВХОД ==========
let currentMethod = 'password';
let codeRequested = false;

function initEventListeners() {
    // Вкладки входа
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
        });
    });
    
    // Методы входа
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMethod = btn.dataset.method;
            
            const passwordField = document.getElementById('passwordField');
            const codeField = document.getElementById('codeField');
            
            if (currentMethod === 'password') {
                passwordField.style.display = 'block';
                codeField.style.display = 'none';
            } else {
                passwordField.style.display = 'none';
                codeField.style.display = 'block';
            }
        });
    });
    
    // Получить код
    document.getElementById('getCodeBtn')?.addEventListener('click', async () => {
        const token = document.getElementById('loginToken').value.trim();
        if (!token) {
            showError('Введите токен');
            return;
        }
        
        const result = await callAPI('login_code_request', { token });
        if (result.success) {
            showError('Код отправлен в Telegram!', 'success');
            codeRequested = true;
        } else {
            showError(result.error);
        }
    });
    
    // Кнопка входа
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const token = document.getElementById('loginToken').value.trim();
        if (!token) {
            showError('Введите токен');
            return;
        }
        
        let result;
        if (currentMethod === 'password') {
            const password = document.getElementById('loginPassword').value;
            result = await callAPI('login_password', { token, password });
        } else {
            const code = document.getElementById('loginCode').value;
            result = await callAPI('login_code', { token, code });
        }
        
        if (result.success) {
            state.token = token;
            state.user = result.user;
            saveSession();
            showMainScreen();
            loadChats();
        } else {
            showError(result.error);
        }
    });
    
    // Выход
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('lapms_session');
        state.token = null;
        state.user = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainScreen').style.display = 'none';
    });
    
    // Меню навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            state.currentView = view;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCurrentView();
        });
    });
    
    // Отправка сообщения
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Прикрепление файла
    document.getElementById('attachBtn')?.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput')?.addEventListener('change', handleFileUpload);
    
    // Модальное окно
    document.querySelector('.modal-close')?.addEventListener('click', () => {
        document.getElementById('mediaModal').style.display = 'none';
    });
    
    // Меню на телефоне
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
    });
    
    document.getElementById('closeSidebar')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });
}

function showError(msg, type = 'error') {
    const el = document.getElementById('loginError');
    if (el) {
        el.textContent = msg;
        el.style.color = type === 'error' ? '#ff6b6b' : '#6c5ce7';
        setTimeout(() => { el.textContent = ''; }, 3000);
    }
}

function showMainScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
    document.getElementById('userName').textContent = state.user.display_name;
    document.getElementById('userTag').textContent = state.user.user_tag;
    
    if (state.user.avatar_url) {
        document.getElementById('userAvatar').style.backgroundImage = `url(${state.user.avatar_url})`;
    }
    
    if (state.user.role === 'admin') {
        document.getElementById('adminBtn').style.display = 'flex';
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadChats() {
    const result = await callAPI('get_chats', { token: state.token });
    if (result.success) {
        state.chats = result.chats;
        renderChatsList();
    }
}

function renderChatsList() {
    const container = document.getElementById('chatsList');
    if (!container) return;
    
    container.innerHTML = state.chats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.chat_id}" data-token="${chat.user.token}">
            <div class="chat-avatar" style="background-image: url(${chat.user.avatar_url || ''})"></div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.user.display_name)}</div>
                <div class="chat-last-msg">${escapeHtml(chat.last_message || '')}</div>
            </div>
            <div class="chat-time">${formatTime(chat.last_message_time)}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => {
            const chatId = el.dataset.chatId;
            const userToken = el.dataset.token;
            state.currentChat = { chatId, userToken };
            loadMessages(chatId);
            
            document.querySelectorAll('.chat-item').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            
            document.getElementById('chatName').textContent = el.querySelector('.chat-name').textContent;
            
            if (window.innerWidth <= 768) {
                document.getElementById('chatsPanel').classList.remove('open');
            }
        });
    });
}

async function loadMessages(chatId) {
    const result = await callAPI('get_messages', { token: state.token, chat_id: chatId });
    if (result.success) {
        state.messages = result.messages;
        renderMessages();
    }
}

function renderMessages() {
    const container = document.getElementById('messagesList');
    if (!container) return;
    
    container.innerHTML = state.messages.map(msg => `
        <div class="message ${msg.from_token === state.token ? 'outgoing' : 'incoming'}">
            <div class="message-bubble">
                ${renderMessageContent(msg)}
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
        </div>
    `).join('');
    
    // Скролл вниз
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderMessageContent(msg) {
    switch(msg.type) {
        case 'photo':
            return `<img src="${msg.file_url}" class="message-image" onclick="openMedia('${msg.file_url}', 'image')">`;
        case 'video':
            return `<video controls class="message-video" src="${msg.file_url}"></video>`;
        case 'audio':
            return `<audio controls class="message-audio" src="${msg.file_url}"></audio>`;
        case 'file':
            return `<a href="${msg.file_url}" download class="file-download">📎 ${msg.content}</a>`;
        default:
            return `<div class="message-text">${escapeHtml(msg.content)}</div>`;
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content && !pendingFile) return;
    
    if (!state.currentChat) return;
    
    const result = await callAPI('send_message', {
        token: state.token,
        to_token: state.currentChat.userToken,
        content: content,
        type: pendingFile ? pendingFile.type : 'text',
        file_url: pendingFile ? pendingFile.url : ''
    });
    
    if (result.success) {
        input.value = '';
        pendingFile = null;
        loadMessages(state.currentChat.chatId);
        playNotification();
    }
}

let pendingFile = null;

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Для файлов нужно загружать через POST с FormData
    // Пока сохраняем локально
    const reader = new FileReader();
    reader.onload = async (e) => {
        pendingFile = {
            name: file.name,
            type: file.type.startsWith('image/') ? 'photo' :
                  file.type.startsWith('video/') ? 'video' :
                  file.type.startsWith('audio/') ? 'audio' : 'file',
            url: e.target.result,
            size: file.size
        };
        
        // Автоотправка после загрузки
        sendMessage();
    };
    reader.readAsDataURL(file);
}

function playNotification() {
    if (state.settings.sound) {
        const audio = document.getElementById('notificationSound');
        audio.play().catch(e => console.log('Audio play failed'));
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function openMedia(url, type) {
    const modal = document.getElementById('mediaModal');
    const img = document.getElementById('modalImage');
    const video = document.getElementById('modalVideo');
    
    if (type === 'image') {
        img.style.display = 'block';
        video.style.display = 'none';
        img.src = url;
    } else {
        img.style.display = 'none';
        video.style.display = 'block';
        video.src = url;
    }
    
    modal.style.display = 'flex';
}

function renderCurrentView() {
    const views = ['chats', 'groups', 'channels', 'favorites', 'profile', 'settings', 'admin'];
    views.forEach(v => {
        const el = document.getElementById(`${v}View`);
        if (el) el.style.display = v === state.currentView ? 'block' : 'none';
    });
}

// Периодическое обновление сообщений
setInterval(() => {
    if (state.currentChat) {
        loadMessages(state.currentChat.chatId);
    }
}, 3000);
