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

function showLoading(show) {
    if (loadingOverlay) loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
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

// Загрузка данных
function loadUserData() {
    if (!currentUserId || !window.db) return;
    const path = currentMode === 'personal' ? `users/${currentUserId}/notes` : 'shared/notes';
    showLoading(true);
    window.db.ref(path).on('value', (snapshot) => {
        notesData = snapshot.val() || {};
        renderCalendar();
        if (selectedDate) displayNotesForDate(selectedDate);
        showLoading(false);
    }, () => showNotification('Ошибка загрузки данных', 'error'));
}

// Рендер календаря
function renderCalendar() {
    if (!calendarDays) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (currentMonthYearSpan) currentMonthYearSpan.textContent = `${getMonthName(month)} ${year}`;
    
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
    if (dateStr) div.addEventListener('click', () => selectDate(dateStr));
    return div;
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    displayNotesForDate(dateStr);
    if (selectedDateTitle) selectedDateTitle.innerHTML = `📝 Заметки на ${formatDisplayDate(dateStr)}`;
}

function displayNotesForDate(dateStr) {
    if (!notesList) return;
    if (!notesData[dateStr] || Object.keys(notesData[dateStr]).length === 0) {
        notesList.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Нет заметок на этот день</p></div>';
        return;
    }
    
    const notes = Object.entries(notesData[dateStr]);
    notesList.innerHTML = '';
    notes.forEach(([id, note]) => {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        const isAuthor = currentMode === 'personal' || (currentMode === 'shared' && note.authorId === currentUserId);
        noteDiv.innerHTML = `
            <h4>📌 ${escapeHtml(note.title)}</h4>
            <p>${escapeHtml(note.content)}</p>
            <div class="note-date">📅 ${new Date(note.createdAt).toLocaleString()}</div>
            ${currentMode === 'shared' && note.authorEmail ? `<div class="note-author">✍️ ${escapeHtml(note.authorEmail)}</div>` : ''}
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
    const path = currentMode === 'personal' ? `users/${currentUserId}/notes/${dateStr}/${noteId}` : `shared/notes/${dateStr}/${noteId}`;
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
    if (!selectedDate) { showNotification('Выберите дату в календаре', 'warning'); return; }
    const title = noteTitle?.value.trim() || '';
    const content = noteContent?.value.trim() || '';
    if (!title && !content) { showNotification('Введите заголовок или текст заметки', 'warning'); return; }
    if (!window.auth?.currentUser) { showNotification('Ошибка авторизации', 'error'); return; }
    
    const note = { title: title || 'Без заголовка', content: content, createdAt: Date.now() };
    if (currentMode === 'shared') {
        note.authorId = currentUserId;
        note.authorEmail = window.auth.currentUser.email;
    }
    const path = currentMode === 'personal' ? `users/${currentUserId}/notes/${selectedDate}` : `shared/notes/${selectedDate}`;
    
    if (saveNoteBtn) { saveNoteBtn.disabled = true; saveNoteBtn.innerHTML = '⏳ Сохранение...'; }
    try {
        await window.db.ref(path).push().set(note);
        if (noteTitle) noteTitle.value = '';
        if (noteContent) noteContent.value = '';
        showNotification('✅ Заметка сохранена!', 'success');
    } catch (error) {
        showNotification('❌ Ошибка сохранения', 'error');
    } finally {
        if (saveNoteBtn) { saveNoteBtn.disabled = false; saveNoteBtn.innerHTML = '💾 Сохранить заметку'; }
    }
}

function setPersonalMode() {
    currentMode = 'personal';
    personalModeBtn?.classList.add('active');
    sharedModeBtn?.classList.remove('active');
    selectedDate = null;
    if (selectedDateTitle) selectedDateTitle.innerHTML = '📝 Личные заметки';
    loadUserData();
}

function setSharedMode() {
    currentMode = 'shared';
    sharedModeBtn?.classList.add('active');
    personalModeBtn?.classList.remove('active');
    selectedDate = null;
    if (selectedDateTitle) selectedDateTitle.innerHTML = '📝 Общий календарь';
    loadUserData();
}

function prevMonth() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); }
function nextMonth() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); }

async function logout() {
    if (confirm('Выйти из аккаунта?')) {
        await window.auth?.signOut();
        window.location.href = 'index.html';
    }
}

function bindEvents() {
    saveNoteBtn?.addEventListener('click', saveNote);
    personalModeBtn?.addEventListener('click', setPersonalMode);
    sharedModeBtn?.addEventListener('click', setSharedMode);
    prevMonthBtn?.addEventListener('click', prevMonth);
    nextMonthBtn?.addEventListener('click', nextMonth);
    logoutBtn?.addEventListener('click', logout);
}

function initCalendar() {
    if (!window.auth || !window.db) { setTimeout(initCalendar, 500); return; }
    window.auth.onAuthStateChanged((user) => {
        if (!user) { window.location.href = 'index.html'; return; }
        if (!user.emailVerified) showNotification('⚠️ Подтвердите email', 'warning');
        currentUserId = user.uid;
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        loadUserData();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindEvents(); initCalendar(); });
} else {
    bindEvents();
    initCalendar();
}