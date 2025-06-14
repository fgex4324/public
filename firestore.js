import { auth, db, rtdb } from './auth.js'; // تم إزالة 'storage' من الاستيراد

// إدارة المستخدمين
function getUserProfile(userId) {
  return db.collection('users').doc(userId).get();
}

function updateUserProfile(userId, data) {
  return db.collection('users').doc(userId).update(data);
}

// جلب تفاصيل مستخدمين متعددين (مفيد للدردشات والمنشورات)
function getUsersByIds(userIds) {
  if (userIds.length === 0) return Promise.resolve([]);
  return db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', userIds).get()
    .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}

// إدارة الدردشات
function createChat(participants, isGroup = false, groupName = '') {
  const chatData = {
    participants: participants.reduce((acc, uid) => {
      acc[uid] = true;
      return acc;
    }, {}),
    isGroup: isGroup,
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessage: "" // تهيئة الرسالة الأخيرة
  };

  if (isGroup) {
    chatData.name = groupName;
    chatData.admin = auth.currentUser.uid;
  }

  return db.collection('chats').add(chatData)
    .then((docRef) => {
      const chatId = docRef.id;
      // إنشاء مرجع في Realtime DB للتحقق من القواعد (إذا لزم الأمر)
      return rtdb.ref(`chats/${chatId}/participants`).set(chatData.participants).then(() => chatId);
    });
}

function getMessages(chatId, limit = 50) {
    return db.collection(`chats/${chatId}/messages`)
             .orderBy('timestamp', 'desc')
             .limit(limit); // للوقت الفعلي، نستخدم snapshot listener في app.js
}

function sendMessage(chatId, content) { // تم إزالة 'media'
  const messageData = {
    senderId: auth.currentUser.uid,
    content: content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  // لا يوجد دعم للميديا هنا
  // if (media) {
  //   messageData.mediaType = media.type;
  //   messageData.mediaUrl = media.url;
  // }

  return db.collection(`chats/${chatId}/messages`).add(messageData)
    .then(() => {
      // تحديث آخر رسالة في الدردشة
      return db.collection('chats').doc(chatId).update({
        lastMessage: content,
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
}

// إدارة المنشورات
function createPost(content) { // تم إزالة 'imageFile'
  return getUserProfile(auth.currentUser.uid)
    .then((doc) => {
      const user = doc.data();
      const postData = {
        userId: auth.currentUser.uid,
        username: user.username,
        userProfilePic: user.profilePictureUrl, // صورة الملف الشخصي
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likesCount: 0,
        commentsCount: 0
      };

      // لا يوجد دعم لصور المنشورات
      // if (imageFile) {
      //   return uploadImage(imageFile, 'post_images')
      //     .then((url) => {
      //         postData.imageUrl = url;
      //         return db.collection('posts').add(postData);
      //     });
      // }
      return db.collection('posts').add(postData);
    })
    .then(() => {
      // زيادة عدد منشورات المستخدم
      return db.collection('users').doc(auth.currentUser.uid).update({
        postsCount: firebase.firestore.FieldValue.increment(1)
      });
    });
}

function likePost(postId) {
  const likeRef = db.collection(`posts/${postId}/likes`).doc(auth.currentUser.uid);
  return db.runTransaction(transaction => {
    return transaction.get(likeRef).then(doc => {
      const postRef = db.collection('posts').doc(postId);
      if (doc.exists) {
        transaction.delete(likeRef);
        transaction.update(postRef, { likesCount: firebase.firestore.FieldValue.increment(-1) });
      } else {
        transaction.set(likeRef, {
          userId: auth.currentUser.uid,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        transaction.update(postRef, { likesCount: firebase.firestore.FieldValue.increment(1) });
      }
    });
  });
}

// تم إزالة وظيفة رفع الصور (uploadImage)

// مؤشرات الكتابة (Realtime Database)
function setTypingIndicator(chatId, isTyping) {
  const userId = auth.currentUser.uid;
  if (!userId) return Promise.reject("No user logged in.");

  const typingRef = rtdb.ref(`typingIndicators/${chatId}/${userId}`);
  
  if (isTyping) {
    return typingRef.set(true);
  } else {
    return typingRef.remove();
  }
}

// الاستماع لمؤشرات الكتابة
function onTypingStatusChanged(chatId, callback) {
  return rtdb.ref(`typingIndicators/${chatId}`).on('value', (snapshot) => {
    const typingUsers = snapshot.val();
    callback(typingUsers);
  });
}

// إيقاف الاستماع لمؤشرات الكتابة
function offTypingStatusChanged(chatId) {
  rtdb.ref(`typingIndicators/${chatId}`).off();
}

// تصدير الدوال
export {
  getUserProfile,
  updateUserProfile,
  getUsersByIds,
  createChat,
  getMessages,
  sendMessage,
  createPost,
  likePost,
  // uploadImage, // تم إزالة هذا
  setTypingIndicator,
  onTypingStatusChanged,
  offTypingStatusChanged,
  db // تصدير db للاستخدام في app.js للاستماع للتغييرات
};