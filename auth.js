// public/auth.js

// عناصر واجهة المستخدم الرئيسية الخاصة بالمصادقة والشاشة الرئيسية
const authScreen = document.getElementById('authScreen');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn'); // زر تسجيل الدخول/إنشاء حساب
const authError = document.getElementById('authError');
const toggleAuthMode = document.getElementById('toggleAuthMode'); // رابط التبديل بين وضع الدخول/التسجيل

const mainApp = document.getElementById('mainApp');
const logoutBtn = document.getElementById('logoutBtn');
const loadingScreen = document.getElementById('loadingScreen');

// متغيرات لتخزين بيانات المستخدم الحالي وملفه الشخصي من Firestore
let currentUser = null; // كائن المستخدم من Firebase Authentication
let currentUserProfileData = null; // بيانات الملف الشخصي للمستخدم من Firestore (مثلاً: الاسم، الصورة، عدد المنشورات)

// عناوين البريد الإلكتروني للمسؤولين المحددين
// هؤلاء المستخدمون سيحصلون على صلاحيات خاصة في التطبيق.
const ADMIN_EMAILS = ["sesef42331@gmail.com", "sese42331@gmail.com"]; // استبدل هذه الإيميلات بإيميلات المسؤولين الفعليين لديك

let isLoginMode = true; // لتتبع ما إذا كنا في وضع تسجيل الدخول أو إنشاء حساب

/**
 * تحديث واجهة المستخدم بناءً على حالة مصادقة المستخدم.
 * هذه الوظيفة تُستدعى كلما تغيرت حالة المصادقة (تسجيل الدخول، تسجيل الخروج).
 * @param {firebase.User} user - كائن المستخدم الحالي من Firebase Authentication، أو null إذا لم يكن هناك مستخدم مسجل الدخول.
 */
async function updateAuthUI(user) {
    if (user) {
        // المستخدم مسجل الدخول
        currentUser = user; // تعيين المستخدم الحالي

        try {
            // محاولة جلب ملف تعريف المستخدم من Firestore
            const profileDoc = await getUserProfile(user.uid);

            if (profileDoc.exists) {
                // إذا كان ملف التعريف موجودًا، قم بتحميل بياناته
                currentUserProfileData = profileDoc.data();
            } else {
                // إذا لم يتم العثور على ملف تعريف (قد يحدث لمستخدمين جدد أو تم إنشاؤهم خارج التطبيق)،
                // قم بإنشاء ملف تعريف جديد للمستخدم.
                // يتم تمرير اسم المستخدم الافتراضي كـ جزء من البريد الإلكتروني قبل @
                await createUserProfile(user.uid, user.email, user.email.split('@')[0]);
                const newProfileDoc = await getUserProfile(user.uid); // جلب الملف الجديد
                currentUserProfileData = newProfileDoc.data();
            }

            // تحديث حالة المستخدم إلى "متصل" في Firestore
            await updateUserStatus(user.uid, true);

            // إظهار التطبيق الرئيسي وإخفاء شاشة المصادقة
            authScreen.classList.remove('active');
            mainApp.classList.add('active');

            // تحميل بيانات الواجهة الرئيسية بعد تسجيل الدخول بنجاح
            // هذه الدوال يتم تعريفها في app.js وتستخدم البيانات من firestore.js
            loadUserProfile(user.uid); // تحميل وعرض بيانات الملف الشخصي
            loadPosts();              // تحميل وعرض المنشورات
            loadChats();              // تحميل وعرض المحادثات
            loadOnlineUsers();        // تحميل وعرض المستخدمين المتصلين

            // إضافة معالج لحدث إغلاق النافذة أو علامة التبويب لتحديث حالة المستخدم إلى "غير متصل"
            window.removeEventListener('beforeunload', handleBeforeUnload); // إزالة المستمع القديم إن وجد
            window.addEventListener('beforeunload', handleBeforeUnload);

        } catch (error) {
            // في حالة حدوث خطأ أثناء تحميل ملف تعريف المستخدم أو تحديث الحالة،
            // قم بتسجيل الخروج لمنع مشاكل في الواجهة ولإجبار المستخدم على المحاولة مرة أخرى.
            console.error("Error loading user profile or updating status:", error);
            await auth.signOut(); // تسجيل الخروج
            // لا نستخدم alert() هنا لأننا في سياق تحديث UI تلقائي
        }

    } else {
        // المستخدم غير مسجل الدخول (أو قام بتسجيل الخروج)
        // إذا كان هناك مستخدم سابق قام بتسجيل الخروج، قم بتحديث حالته إلى "غير متصل"
        if (currentUser && currentUser.uid) {
            await updateUserStatus(currentUser.uid, false);
        }
        currentUser = null;
        currentUserProfileData = null; // مسح بيانات الملف الشخصي المحلية

        // إظهار شاشة المصادقة وإخفاء التطبيق الرئيسي
        authScreen.classList.add('active');
        mainApp.classList.remove('active');
    }
    // إخفاء شاشة التحميل بمجرد تحديد حالة المصادقة الأولية
    loadingScreen.classList.remove('active');
}

/**
 * دالة معالج حدث 'beforeunload' لتحديث حالة المستخدم إلى غير متصل.
 * يتم فصلها كدالة منفصلة لسهولة الإزالة والإضافة.
 */
async function handleBeforeUnload() {
    if (currentUser) {
        await updateUserStatus(currentUser.uid, false);
    }
}

// مراقبة حالة المصادقة في Firebase
// يتم استدعاء دالة updateAuthUI() كلما تغيرت حالة المصادقة
auth.onAuthStateChanged(updateAuthUI);

/**
 * معالج لعملية تسجيل الدخول/إنشاء الحساب.
 * يتم تحديد العملية بناءً على قيمة isLoginMode.
 */
authSubmitBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // منع السلوك الافتراضي للزر (إرسال النموذج)
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    authError.textContent = ''; // مسح رسائل الخطأ السابقة

    // التحقق من صحة المدخلات الأساسية
    if (!email || !password) {
        authError.textContent = 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.';
        return;
    }
    if (password.length < 6) {
        authError.textContent = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.';
        return;
    }

    authSubmitBtn.disabled = true; // تعطيل الزر لمنع النقر المتعدد
    const originalBtnText = authSubmitBtn.textContent;
    authSubmitBtn.textContent = isLoginMode ? 'جاري تسجيل الدخول...' : 'جاري إنشاء الحساب...';

    try {
        if (isLoginMode) {
            // محاولة تسجيل الدخول
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            // محاولة إنشاء حساب جديد
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            // عند إنشاء حساب جديد، قم بإنشاء ملف تعريفه في Firestore تلقائيًا
            await createUserProfile(userId, email, email.split('@')[0]);
            alert("تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.");
            // بعد إنشاء الحساب، التبديل إلى وضع تسجيل الدخول
            toggleAuthForm(true);
        }
    } catch (error) {
        // معالجة الأخطاء
        let errorMessage = 'حدث خطأ: ';
        if (error.code === 'auth/user-not-found') {
            errorMessage += 'المستخدم غير موجود.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage += 'كلمة المرور خاطئة.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'صيغة البريد الإلكتروني غير صحيحة.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'هذا البريد الإلكتروني مستخدم بالفعل.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage += 'كلمة المرور ضعيفة جدًا (يجب أن تكون 6 أحرف على الأقل).';
        } else {
            errorMessage += error.message;
        }
        authError.textContent = errorMessage;
        console.error("Authentication Error:", error);
    } finally {
        authSubmitBtn.disabled = false; // إعادة تفعيل الزر
        authSubmitBtn.textContent = originalBtnText; // استعادة النص الأصلي
    }
});

/**
 * التبديل بين وضع تسجيل الدخول ووضع إنشاء الحساب.
 * @param {boolean} [setToLogin=null] - إذا كان true، يتم التبديل لوضع تسجيل الدخول.
 * إذا كان false، يتم التبديل لوضع إنشاء الحساب.
 * إذا كان null، يتم التبديل بين الوضعين.
 */
toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthForm();
});

function toggleAuthForm(setToLogin = null) {
    if (setToLogin !== null) {
        isLoginMode = setToLogin;
    } else {
        isLoginMode = !isLoginMode;
    }

    if (isLoginMode) {
        authSubmitBtn.textContent = 'تسجيل الدخول';
        toggleAuthMode.textContent = 'ليس لديك حساب؟ قم بإنشاء حساب جديد';
    } else {
        authSubmitBtn.textContent = 'إنشاء حساب جديد';
        toggleAuthMode.textContent = 'لديك حساب بالفعل؟ تسجيل الدخول';
    }
    authError.textContent = ''; // مسح أي رسائل خطأ عند التبديل
}

// تهيئة الوضع الافتراضي عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    toggleAuthForm(true); // البدء بوضع تسجيل الدخول
});


/**
 * معالج لعملية تسجيل الخروج.
 */
logoutBtn.addEventListener('click', async () => {
    try {
        // تحديث حالة المستخدم إلى "غير متصل" في Firestore قبل تسجيل الخروج
        if (currentUser) {
            await updateUserStatus(currentUser.uid, false);
        }
        await auth.signOut(); // تسجيل الخروج من Firebase
        alert("تم تسجيل الخروج بنجاح.");
    } catch (error) {
        console.error("Logout Error:", error);
        alert("فشل تسجيل الخروج: " + error.message);
    }
});

/**
 * دالة مساعدة للتحقق مما إذا كان المستخدم الحالي مسؤولاً.
 * @returns {boolean} - True إذا كان المستخدم مسؤولاً، False بخلاف ذلك.
 */
function isAdminUser() {
    return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}