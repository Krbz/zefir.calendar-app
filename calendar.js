// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentDate = new Date();
let currentUserId = null;
let currentMode = 'personal';
let selectedDate = null;
let notesData = {};

// ========== DOM ЭЛЕМЕНТЫ ==========
const calendarDays = document.getElementById('calendarDays');
const currentMonthYearSpan = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const personalModeBtn = document.getElementById('personalModeBtn');
const sharedModeBtn = document.getElementById('sharedModeBtn');
const notesList = document.getElementById('notesList');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailSpan = document.getElementById('userEmail');
const selectedDateTitle = document.getElementById('selectedDateTitle');
const loadingOverlay = document.getElementById('loadingOverlay');
const notesStats = document.getElementById('notesStats');

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showLoading(show) {
    if (loadingOverlay) loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.remove) notification.remove();
    }, 5000);
}

// === НОВОЕ: ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ НА САЙТЕ (INLINE) ===
function showInlineNotification(title, message, type = 'reminder') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'inline-notification';
    
    let bgColor = '#667eea';
    let icon = '📅';
    if (type === 'today') { bgColor = '#4caf50'; icon = '🔔'; }
    if (type === 'tomorrow') { bgColor = '#ff9800'; icon = '⏰'; }
    if (type === '3days') { bgColor = '#2196f3'; icon = '📆'; }
    
    notificationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 320px;
        max-width: 400px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease-out;
        border-left: 4px solid ${bgColor};
        overflow: hidden;
    `;
    
    notificationDiv.innerHTML = `
        <div style="display: flex; align-items: stretch;">
            <div style="background: ${bgColor}; width: 60px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                ${icon}
            </div>
            <div style="flex: 1; padding: 15px;">
                <strong style="color: #333; font-size: 15px; display: block; margin-bottom: 5px;">${title}</strong>
                <div style="color: #666; font-size: 13px; line-height: 1.4;">${message}</div>
            </div>
            <button onclick="this.closest('.inline-notification').remove()" 
                    style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 12px; color: #999;">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notificationDiv);
    
    setTimeout(() => {
        if (notificationDiv && notificationDiv.remove) notificationDiv.remove();
    }, 10000);
}

// === НОВОЕ: БРАУЗЕРНЫЕ PUSH-УВЕДОМЛЕНИЯ ===
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Браузер не поддерживает уведомления');
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

function showBrowserNotification(title, body, date, noteId) {
    if (Notification.permission !== 'granted') return;
    
    const notification = new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23667eea"/%3E%3Ctext x="50" y="67" font-size="50" text-anchor="middle" fill="white"%3E📅%3C/text%3E%3C/svg%3E',
        tag: `reminder_${date}_${noteId}`,
        renotify: false,
        silent: false,
        requireInteraction: true
    });
    
    setTimeout(() => notification.close(), 8000);
    
    notification.onclick = () => {
        window.focus();
        // Если есть дата в уведомлении, выделяем её в календаре
        if (date && typeof selectDate === 'function') {
            selectDate(date);
        }
        notification.close();
    };
}

// === НОВОЕ: ПРОВЕРКА И ПОКАЗ ВСЕХ НАПОМИНАНИЙ ===
function checkAllReminders() {
    if (!notesData) return;
    
    const today = new Date();
    const todayStr = formatDate(today);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);
    const threeDaysStr = formatDate(threeDays);
    
    const processedKey = `reminder_processed_${todayStr}`;
    
    // Проверка на сегодня (один раз в день)
    if (!localStorage.getItem(processedKey)) {
        if (notesData[todayStr] && Object.keys(notesData[todayStr]).length > 0) {
            const count = Object.keys(notesData[todayStr]).length;
            const noteTitles = Object.values(notesData[todayStr]).map(n => n.title).join(', ');
            
            // Inline уведомление
            showInlineNotification(
                `🔔 Напоминание на сегодня (${count})`,
                `У вас ${count} заметка на сегодня: ${noteTitles.substring(0, 100)}`,
                'today'
            );
            
            // Browser уведомление
            showBrowserNotification(
                'Календарь заметок',
                `У вас ${count} заметка на сегодня: ${noteTitles.substring(0, 80)}`,
                todayStr,
                'today'
            );
        }
        
        // Проверка на завтра
        if (notesData[tomorrowStr] && Object.keys(notesData[tomorrowStr]).length > 0) {
            const count = Object.keys(notesData[tomorrowStr]).length;
            const noteTitles = Object.values(notesData[tomorrowStr]).map(n => n.title).join(', ');
            
            showInlineNotification(
                `⏰ Напоминание на завтра (${count})`,
                `У вас ${count} заметка на завтра: ${noteTitles.substring(0, 100)}`,
                'tomorrow'
            );
            
            showBrowserNotification(
                'Календарь заметок',
                `У вас ${count} заметка на завтра! Подготовьтесь заранее.`,
                tomorrowStr,
                'tomorrow'
            );
        }
        
        // Проверка на через 3 дня
        if (notesData[threeDaysStr] && Object.keys(notesData[threeDaysStr]).length > 0) {
            const count = Object.keys(notesData[threeDaysStr]).length;
            const noteTitles = Object.values(notesData[threeDaysStr]).map(n => n.title).join(', ');
            
            showInlineNotification(
                `📆 Напоминание через 3 дня (${count})`,
                `У вас ${count} заметка через 3 дня: ${noteTitles.substring(0, 100)}`,
                '3days'
            );
        }
        
        // Отмечаем, что проверка на сегодня выполнена
        localStorage.setItem(processedKey, 'true');
        
        // Сбрасываем отметку в полночь
        const msUntilMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) - today;
        setTimeout(() => localStorage.removeItem(processedKey), msUntilMidnight);
    }
}

// === НОВОЕ: ЗАПРОС РАЗРЕШЕНИЯ ПРИ ЗАГРУЗКЕ ===
function initNotifications() {
    if (Notification.permission === 'default') {
        setTimeout(() => {
            requestNotificationPermission().then(granted => {
                if (granted) console.log('✅ Уведомления разрешены');
                else console.log('❌ Уведомления запрещены');
            });
        }, 2000);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
}

function getMonthName(month) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month];
}

function checkHasNote(dateStr) {
    return notesData[dateStr] && Object.keys(notesData[dateStr]).length > 0;
}

function getNotesWord(count) {
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'заметок';
    if (lastDigit === 1) return 'заметка';
    if (lastDigit >= 2 && lastDigit <= 4) return 'заметки';
    return 'заметок';
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadUserData() {
    if (!currentUserId || !window.db) return;
    
    const path = currentMode === 'personal' 
        ? `users/${currentUserId}/notes`
        : 'shared/notes';
    
    showLoading(true);
    
    window.db.ref(path).on('value', (snapshot) => {
        notesData = snapshot.val() || {};
        renderCalendar();
        if (selectedDate) {
            displayNotesForDate(selectedDate);
        }
        // Проверяем напоминания после загрузки данных
        checkAllReminders();
        showLoading(false);
    }, (error) => {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка загрузки данных', 'error');
        showLoading(false);
    });
}

// ========== РЕНДЕР КАЛЕНДАРЯ ==========
function renderCalendar() {
    if (!calendarDays) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (currentMonthYearSpan) {
        currentMonthYearSpan.textContent = `${getMonthName(month)} ${year}`;
    }
    
    const firstDayOfMonth = new Date(year, month, 1);
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    calendarDays.innerHTML = '';
    
    for (let i = startDay - 1; i > 0; i--) {
        const day = prevMonthDays - i + 1;
        calendarDays.appendChild(createDayElement(day, true));
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dateStr = formatDate(date);
        const hasNote = checkHasNote(dateStr);
        calendarDays.appendChild(createDayElement(i, false, dateStr, hasNote));
    }
    
    const remainingCells = 42 - calendarDays.children.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarDays.appendChild(createDayElement(i, true));
    }
}

function createDayElement(day, isOtherMonth, dateStr = null, hasNote = false) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    if (isOtherMonth) div.classList.add('other-month');
    if (hasNote) div.classList.add('has-note');
    if (dateStr === selectedDate) div.classList.add('selected');
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    div.appendChild(dayNumber);
    
    if (dateStr) {
        div.addEventListener('click', () => selectDate(dateStr));
    }
    
    return div;
}

// ========== ВЫБОР ДАТЫ ==========
function selectDate(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    displayNotesForDate(dateStr);
    if (selectedDateTitle) {
        selectedDateTitle.innerHTML = `📝 Заметки на ${formatDisplayDate(dateStr)}`;
    }
}

function displayNotesForDate(dateStr) {
    if (!notesList) return;
    
    if (!notesData[dateStr] || Object.keys(notesData[dateStr]).length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>Нет заметок на этот день</p>
                <small>Создайте первую заметку</small>
            </div>
        `;
        if (notesStats) notesStats.textContent = '0 заметок';
        return;
    }
    
    const notes = Object.entries(notesData[dateStr]);
    notesList.innerHTML = '';
    if (notesStats) notesStats.textContent = `${notes.length} ${getNotesWord(notes.length)}`;
    
    notes.forEach(([id, note]) => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        
        const isAuthor = currentMode === 'personal' || 
            (currentMode === 'shared' && note.authorId === currentUserId);
        
        const authorInfo = (currentMode === 'shared' && note.authorEmail) 
            ? `<div class="note-author">✍️ ${escapeHtml(note.authorEmail)}</div>`
            : '';
        
        noteDiv.innerHTML = `
            <h4>📌 ${escapeHtml(note.title)}</h4>
            <p>${escapeHtml(note.content)}</p>
            <div class="note-date">📅 ${new Date(note.createdAt).toLocaleString()}</div>
            ${authorInfo}
            ${isAuthor ? `<button class="delete-note" data-id="${id}">🗑️ Удалить</button>` : ''}
        `;
        
        if (isAuthor) {
            noteDiv.querySelector('.delete-note').addEventListener('click', () => deleteNote(dateStr, id));
        }
        
        notesList.appendChild(noteDiv);
    });
}

async function deleteNote(dateStr, noteId) {
    if (!confirm('Удалить эту заметку?')) return;
    
    const path = currentMode === 'personal'
        ? `users/${currentUserId}/notes/${dateStr}/${noteId}`
        : `shared/notes/${dateStr}/${noteId}`;
    
    showLoading(true);
    try {
        await window.db.ref(path).remove();
        showNotification('🗑️ Заметка удалена', 'success');
    } catch (error) {
        showNotification('❌ Ошибка удаления', 'error');
    } finally {
        showLoading(false);
    }
}

async function saveNote() {
    if (!selectedDate) {
        showNotification('Выберите дату в календаре', 'warning');
        return;
    }
    
    const title = noteTitle?.value.trim() || '';
    const content = noteContent?.value.trim() || '';
    
    if (!title && !content) {
        showNotification('Введите заголовок или текст заметки', 'warning');
        return;
    }
    
    if (!window.auth?.currentUser) {
        showNotification('Ошибка авторизации', 'error');
        return;
    }
    
    const note = {
        title: title || 'Без заголовка',
        content: content,
        createdAt: Date.now()
    };
    
    if (currentMode === 'shared') {
        note.authorId = currentUserId;
        note.authorEmail = window.auth.currentUser.email;
    }
    
    const path = currentMode === 'personal'
        ? `users/${currentUserId}/notes/${selectedDate}`
        : `shared/notes/${selectedDate}`;
    
    if (saveNoteBtn) {
        saveNoteBtn.disabled = true;
        saveNoteBtn.innerHTML = '⏳ Сохранение...';
    }
    
    try {
        await window.db.ref(path).push().set(note);
        if (noteTitle) noteTitle.value = '';
        if (noteContent) noteContent.value = '';
        showNotification('✅ Заметка сохранена!', 'success');
    } catch (error) {
        showNotification('❌ Ошибка сохранения', 'error');
    } finally {
        if (saveNoteBtn) {
            saveNoteBtn.disabled = false;
            saveNoteBtn.innerHTML = '💾 Сохранить заметку';
        }
    }
}

// ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ==========
function setPersonalMode() {
    currentMode = 'personal';
    if (personalModeBtn) personalModeBtn.classList.add('active');
    if (sharedModeBtn) sharedModeBtn.classList.remove('active');
    selectedDate = null;
    if (selectedDateTitle) selectedDateTitle.innerHTML = '📝 Личные заметки';
    loadUserData();
}

function setSharedMode() {
    currentMode = 'shared';
    if (sharedModeBtn) sharedModeBtn.classList.add('active');
    if (personalModeBtn) personalModeBtn.classList.remove('active');
    selectedDate = null;
    if (selectedDateTitle) selectedDateTitle.innerHTML = '📝 Общий календарь';
    loadUserData();
}

// ========== НАВИГАЦИЯ ПО МЕСЯЦАМ ==========
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// ========== ВЫХОД ==========
async function logout() {
    if (confirm('Выйти из аккаунта?')) {
        await window.auth?.signOut();
        window.location.href = 'index.html';
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initCalendar() {
    if (!window.auth || !window.db) {
        setTimeout(initCalendar, 500);
        return;
    }
    
    window.auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        if (!user.emailVerified) {
            showNotification('⚠️ Подтвердите email для полного доступа', 'warning');
        }
        
        currentUserId = user.uid;
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        loadUserData();
    });
}

function bindEvents() {
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
    if (personalModeBtn) personalModeBtn.addEventListener('click', setPersonalMode);
    if (sharedModeBtn) sharedModeBtn.addEventListener('click', setSharedMode);
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', prevMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', nextMonth);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// ========== СТИЛИ ДЛЯ УВЕДОМЛЕНИЙ (добавляются автоматически) ==========
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-success { background: #4caf50; }
        .notification-error { background: #f44336; }
        .notification-info { background: #2196f3; }
        .notification-warning { background: #ff9800; }
    `;
    document.head.appendChild(style);
}

// ========== ЗАПУСК ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        addNotificationStyles();
        bindEvents();
        initCalendar();
        initNotifications();
    });
} else {
    addNotificationStyles();
    bindEvents();
    initCalendar();
    initNotifications();
}
