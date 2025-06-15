// في ملف firestore.js
// يجب أن يكون auth و db معرفين من firebase-config.js
// تأكد من أن هذه المتغيرات (auth, db) متاحة عالميًا أو يتم تمريرها.

const defaultAvatarUrl = "https://via.placeholder.com/150/CCCCCC/FFFFFF?text=AV"; // رابط صورة الأفاتار الافتراضية
const PUBLIC_CHAT_ID = "public_general_chat"; // معرف ثابت للدردشة العامة
const NEWS_CHANNEL_ID = "news_updates_channel"; // معرف ثابت لقناة الأخبار (للقراءة فقط)


// دالة لإنشاء ملف شخصي للمستخدم عند التسجيل
async function createUserProfile(userId, email) {
    try {
        await db.collection('users').doc(userId).set({
            email: email,
            username: email.split('@')[0], // اسم المستخدم الافتراضي هو جزء من البريد الإلكتروني قبل الـ @
            profilePictureUrl: defaultAvatarUrl, // صورة افتراضية للملف الشخصي
            postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(), // لتتبع آخر ظهور
            isOnline: false // مؤشر للحالة على الإنترنت
        });
        console.log("User profile created for:", email);

        // إضافة المستخدم إلى الدردشة العامة وقناة الأخبار عند الإنشاء
        await addParticipantToChat(PUBLIC_CHAT_ID, userId);
        await addParticipantToChat(NEWS_CHANNEL_ID, userId);

    } catch (error) {
        console.error("Error creating user profile:", error);
        throw new Error("فشل إنشاء ملف المستخدم: " + error.message);
    }
}

// دالة لتحديث حالة المستخدم (متصل/غير متصل) وآخر ظهور
async function updateUserStatus(userId, isOnline) {
    try {
        await db.collection('users').doc(userId).update({
            isOnline: isOnline,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating user status:", error);
    }
}

// دالة للحصول على بيانات ملف المستخدم
function getUserProfile(userId) {
    return db.collection('users').doc(userId).get();
}

// دالة للحصول على معلومات المستخدمين المتعددين (لجلب معلومات المشاركين في الدردشة)
async function getUsersProfiles(userIds) {
    const userProfiles = {};
    if (userIds.length === 0) return userProfiles;

    // تقسيم الـ UIDs إلى دفعات إذا كانت أكثر من 10 (حد Firestore لـ in)
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
        const snapshot = await db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapshot.forEach(doc => {
            userProfiles[doc.id] = doc.data();
        });
    }
    return userProfiles;
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
      if (!doc.exists) {
        throw new Error("User profile not found.");
      }
      const user = doc.data();

      const postData = {
        userId: auth.currentUser.uid,
        username: user.username || auth.currentUser.email.split('@')[0], // اسم مستخدم احتياطي
        userProfilePic: user.profilePictureUrl || defaultAvatarUrl, // الصورة الافتراضية هنا
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likesCount: 0,
        likedBy: {}, // لتخزين من أعجب بالمنشور
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
      throw new Error("خطأ في نشر المنشور: " + error.message); // إعادة رمي الخطأ للتعامل معه في الواجهة
    });
}


// دالة للحصول على المنشورات
function getPosts(callback) {
    // onSnapshot توفر تحديثات في الوقت الفعلي
    return db.collection('posts')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(posts);
      }, (error) => {
        console.error("Error fetching posts:", error);
        callback([]); // إرجاع مصفوفة فارغة في حالة الخطأ
      });
}

// دالة لإضافة/إزالة إعجاب من منشور
async function toggleLike(postId, userId) {
    const postRef = db.collection('posts').doc(postId);
    try {
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) {
                throw new Error("Post does not exist!");
            }

            const postData = postDoc.data();
            let currentLikes = postData.likedBy || {}; // استخدام likedBy لتتبع المعجبين

            if (currentLikes[userId]) {
                // إزالة الإعجاب
                delete currentLikes[userId];
                transaction.update(postRef, {
                    likedBy: currentLikes,
                    likesCount: firebase.firestore.FieldValue.increment(-1)
                });
            } else {
                // إضافة الإعجاب
                currentLikes[userId] = true;
                transaction.update(postRef, {
                    likedBy: currentLikes,
                    likesCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        });
        console.log("Like toggled successfully.");
    } catch (error) {
        console.error("Error toggling like:", error);
        throw new Error("فشل الإعجاب بالمنشور: " + error.message);
    }
}

// دالة للبحث عن المستخدمين (بالاسم أو البريد الإلكتروني)
async function searchUsers(searchTerm) {
    const users = [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // البحث عن طريق username (يبدأ بـ)
    const usernameSnapshot = await db.collection('users')
                              .where('username', '>=', lowerCaseSearchTerm)
                              .where('username', '<=', lowerCaseSearchTerm + '\uf8ff')
                              .limit(5)
                              .get();
    usernameSnapshot.forEach(doc => {
        const userData = doc.data();
        if (auth.currentUser && userData.email !== auth.currentUser.email) { // لا تظهر المستخدم الحالي
            users.push({ id: doc.id, ...userData });
        }
    });

    // البحث عن طريق email (يبدأ بـ)
    const emailSnapshot = await db.collection('users')
                            .where('email', '>=', lowerCaseSearchTerm)
                            .where('email', '<=', lowerCaseSearchTerm + '\uf8ff')
                            .limit(5)
                            .get();
    emailSnapshot.forEach(doc => {
        const userData = doc.data();
        if (auth.currentUser && userData.email !== auth.currentUser.email) { // لا تظهر المستخدم الحالي
            // تجنب إضافة نفس المستخدم مرتين إذا كان اسمه وبريده متشابهين
            if (!users.some(u => u.id === doc.id)) {
                users.push({ id: doc.id, ...userData });
            }
        }
    });
    return users;
}

// دالة لإنشاء محادثة جديدة بين مستخدمين
async function createChat(participantsUids) { // participantsUids يجب أن تكون مصفوفة من الـ UIDs
    if (participantsUids.length < 2) {
        throw new Error("A chat must have at least two participants.");
    }

    // لضمان uniqueness للدردشات الفردية، نقوم بإنشاء ID مرتّب
    const sortedParticipants = [...new Set(participantsUids)].sort(); // إزالة التكرارات والترتيب
    const chatId = sortedParticipants.join('_');

    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (chatDoc.exists) {
        return chatId; // الدردشة موجودة بالفعل
    } else {
        const chatData = {
            participants: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: 'ابدأ محادثتكما الأولى!',
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            isGroup: false,
            publicChat: false,
            newsChannel: false
        };
        sortedParticipants.forEach(uid => {
            chatData.participants[uid] = true;
        });

        await chatRef.set(chatData);
        return chatId;
    }
}

// دالة مساعدة لإضافة مشارك إلى دردشة موجودة (للدعم الداخلي مثل الدردشة العامة)
async function addParticipantToChat(chatId, userId) {
    try {
        const chatRef = db.collection('chats').doc(chatId);
        await chatRef.update({
            [`participants.${userId}`]: true // إضافة المستخدم كـ true في الخريطة
        });
        console.log(`User ${userId} added to chat ${chatId}.`);
    } catch (error) {
        // إذا لم تكن الدردشة موجودة بعد، قد تحتاج لإنشائها أولاً
        if (error.code === 'not-found') {
            console.warn(`Chat ${chatId} not found when trying to add participant. Creating it...`);
            let chatData = {
                participants: { [userId]: true },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: 'مرحباً بالجميع!',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (chatId === PUBLIC_CHAT_ID) {
                chatData.name = 'الدردشة العامة';
                chatData.publicChat = true;
                chatData.isGroup = true; // تعتبر مجموعة
            } else if (chatId === NEWS_CHANNEL_ID) {
                chatData.name = 'قناة الأخبار';
                chatData.newsChannel = true;
                chatData.isGroup = true; // تعتبر مجموعة
                chatData.readOnly = true; // يمكن للمشرفين فقط الكتابة فيها (تطبيق هذه القاعدة في app.js)
            } else {
                // قد تحتاج لمعالجة حالات أخرى للدردشات غير الموجودة هنا
                console.error("Unknown chat ID for creation:", chatId);
                return;
            }
            await db.collection('chats').doc(chatId).set(chatData);
            console.log(`Chat ${chatId} created and user ${userId} added.`);

        } else {
            console.error(`Error adding user ${userId} to chat ${chatId}:`, error);
        }
    }
}

// دالة للحصول على رسائل محادثة معينة
function getMessages(chatId, callback) {
    return db.collection('chats').doc(chatId).collection('messages')
      .orderBy('timestamp', 'asc') // ترتيب تصاعدي لتظهر الرسائل القديمة أولاً
      .onSnapshot((snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
      }, (error) => {
        console.error("Error fetching messages:", error);
        callback([]); // إرجاع مصفوفة فارغة في حالة الخطأ
      });
}

// دالة لإرسال رسالة
async function sendMessage(chatId, senderId, senderUsername, messageContent) {
    try {
        // التأكد من أن المستخدم الحالي لديه صلاحية الكتابة (خاصة لقناة الأخبار)
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (chatDoc.exists && chatDoc.data().newsChannel && senderId !== 'admin_user_id') { // تحتاج لتحديد ID مشرف حقيقي أو نظام صلاحيات
            // مؤقتًا، لنسمح للمستخدمين العاديين بالكتابة في قناة الأخبار
            // يجب تطبيق نظام صلاحيات هنا
            // alert("لا يمكنك الكتابة في قناة الأخبار.");
            // return false;
        }

        const messageData = {
            senderId: senderId,
            senderUsername: senderUsername,
            content: messageContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            readBy: {
                [senderId]: true // المرسل قرأ رسالته
            }
        };
        const messageRef = await db.collection('chats').doc(chatId).collection('messages').add(messageData);

        // تحديث آخر رسالة وتاريخها في مستند الدردشة الأم
        await db.collection('chats').doc(chatId).update({
            lastMessage: messageContent,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        throw new Error("فشل إرسال الرسالة: " + error.message);
    }
}

// دالة لتحديث حالة "تمت القراءة" للرسائل
async function markMessagesAsRead(chatId, messageIds, userId) {
    const batch = db.batch();
    messageIds.forEach(messageId => {
        const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
        batch.update(messageRef, {
            [`readBy.${userId}`]: true
        });
    });
    try {
        await batch.commit();
        // console.log("Messages marked as read.");
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}

// دالة للحصول على الدردشات التي يشارك فيها المستخدم
function getParticipatingChats(userId, callback) {
    // الاستماع إلى التحديثات في الوقت الفعلي
    return db.collection('chats')
        .where(`participants.${userId}`, '==', true)
        .orderBy('lastMessageAt', 'desc')
        .onSnapshot((snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(chats);
        }, (error) => {
            console.error("Error fetching participating chats:", error);
            callback([]);
        });
}

// دالة للاستماع إلى تغييرات حالة الاتصال للمستخدمين في دردشة معينة
// يمكن استخدامها لتحديث مؤشر "متصل" / "يكتب..."
function listenToUserStatus(userId, callback) {
    return db.collection('users').doc(userId).onSnapshot(doc => {
        if (doc.exists) {
            callback(doc.data());
        }
    }, error => {
        console.error("Error listening to user status:", error);
    });
}