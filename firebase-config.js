// public/firebase-config.js

// إعدادات Firebase الأساسية لمشروعك
// هذه الإعدادات ضرورية لتهيئة اتصال تطبيقك بـ Firebase.
// تم استخدام الروابط التي زودتني بها لضمان دقة الاتصال.
const initialFirebaseConfig = {
    apiKey: "AIzaSyAguAvkgdnbtkIsdBjR0Av0ikUOCbqc8lI",
    authDomain: "chat-ttt-2023e.firebaseapp.com",
    databaseURL: "https://chat-ttt-2023e-default-rtdb.firebaseio.com",
    projectId: "chat-ttt-2023e",
    storageBucket: "chat-ttt-2023e.firebasestorage.app", // تم تحديث هذا بناءً على طلبك الأخير
    messagingSenderId: "89047633906",
    appId: "1:89047633906:web:1358af9c956746a120e56b"
};

// متغير قابل للتعديل سيحتوي على إعدادات Firebase النشطة
let firebaseConfig = { ...initialFirebaseConfig };

// محاولة تحميل إعدادات Firebase من التخزين المحلي (Local Storage)
// هذا يسمح للمسؤولين بتعديل الإعدادات من واجهة المستخدم وحفظها.
try {
    const storedConfig = localStorage.getItem('firebaseAppConfig');
    if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        // التحقق من أن الإعدادات المخزنة صالحة وتحتوي على مفتاح API على الأقل
        if (parsedConfig && typeof parsedConfig === 'object' && parsedConfig.apiKey) {
            firebaseConfig = parsedConfig;
        }
    }
} catch (e) {
    // في حالة حدوث خطأ أثناء قراءة التخزين المحلي، سيتم استخدام الإعدادات الافتراضية
    console.error("Error loading Firebase config from Local Storage:", e);
}

// تعريف متغيرات عامة لخدمات Firebase ليتم الوصول إليها من الملفات الأخرى
let app;
let auth;
let db;

/**
 * تهيئة تطبيق Firebase.
 * تضمن هذه الدالة أن Firebase يتم تهيئته مرة واحدة فقط،
 * وتقوم بتعيين متغيرات auth و db للوصول السهل.
 */
function initializeFirebaseApp() {
    // إذا لم يكن هناك أي تطبيق Firebase مهيأ بالفعل، قم بتهيئته
    if (firebase.apps.length === 0) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        // إذا كان هناك تطبيق مهيأ بالفعل، استخدمه بدلاً من التهيئة مرة أخرى
        app = firebase.app();
    }
    
    // الحصول على مثيلات خدمات المصادقة و Firestore
    auth = firebase.auth(app); // استخدام app لضمان الارتباط بالتطبيق الصحيح
    db = firebase.firestore(app); // استخدام app لضمان الارتباط بالتطبيق الصحيح

    // تمكين استمرارية Firestore في وضع عدم الاتصال (Offline Persistence)
    // هذا يساعد على عمل التطبيق حتى بدون اتصال بالإنترنت (للقراءات المخزنة مؤقتًا).
    db.enablePersistence()
      .catch((err) => {
          // يتم تسجيل تحذير إذا لم يتمكن من تمكين الاستمرارية
          // (على سبيل المثال، بسبب وجود علامات تبويب متعددة مفتوحة)
          console.warn('Firestore persistence not enabled: ', err);
      });
}

// استدعاء دالة التهيئة عند تحميل السكريبت
initializeFirebaseApp();

/**
 * تحديث إعدادات Firebase وحفظها في التخزين المحلي.
 * @param {object} newConfig - كائن يحتوي على إعدادات Firebase الجديدة.
 * @returns {boolean} - True إذا تم الحفظ بنجاح، False بخلاف ذلك.
 */
function updateFirebaseConfig(newConfig) {
    // قائمة بالمفاتيح المطلوبة التي يجب أن تكون موجودة وغير فارغة
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId']; // تم حذف storageBucket و messagingSenderId لأنها ليست مطلوبة للحد الأدنى من التهيئة

    // التحقق من وجود المفاتيح المطلوبة وعدم فراغها
    for (const key of requiredKeys) {
        if (!newConfig[key] || newConfig[key].trim() === '') {
            console.error(`Missing or empty required Firebase config key: ${key}`);
            return false;
        }
    }

    // تحديث إعدادات Firebase النشطة
    firebaseConfig = { ...newConfig };
    // حفظ الإعدادات الجديدة في التخزين المحلي
    localStorage.setItem('firebaseAppConfig', JSON.stringify(firebaseConfig));
    console.warn("Firebase config updated. Please refresh the page for changes to take effect.");
    return true;
}