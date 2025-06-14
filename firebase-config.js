// في ملف firebase-config.js
// تم استبدال القيم هنا بمعلومات مشروعك من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAguAvkgdnbtkIsdBjR0Av0ikUOCbqc8lI",
  authDomain: "chat-ttt-2023e.firebaseapp.com",
  databaseURL: "https://chat-ttt-2023e-default-rtdb.firebaseio.com",
  projectId: "chat-ttt-2023e",
  storageBucket: "chat-ttt-2023e.firebasestorage.app",
  messagingSenderId: "89047633906",
  appId: "1:89047633906:web:1358af9c956746a120e56b"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على مراجع للخدمات
const auth = firebase.auth();
const db = firebase.firestore();

// تمكين Persistence للحفاظ على تسجيل الدخول
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistence not enabled due to multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });