// في ملف firestore.js
// يجب أن يكون auth و db معرفين من firebase-config.js

const defaultAvatarUrl = "https://via.placeholder.com/150/CCCCCC/FFFFFF?text=AV"; // رابط صورة الأفاتار الافتراضية

// دالة لإنشاء ملف شخصي للمستخدم عند التسجيل
async function createUserProfile(userId, email) {
    try {
        await db.collection('users').doc(userId).set({
            email: email,
            username: email.split('@')[0], // اسم المستخدم الافتراضي هو جزء من البريد الإلكتروني قبل الـ @
            profilePictureUrl: defaultAvatarUrl, // صورة افتراضية للملف الشخصي
            postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("User profile created for:", email);
    } catch (error) {
        console.error("Error creating user profile:", error);
    }
}

// دالة للحصول على بيانات ملف المستخدم
function getUserProfile(userId) {
    return db.collection('users').doc(userId).get();
}

// دالة لتحديث اسم المستخدم
async function updateUsername(userId, newUsername) {
    try {
        await db.collection('users').doc(userId).update({
            username: newUsername
        });
        console.log("Username updated successfully.");
        return true;
    } catch (error) {
        console.error("Error updating username:", error);
        return false;
    }
}

// دالة لتحديث صورة الملف الشخصي (هذه الدالة تفترض أنك قد رفعت الصورة إلى Cloudinary أو ما شابه وحصلت على الـ URL)
async function updateProfilePicture(userId, imageUrl) {
    try {
        await db.collection('users').doc(userId).update({
            profilePictureUrl: imageUrl
        });
        console.log("Profile picture updated successfully.");
        return true;
    } catch (error) {
        console.error("Error updating profile picture:", error);
        return false;
    }
}

// دالة لنشر منشور جديد
function createPost(content) {
  return getUserProfile(auth.currentUser.uid)
    .then((doc) => {
      const user = doc.data();

      const postData = {
        userId: auth.currentUser.uid,
        username: user.username || auth.currentUser.email.split('@')[0], // اسم مستخدم احتياطي
        userProfilePic: user.profilePictureUrl || defaultAvatarUrl, // الصورة الافتراضية هنا
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likesCount: 0,
        commentsCount: 0
      };

      return db.collection('posts').add(postData);
    })
    .then(() => {
      // زيادة عدد منشورات المستخدم
      return db.collection('users').doc(auth.currentUser.uid).update({
        postsCount: firebase.firestore.FieldValue.increment(1)
      });
    })
    .catch((error) => {
      console.error("Error creating post:", error);
      alert("خطأ في نشر المنشور: " + error.message);
    });
}


// دالة للحصول على المنشورات
function getPosts(callback) {
    db.collection('posts')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(posts);
      }, (error) => {
        console.error("Error fetching posts:", error);
      });
}

// دالة لإضافة/إزالة إعجاب من منشور
async function toggleLike(postId, userId) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return;

    const postData = postDoc.data();
    let currentLikes = postData.likes || {};

    if (currentLikes[userId]) {
        // إزالة الإعجاب
        delete currentLikes[userId];
        await postRef.update({
            likes: currentLikes,
            likesCount: firebase.firestore.FieldValue.increment(-1)
        });
    } else {
        // إضافة الإعجاب
        currentLikes[userId] = true;
        await postRef.update({
            likes: currentLikes,
            likesCount: firebase.firestore.FieldValue.increment(1)
        });
    }
}

// دالة للبحث عن المستخدمين
async function searchUsers(searchTerm) {
    const users = [];
    // البحث يبدأ بـ 'searchTerm' وينتهي بـ 'searchTerm' + '\uf8ff' (علامة يونيكود نهاية نطاق الأحرف)
    const snapshot = await db.collection('users')
                              .where('username', '>=', searchTerm)
                              .where('username', '<=', searchTerm + '\uf8ff')
                              .limit(10) // حد أقصى 10 نتائج
                              .get();

    snapshot.forEach(doc => {
        const userData = doc.data();
        // لا تظهر المستخدم الحالي في نتائج البحث
        if (userData.email !== auth.currentUser.email) {
            users.push({ id: doc.id, ...userData });
        }
    });
    return users;
}

// دالة لإنشاء محادثة جديدة بين مستخدمين
async function createChat(participants) { // participants يجب أن تكون مصفوفة من الـ UIDs
    // التحقق مما إذا كانت الدردشة موجودة بالفعل بين نفس المشاركين
    // هذه العملية أكثر تعقيداً مع حقل participants كـ Map
    // لكن لغرض التبسيط، سننشئ دردشة جديدة أو نجد الموجودة بناءً على ID محدد

    // إنشاء معرف فريد للدردشة بناءً على معرفات المشاركين لضمان عدم التكرار
    const sortedParticipants = participants.sort();
    const chatId = sortedParticipants.join('_'); // مثال: "uid1_uid2"

    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (chatDoc.exists) {
        return chatId; // الدردشة موجودة بالفعل
    } else {
        const chatData = {
            participants: {}, // سيتم ملء هذا كـ Map
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: 'ابدأ محادثتكما الأولى!',
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            isGroup: false // هذه دردشة فردية
        };
        // ملء حقل participants كـ Map
        participants.forEach(uid => {
            chatData.participants[uid] = true;
        });

        await chatRef.set(chatData);
        return chatId;
    }
}

// دالة للحصول على رسائل محادثة معينة
function getMessages(chatId, callback) {
    db.collection('chats').doc(chatId).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
      }, (error) => {
        console.error("Error fetching messages:", error);
      });
}

// دالة لإرسال رسالة
async function sendMessage(chatId, senderId, senderUsername, messageContent) {
    try {
        const messageData = {
            senderId: senderId,
            senderUsername: senderUsername,
            content: messageContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('chats').doc(chatId).collection('messages').add(messageData);

        // تحديث آخر رسالة وتاريخها في مستند الدردشة الأم
        await db.collection('chats').doc(chatId).update({
            lastMessage: messageContent,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
}