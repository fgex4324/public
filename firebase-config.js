// في ملف firebase-config.js
// سيتم استخدام هذه الإعدادات الأولية، ولكن يمكن تحديثها لاحقًا من واجهة المستخدم (للمسؤولين فقط)
const initialFirebaseConfig = {
  apiKey: "AIzaSyAguAvkgdnbtkIsdBjR0Av0ikUOCbqc8lI", // هذا مفتاح وهمي، استبدله بمفتاحك الحقيقي
  authDomain: "chat-ttt-2023e.firebaseapp.com",
  databaseURL: "https://chat-ttt-2023e-default-rtdb.firebaseio.com",
  projectId: "chat-ttt-2023e",
  storageBucket: "chat-ttt-2023e.firebasestorage.app",
  messagingSenderId: "89047633906",
  appId: "1:89047633906:web:1358af9c956746a120e56b"
};

let firebaseConfig = { ...initialFirebaseConfig }; // نسخة قابلة للتعديل

// حاول تحميل الإعدادات من Local Storage إذا كانت موجودة (مخزنة بواسطة المسؤول)
try {
    const storedConfig = localStorage.getItem('firebaseAppConfig');
    if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        // تحقق من أن الكائن المحمل هو كائن صحيح ويحتوي على الخصائص الأساسية
        if (parsedConfig && typeof parsedConfig === 'object' && parsedConfig.apiKey) {
            firebaseConfig = parsedConfig;
            console.log("Firebase config loaded from Local Storage.");
        } else {
            console.warn("Stored Firebase config is invalid, using initial config.");
        }
    }
} catch (e) {
    console.error("Error loading Firebase config from Local Storage:", e);
}


// تهيئة Firebase
let app;
let auth;
let db;

function initializeFirebaseApp() {
    // تحقق مما إذا كانت هناك تطبيقات مهيأة مسبقًا لتجنب الأخطاء
    if (firebase.apps.length === 0) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        // إذا كان هناك تطبيق بالفعل، استخدمه (هذا يحدث عند تحديث الإعدادات)
        app = firebase.app();
        // إعادة تهيئة الخدمات بعد تحديث التطبيق
        auth = firebase.auth(app);
        db = firebase.firestore(app);
        console.log("Firebase app already initialized, reusing existing app.");
        return; // لا حاجة لإعادة تهيئة الخدمات إذا كانت موجودة
    }
    
    // الحصول على مراجع للخدمات
    auth = firebase.auth();
    db = firebase.firestore();

    // تمكين Persistence للحفاظ على تسجيل الدخول
    db.enablePersistence()
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Persistence not enabled due to multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });

    console.log("Firebase app initialized with current config.");
}

// استدعاء التهيئة الأولية عند تحميل السكريبت
initializeFirebaseApp();


// دالة لتحديث إعدادات Firebase ديناميكيًا
function updateFirebaseConfig(newConfig) {
    // التأكد من أن جميع القيم المطلوبة موجودة
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    for (const key of requiredKeys) {
        if (!newConfig[key] || newConfig[key].trim() === '') {
            console.error(`Missing or empty required Firebase config key: ${key}`);
            return false; // فشل التحديث
        }
    }

    firebaseConfig = { ...newConfig }; // تحديث الكائن العام
    localStorage.setItem('firebaseAppConfig', JSON.stringify(firebaseConfig)); // حفظ في Local Storage

    // يجب إعادة تهيئة تطبيق Firebase بالكامل بعد تغيير الإعدادات
    // هذا يتطلب عادةً إعادة تحميل الصفحة أو إعادة تشغيل التطبيق بالكامل
    // Firebase لا يدعم إعادة تهيئة تطبيق موجود بإعدادات جديدة مباشرة
    console.warn("Firebase config updated. For changes to take full effect, please refresh the page.");
    // هنا يمكنك إضافة منطق لتوجيه المستخدم لإعادة تحميل الصفحة
    // مثال: alert("تم تحديث إعدادات Firebase. سيتم إعادة تحميل الصفحة الآن.");
    // window.location.reload();
    return true;
}

// يمكن الوصول إلى auth و db من هذا الملف، ومن الملفات الأخرى بعد استدعاء initializeFirebaseApp
// وتأكد أن هذه المتغيرات (auth, db) عامة (global) أو يتم تمريرها للدوال