// ========== ИНИЦИАЛИЗАЦИЯ FIREBASE ==========
(function initFirebase() {
    if (!window.FIREBASE_CONFIG) {
        console.error('❌ Firebase config not found! Check config.js');
        document.body.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;background:#f44336;color:white;padding:20px;text-align:center;"><h3>⚠️ Ошибка конфигурации</h3><p>Откройте <strong>config.js</strong> и вставьте свои Firebase ключи.</p></div>';
        return;
    }
    
    try {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        window.auth = firebase.auth();
        window.db = firebase.database();
        console.log('✅ Firebase initialized');
        window.dispatchEvent(new CustomEvent('firebase-ready'));
    } catch (error) {
        console.error('❌ Firebase init error:', error);
    }
})();