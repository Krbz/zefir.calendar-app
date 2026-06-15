// ========== DOM ЭЛЕМЕНТЫ ==========
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const tabBtns = document.querySelectorAll('.tab-btn');

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function getErrorMessage(code) {
    const messages = {
        'auth/invalid-email': '❌ Неверный формат email',
        'auth/user-disabled': '❌ Аккаунт отключен',
        'auth/user-not-found': '❌ Пользователь не найден',
        'auth/wrong-password': '❌ Неверный пароль',
        'auth/email-already-in-use': '❌ Email уже используется',
        'auth/weak-password': '❌ Пароль должен быть не менее 6 символов',
        'auth/too-many-requests': '❌ Слишком много попыток. Попробуйте позже',
        'auth/network-request-failed': '❌ Ошибка сети. Проверьте подключение'
    };
    return messages[code] || `❌ Ошибка: ${code}`;
}

// Переключение вкладок
if (tabBtns && tabBtns.length > 0) {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const activeForm = document.getElementById(`${tabName}Form`);
            if (activeForm) activeForm.classList.add('active');
            if (loginError) loginError.textContent = '';
            if (registerError) registerError.textContent = '';
        });
    });
}

// Регистрация
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (registerError) registerError.textContent = '';
        if (!email || !password) {
            if (registerError) registerError.textContent = '❌ Заполните все поля';
            return;
        }
        if (password !== confirmPassword) {
            if (registerError) registerError.textContent = '❌ Пароли не совпадают';
            return;
        }
        if (password.length < 6) {
            if (registerError) registerError.textContent = '❌ Пароль должен быть не менее 6 символов';
            return;
        }
        
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML || 'Зарегистрироваться';
        if (submitBtn) { submitBtn.innerHTML = '⏳ Регистрация...'; submitBtn.disabled = true; }
        
        try {
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            showNotification('✅ Регистрация успешна! Проверьте почту.', 'success');
            await window.auth.signOut();
            registerForm.reset();
            document.querySelector('[data-tab="login"]')?.click();
        } catch (error) {
            if (registerError) registerError.textContent = getErrorMessage(error.code);
        } finally {
            if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
        }
    });
}

// Вход
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        
        if (loginError) loginError.textContent = '';
        if (!email || !password) {
            if (loginError) loginError.textContent = '❌ Заполните все поля';
            return;
        }
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML || 'Войти';
        if (submitBtn) { submitBtn.innerHTML = '⏳ Вход...'; submitBtn.disabled = true; }
        
        try {
            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            if (!user.emailVerified) {
                await window.auth.signOut();
                if (loginError) {
                    loginError.innerHTML = '❌ Подтвердите email перед входом. Проверьте почту!';
                    const resendBtn = document.createElement('button');
                    resendBtn.textContent = '📧 Отправить повторно';
                    resendBtn.style.cssText = 'margin-top: 10px; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;';
                    resendBtn.onclick = async () => {
                        await user.sendEmailVerification();
                        if (loginError) loginError.innerHTML = '✅ Письмо отправлено! Проверьте почту.';
                        resendBtn.remove();
                    };
                    loginError.appendChild(resendBtn);
                }
                return;
            }
            window.location.href = 'calendar.html';
        } catch (error) {
            if (loginError) loginError.textContent = getErrorMessage(error.code);
        } finally {
            if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
        }
    });
}

// Проверка авторизации
if (window.auth) {
    window.auth.onAuthStateChanged((user) => {
        if (user && window.location.pathname.includes('index.html') && user.emailVerified) {
            window.location.href = 'calendar.html';
        }
    });
}