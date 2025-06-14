// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAguAvkgdnbtkIsdBjR0Av0ikUOCbqc8lI",
  authDomain: "chat-ttt-2023e.firebaseapp.com",
  databaseURL: "https://chat-ttt-2023e-default-rtdb.firebaseio.com",
  projectId: "chat-ttt-2023e",
  // storageBucket: "chat-ttt-2023e.appspot.com", // تم إزالة هذا السطر
  messagingSenderId: "89047633906",
  appId: "1:89047633906:web:1358af9c956746a120e56b"
};

firebase.initializeApp(firebaseConfig);

// تصدير خدمات Firebase المهيأة مباشرةً
export const auth = firebase.auth();
export const db = firebase.firestore();
export const rtdb = firebase.database();
// export const storage = firebase.storage(); // تم إزالة هذا السطر

// تسجيل الدخول بالبريد الإلكتروني
function loginWithEmail(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// إنشاء حساب جديد
function signUpWithEmail(email, password, username) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // إنشاء مستند المستخدم في Firestore
      return createUserProfile(userCredential.user.uid, {
        email: email,
        username: username
      });
    });
}

// تسجيل الدخول بـ Google
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider)
    .then((userCredential) => {
      // التحقق من وجود ملف المستخدم بعد تسجيل الدخول بـ Google
      return checkUserProfile(userCredential.user.uid, userCredential.user.displayName, userCredential.user.photoURL);
    });
}

// إنشاء ملف المستخدم
function createUserProfile(userId, userData) {
  // استخدام صورة افتراضية عامة من placeholder.com
  const defaultAvatarUrl = "https://via.placeholder.com/150/CCCCCC/FFFFFF?text=AV"; 
  
  return db.collection('users').doc(userId).set({
    userId: userId,
    email: userData.email,
    username: userData.username || userData.email.split('@')[0],
    profilePictureUrl: userData.profilePictureUrl || defaultAvatarUrl, // لا يمكن رفع صورة، ستكون دائماً افتراضية أو من Google
    bio: "",
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// التحقق من ملف المستخدم (يتم استدعاؤها بعد تسجيل الدخول، خاصة لـ Google)
function checkUserProfile(userId, username, photoURL) {
  return db.collection('users').doc(userId).get()
    .then((doc) => {
      if (!doc.exists) {
        // إنشاء ملف إذا لم يكن موجودًا
        return createUserProfile(userId, {
          email: auth.currentUser.email,
          username: username || auth.currentUser.email.split('@')[0],
          profilePictureUrl: photoURL || null // استخدم صورة Google إذا كانت موجودة، وإلا فالافتراضية
        });
      }
      return doc;
    });
}

// تسجيل الخروج
function logout() {
  return auth.signOut();
}

// الاستماع لتغير حالة المصادقة
function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(callback);
}

// تصدير الدوال للاستخدام في ملفات أخرى
export {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  logout,
  onAuthStateChanged,
};