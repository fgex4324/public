// في ملف auth.js

// عناصر واجهة المستخدم
const authScreen = document.getElementById('authScreen');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const authError = document.getElementById('authError');
const mainApp = document.getElementById('mainApp');
const logoutBtn = document.getElementById('logoutBtn');
const loadingScreen = document.getElementById('loadingScreen');

let currentUser = null; // لتخزين بيانات المستخدم الحالي

// دالة لتحديث واجهة المستخدم بناءً على حالة المصادقة
function updateAuthUI(user) {
    if (user) {
        currentUser = user;
        authScreen.classList.remove('active');
        mainApp.classList.add('active');
        // هنا يمكنك تحميل بيانات المستخدم والمحادثات والمنشورات
        loadUserProfile(user.uid);
        loadPosts();
        loadChats(); // تحميل الدردشات عند تسجيل الدخول
    } else {
        currentUser = null;
        authScreen.classList.add('active');
        mainApp.classList.remove('active');
    }
    loadingScreen.classList.remove('active'); // إخفاء شاشة التحميل بمجرد تحديد الحالة
}

// مراقبة حالة المصادقة
auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
});

// تسجيل الدخول
loginBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    authError.textContent = ''; // مسح رسائل الخطأ السابقة

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        authError.textContent = 'خطأ في تسجيل الدخول: ' + error.message;
        console.error("Login Error:", error);
    }
});

// إنشاء حساب
signupBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    authError.textContent = ''; // مسح رسائل الخطأ السابقة

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;
        // إنشاء ملف شخصي جديد للمستخدم في Firestore
        await createUserProfile(userId, email);
    } catch (error) {
        authError.textContent = 'خطأ في إنشاء الحساب: ' + error.message;
        console.error("Signup Error:", error);
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout Error:", error);
    }
});