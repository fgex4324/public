// في ملف auth.js
// يجب أن تكون auth و db و createUserProfile و updateUserStatus و defaultAvatarUrl معرفين من الملفات الأخرى

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

let currentUser = null; // لتخزين بيانات المستخدم الحالي (Firebase User Object)
let currentUserProfileData = null; // لتخزين بيانات الملف الشخصي من Firestore

// عناوين البريد الإلكتروني للمسؤولين الذين يمكنهم تعديل إعدادات Firebase
const ADMIN_EMAILS = ["sesef42331@gmail.com", "sese42331@gmail.com"];

// دالة لتحديث واجهة المستخدم بناءً على حالة المصادقة
async function updateAuthUI(user) {
    if (user) {
        currentUser = user;
        // قم بتحميل بيانات الملف الشخصي من Firestore
        try {
            const profileDoc = await getUserProfile(user.uid);
            if (profileDoc.exists) {
                currentUserProfileData = profileDoc.data();
            } else {
                console.warn("User profile not found in Firestore for", user.uid);
                // إذا لم يتم العثور على ملف شخصي، قم بإنشائه (قد يحدث إذا تم إنشاء المستخدم خارج التطبيق)
                await createUserProfile(user.uid, user.email);
                const newProfileDoc = await getUserProfile(user.uid);
                currentUserProfileData = newProfileDoc.data();
            }

            // تحديث حالة المستخدم إلى "متصل"
            await updateUserStatus(user.uid, true);

            authScreen.classList.remove('active');
            mainApp.classList.add('active');
            // هنا يمكنك تحميل بيانات المستخدم والمحادثات والمنشورات بعد التأكد من وجود ملف شخصي
            loadUserProfile(user.uid); // من app.js
            loadPosts(); // من app.js
            loadChats(); // من app.js

            // إضافة معالج لحدث إغلاق النافذة أو علامة التبويب لتحديث الحالة إلى "غير متصل"
            window.addEventListener('beforeunload', async () => {
                if (currentUser) {
                    await updateUserStatus(currentUser.uid, false);
                }
            });

        } catch (error) {
            console.error("Error loading user profile or updating status:", error);
            // إذا حدث خطأ كبير، قم بتسجيل الخروج لمنع مشاكل في الواجهة
            await auth.signOut();
            alert("حدث خطأ أثناء تحميل ملفك الشخصي. الرجاء المحاولة مرة أخرى.");
        }

    } else {
        // إذا كان هناك مستخدم سابق قام بتسجيل الخروج، قم بتحديث حالته إلى "غير متصل"
        if (currentUser && currentUser.uid) {
            await updateUserStatus(currentUser.uid, false);
        }
        currentUser = null;
        currentUserProfileData = null; // مسح بيانات الملف الشخصي
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

    if (!email || !password) {
        authError.textContent = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        let errorMessage = 'خطأ في تسجيل الدخول. ';
        if (error.code === 'auth/user-not-found') {
            errorMessage += 'المستخدم غير موجود.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage += 'كلمة المرور خاطئة.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'صيغة البريد الإلكتروني غير صحيحة.';
        } else {
            errorMessage += error.message;
        }
        authError.textContent = errorMessage;
        console.error("Login Error:", error);
    }
});

// إنشاء حساب
signupBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    authError.textContent = ''; // مسح رسائل الخطأ السابقة

    if (!email || !password) {
        authError.textContent = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.';
        return;
    }
    if (password.length < 6) {
        authError.textContent = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.';
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;
        // إنشاء ملف شخصي جديد للمستخدم في Firestore
        await createUserProfile(userId, email);
        alert("تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.");
    } catch (error) {
        let errorMessage = 'خطأ في إنشاء الحساب. ';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'هذا البريد الإلكتروني مستخدم بالفعل.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage += 'كلمة المرور ضعيفة جدًا.';
        } else {
            errorMessage += error.message;
        }
        authError.textContent = errorMessage;
        console.error("Signup Error:", error);
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    try {
        // تحديث حالة المستخدم إلى "غير متصل" قبل تسجيل الخروج
        if (currentUser) {
            await updateUserStatus(currentUser.uid, false);
        }
        await auth.signOut();
        alert("تم تسجيل الخروج بنجاح.");
    } catch (error) {
        console.error("Logout Error:", error);
        alert("فشل تسجيل الخروج: " + error.message);
    }
});

// دالة للتحقق مما إذا كان المستخدم الحالي مسؤولاً
function isAdminUser() {
    return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}