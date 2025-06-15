// public/firestore.js

// تعريف متغيرات عامة لخدمات Firebase (يتم تهيئتها في firebase-config.js)
// يجب أن تكون هذه المتغيرات متاحة عالمياً بعد تحميل firebase-config.js
// لتجنب أخطاء "غير معرف"
// const auth = firebase.auth(); // هذا لم يعد ضروريا هنا، يمكن الوصول إليه عالميا
// const db = firebase.firestore(); // هذا لم يعد ضروريا هنا، يمكن الوصول إليه عالميا

// معرفات الدردشات الثابتة
const defaultAvatarUrl = "https://via.placeholder.com/150/CCCCCC/000000?text=AV"; // Placeholder Avatar
const PUBLIC_CHAT_ID = "general_public_chat"; // الدردشة العامة (الجميع فيها)
const NEWS_CHANNEL_ID = "news_announcements_channel"; // قناة الأخبار (للقراءة فقط)
const PUBLIC_GROUP_CHAT_ID = "all_users_group_chat"; // المجموعة العامة الإجبارية

// --- وظائف المستخدم والملف الشخصي ---

/**
 * ينشئ ملف تعريف مستخدم جديد في Firestore.
 * يضمن اسم مستخدم فريد ويضيف المستخدم تلقائيًا للدردشات العامة.
 * @param {string} userId - معرف المستخدم (UID).
 * @param {string} email - البريد الإلكتروني للمستخدم.
 * @param {string} defaultUsername - اسم المستخدم المقترح افتراضيًا (عادة جزء من البريد الإلكتروني).
 */
async function createUserProfile(userId, email, defaultUsername) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        let username = defaultUsername;
        let counter = 0;
        // التأكد من أن اسم المستخدم فريد
        while (await checkUsernameExists(username)) {
            username = `${defaultUsername}_${++counter}`;
        }

        await userRef.set({
            email: email,
            username: username,
            profilePictureUrl: defaultAvatarUrl,
            postsCount: 0,
            // المعارف (Acquaintances) - يتم تخزينها كخريطة لسهولة إضافة/إزالة والتحقق من العلاقة المتبادلة
            acquaintances: {}, 
            isProfilePrivate: false, // خصوصية الملف الشخصي
            statusMessage: 'مرحباً! أنا أستخدم تواصل.', // حالة مزاج افتراضية
            savedPosts: {}, // المنشورات المحفوظة (كخريطة postId -> timestamp)
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true // تعيين المستخدم كمتصل عند الإنشاء
        });

        // إضافة المستخدم تلقائياً للدردشات العامة الإجبارية
        await addParticipantToChat(PUBLIC_CHAT_ID, userId, username);
        await addParticipantToChat(NEWS_CHANNEL_ID, userId, username);
        await addParticipantToChat(PUBLIC_GROUP_CHAT_ID, userId, username);

        console.log(`User profile for ${username} created and added to public chats.`);
    } else {
        console.log("User profile already exists. Updating status and ensuring public chat membership.");
        // إذا كان الملف موجودًا بالفعل، قم فقط بتحديث الحالة وتأكد من عضويته في الدردشات العامة
        await updateUserStatus(userId, true);
        const existingUserData = userDoc.data();
        await addParticipantToChat(PUBLIC_CHAT_ID, userId, existingUserData.username || email.split('@')[0]);
        await addParticipantToChat(NEWS_CHANNEL_ID, userId, existingUserData.username || email.split('@')[0]);
        await addParticipantToChat(PUBLIC_GROUP_CHAT_ID, userId, existingUserData.username || email.split('@')[0]);
    }
}

/**
 * يتحقق مما إذا كان اسم المستخدم موجودًا بالفعل في Firestore.
 * @param {string} username - اسم المستخدم للتحقق.
 * @returns {Promise<boolean>} - True إذا كان اسم المستخدم موجودًا، False بخلاف ذلك.
 */
async function checkUsernameExists(username) {
    const snapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
    return !snapshot.empty;
}

/**
 * يحدّث حالة الاتصال وآخر ظهور للمستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {boolean} isOnline - True إذا كان متصلاً، False إذا كان غير متصل.
 */
async function updateUserStatus(userId, isOnline) {
    try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            isOnline: isOnline,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating user status:", error);
    }
}

/**
 * يستمع لتغييرات حالة الاتصال لمستخدم معين في الوقت الفعلي.
 * @param {string} userId - معرف المستخدم المراد الاستماع لحالته.
 * @param {function} callback - دالة يتم استدعاؤها مع بيانات المستخدم (isOnline, lastSeen).
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function listenToUserStatus(userId, callback) {
    return db.collection('users').doc(userId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            callback({
                isOnline: data.isOnline,
                lastSeen: data.lastSeen
            });
        }
    });
}

/**
 * يجلب ملف تعريف مستخدم واحد.
 * @param {string} userId - معرف المستخدم.
 * @returns {Promise<DocumentSnapshot>} - وعد بكائن DocumentSnapshot.
 */
function getUserProfile(userId) {
    return db.collection('users').doc(userId).get();
}

/**
 * يجلب ملفات تعريف لعدة مستخدمين.
 * يستخدم لتقسيم الاستعلامات إلى دفعات (chunks) لتجاوز حد 10 في استعلامات 'in'.
 * @param {string[]} userIds - مصفوفة من معرفات المستخدمين.
 * @returns {Promise<Object[]>} - وعد بمصفوفة من كائنات بيانات المستخدم.
 */
async function getUsersProfiles(userIds) {
    if (userIds.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
    }

    let allUsers = [];
    for (const chunk of chunks) {
        const snapshots = await db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapshots.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
    }
    return allUsers;
}

/**
 * يحدّث اسم المستخدم مع التحقق من التفرد.
 * @param {string} userId - معرف المستخدم.
 * @param {string} newUsername - اسم المستخدم الجديد.
 * @returns {Promise<boolean>} - True إذا نجح التحديث.
 */
async function updateUsername(userId, newUsername) {
    const userRef = db.collection('users').doc(userId);
    // التحقق من أن اسم المستخدم فريد (باستثناء المستخدم نفسه)
    const existingUsers = await db.collection('users').where('username', '==', newUsername).get();
    if (!existingUsers.empty && existingUsers.docs[0].id !== userId) {
        throw new Error("اسم المستخدم هذا محجوز بالفعل. الرجاء اختيار اسم آخر.");
    }

    try {
        await userRef.update({ username: newUsername });
        console.log("Username updated successfully.");
        return true;
    } catch (error) {
        console.error("Error updating username:", error);
        throw new Error("فشل تحديث اسم المستخدم. حاول مرة أخرى.");
    }
}

/**
 * يحدّث صورة الملف الشخصي للمستخدم.
 * (ملاحظة: هذه الدالة تقوم فقط بتحديث الرابط في Firestore.
 * الرفع الفعلي للصورة يتطلب خدمة تخزين مثل Firebase Storage أو خدمة خارجية.)
 * @param {string} userId - معرف المستخدم.
 * @param {string} newPictureUrl - رابط الصورة الجديد.
 * @returns {Promise<boolean>} - True إذا نجح التحديث.
 */
async function updateProfilePicture(userId, newPictureUrl) {
    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({ profilePictureUrl: newPictureUrl });
        console.log("Profile picture updated successfully.");
        return true;
    } catch (error) {
        console.error("Error updating profile picture:", error);
        throw new Error("فشل تحديث صورة الملف الشخصي.");
    }
}

/**
 * يحدّث حالة المزاج (Status Message) للمستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {string} newStatusMessage - حالة المزاج الجديدة.
 * @returns {Promise<boolean>} - True إذا نجح التحديث.
 */
async function updateStatusMessage(userId, newStatusMessage) {
    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({ statusMessage: newStatusMessage });
        console.log("Status message updated successfully.");
        return true;
    } catch (error) {
        console.error("Error updating status message:", error);
        throw new Error("فشل تحديث حالة المزاج.");
    }
}

/**
 * يبحث عن مستخدمين بناءً على اسم المستخدم (البريد الإلكتروني مخفي).
 * @param {string} searchTerm - مصطلح البحث.
 * @returns {Promise<Object[]>} - وعد بمصفوفة من كائنات بيانات المستخدم (فقط ID, username, profilePictureUrl).
 */
async function searchUsers(searchTerm) {
    const results = [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase(); // لضمان بحث غير حساس لحالة الأحرف

    // البحث عن طريق اسم المستخدم (بداية الاسم)
    const usernameQuery = await db.collection('users')
        .where('username', '>=', lowerCaseSearchTerm)
        .where('username', '<=', lowerCaseSearchTerm + '\uf8ff')
        .limit(10).get(); // حد لنتائج البحث

    usernameQuery.forEach(doc => {
        const data = doc.data();
        // إخفاء البريد الإلكتروني عند الإرجاع
        results.push({ id: doc.id, username: data.username, profilePictureUrl: data.profilePictureUrl });
    });
    return results;
}

/**
 * يجلب قائمة المستخدمين المتصلين حاليا.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة من كائنات المستخدمين المتصلين.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getOnlineUsers(callback) {
    return db.collection('users').where('isOnline', '==', true).onSnapshot(snapshot => {
        const onlineUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(onlineUsers);
    }, error => {
        console.error("Error getting online users:", error);
    });
}

// --- وظائف المنشورات ---

/**
 * ينشئ منشوراً جديداً.
 * @param {string} content - محتوى المنشور.
 * @param {boolean} isPrivate - هل المنشور خاص (للمعارف فقط)؟
 * @returns {Promise<void>}
 */
async function createPost(content, isPrivate = false) {
    if (!auth.currentUser) {
        throw new Error("يجب تسجيل الدخول لنشر منشور.");
    }
    const user = auth.currentUser;
    const userProfileDoc = await db.collection('users').doc(user.uid).get();
    if (!userProfileDoc.exists) {
        throw new Error("ملف تعريف المستخدم غير موجود.");
    }
    const userData = userProfileDoc.data();

    await db.collection('posts').add({
        userId: user.uid,
        username: userData.username || user.email.split('@')[0],
        userProfilePic: userData.profilePictureUrl || defaultAvatarUrl,
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        // التفاعلات: عدادات لكل نوع من الإيموجي
        reactions: {
            heart: 0, // ❤
            tears: 0, // 😫
            clown: 0, // 🤡
            thumbsUp: 0, // 👍
            thumbsDown: 0 // 👎
        },
        // userReactions: لتتبع التفاعل الوحيد لكل مستخدم (مثلاً: { userId: 'heart' })
        userReactions: {},
        commentsCount: 0,
        isPrivate: isPrivate // حالة خصوصية المنشور
    });

    // تحديث عدد المنشورات للمستخدم
    await db.collection('users').doc(user.uid).update({
        postsCount: firebase.firestore.FieldValue.increment(1)
    });
}

/**
 * يحدّث محتوى منشور موجود.
 * @param {string} postId - معرف المنشور.
 * @param {string} newContent - المحتوى الجديد للمنشور.
 * @param {string} userId - معرف المستخدم الذي يقوم بالتعديل (للتأكد من الصلاحية).
 * @returns {Promise<void>}
 */
async function updatePost(postId, newContent, userId) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        throw new Error("المنشور غير موجود.");
    }
    if (postDoc.data().userId !== userId) {
        throw new Error("ليس لديك صلاحية لتعديل هذا المنشور.");
    }

    await postRef.update({
        content: newContent,
        editedAt: firebase.firestore.FieldValue.serverTimestamp() // وقت التعديل
    });
}

/**
 * يحذف منشوراً.
 * @param {string} postId - معرف المنشور.
 * @param {string} userId - معرف المستخدم الذي يقوم بالحذف (للتأكد من الصلاحية).
 * @returns {Promise<void>}
 */
async function deletePost(postId, userId) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        throw new Error("المنشور غير موجود.");
    }
    if (postDoc.data().userId !== userId) {
        throw new Error("ليس لديك صلاحية لحذف هذا المنشور.");
    }

    // حذف المنشور والتعليقات التابعة له (لا يمكن حذف المجموعات الفرعية مباشرة في Firestore)
    // ملاحظة: لحذف المجموعات الفرعية فعليًا (التعليقات)، ستحتاج إلى دالة Cloud Function أو تنفيذ جانبي للخادم
    // هذا الكود يحذف فقط وثيقة المنشور الرئيسية.

    // يمكن إضافة وعد (Promise.all) لحذف التعليقات أولاً إذا أردت التعامل معها من جانب العميل
    const commentsSnapshot = await postRef.collection('comments').get();
    const batch = db.batch();
    commentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    batch.delete(postRef); // حذف المنشور نفسه بعد حذف تعليقاته

    await batch.commit();

    // تحديث عدد المنشورات للمستخدم
    await db.collection('users').doc(userId).update({
        postsCount: firebase.firestore.FieldValue.increment(-1)
    });
}

/**
 * يستمع للمنشورات ويستدعي دالة رد الاتصال عند التغيير.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة المنشورات.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getPosts(callback) {
    return db.collection('posts')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(posts);
        }, error => {
            console.error("Error getting posts:", error);
            // لا نستخدم alert() هنا. يجب أن يتعامل app.js مع الأخطاء.
        });
}

/**
 * يضيف أو يزيل تفاعلاً (reaction) إلى منشور.
 * يمكن للمستخدم أن يكون لديه تفاعل واحد فقط لكل منشور.
 * النقر على نفس التفاعل يزيله، والنقر على تفاعل مختلف يحل محله.
 * @param {string} postId - معرف المنشور.
 * @param {string} userId - معرف المستخدم الذي يقوم بالتفاعل.
 * @param {string} newReactionType - نوع التفاعل الجديد (مثلاً: 'heart', 'thumbsUp').
 * @returns {Promise<void>}
 */
async function addReaction(postId, userId, newReactionType) {
    const postRef = db.collection('posts').doc(postId);

    await db.runTransaction(async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists) {
            throw new Error("المنشور غير موجود.");
        }

        const postData = postDoc.data();
        const currentReactions = postData.reactions || {}; // عدادات لكل نوع تفاعل
        const userReactions = postData.userReactions || {}; // التفاعل الذي اختاره كل مستخدم

        const existingUserReaction = userReactions[userId];

        // إذا كان المستخدم قد تفاعل بالفعل
        if (existingUserReaction) {
            // قم بتقليل عداد التفاعل القديم
            if (currentReactions[existingUserReaction] > 0) {
                currentReactions[existingUserReaction]--;
            }
            // إزالة التفاعل السابق للمستخدم
            delete userReactions[userId];
        }

        // إذا كان التفاعل الجديد مختلفًا عن التفاعل القديم (أو لا يوجد تفاعل قديم)
        if (newReactionType && existingUserReaction !== newReactionType) {
            // زيادة عداد التفاعل الجديد
            if (currentReactions[newReactionType] === undefined) {
                currentReactions[newReactionType] = 0; // تهيئة إذا كان نوع التفاعل جديداً
            }
            currentReactions[newReactionType]++;
            // تعيين التفاعل الجديد للمستخدم
            userReactions[userId] = newReactionType;
        }

        // تحديث المنشور في قاعدة البيانات
        transaction.update(postRef, {
            reactions: currentReactions,
            userReactions: userReactions
        });
    });
}

/**
 * يضيف تعليقاً إلى منشور.
 * @param {string} postId - معرف المنشور.
 * @param {string} userId - معرف المستخدم المعلق.
 * @param {string} username - اسم المستخدم المعلق.
 * @param {string} userProfilePic - رابط صورة الملف الشخصي للمعلق.
 * @param {string} commentContent - محتوى التعليق.
 * @returns {Promise<void>}
 */
async function addComment(postId, userId, username, userProfilePic, commentContent) {
    const commentsCollectionRef = db.collection('posts').doc(postId).collection('comments');
    await commentsCollectionRef.add({
        userId: userId,
        username: username,
        userProfilePic: userProfilePic,
        content: commentContent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    // تحديث عدد التعليقات في وثيقة المنشور الرئيسية
    await db.collection('posts').doc(postId).update({
        commentsCount: firebase.firestore.FieldValue.increment(1)
    });
}

/**
 * يستمع للتعليقات على منشور معين في الوقت الفعلي.
 * @param {string} postId - معرف المنشور.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة من التعليقات.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getComments(postId, callback) {
    const commentsCollectionRef = db.collection('posts').doc(postId).collection('comments');
    return commentsCollectionRef.orderBy('timestamp', 'asc').onSnapshot(snapshot => {
        const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(comments);
    }, error => {
        console.error("Error getting comments:", error);
    });
}

/**
 * حفظ منشور للمستخدم.
 * يتم تخزين المنشور المحفوظ كخريطة في ملف تعريف المستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {string} postId - معرف المنشور المراد حفظه.
 * @returns {Promise<void>}
 */
async function savePost(userId, postId) {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        [`savedPosts.${postId}`]: firebase.firestore.FieldValue.serverTimestamp() // قيمة timestamp للترتيب
    });
}

/**
 * إزالة حفظ منشور للمستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {string} postId - معرف المنشور المراد إزالة حفظه.
 * @returns {Promise<void>}
 */
async function unsavePost(userId, postId) {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        [`savedPosts.${postId}`]: firebase.firestore.FieldValue.delete()
    });
}

/**
 * يستمع للمنشورات المحفوظة الخاصة بالمستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة من المنشورات المحفوظة.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getSavedPosts(userId, callback) {
    // يجب أولاً جلب قائمة savedPosts IDs من ملف تعريف المستخدم
    return db.collection('users').doc(userId).onSnapshot(async userDoc => {
        if (userDoc.exists) {
            const savedPostsMap = userDoc.data().savedPosts || {};
            const savedPostIds = Object.keys(savedPostsMap);

            if (savedPostIds.length === 0) {
                callback([]);
                return;
            }

            // جلب تفاصيل المنشورات المحفوظة
            const chunks = [];
            for (let i = 0; i < savedPostIds.length; i += 10) {
                chunks.push(savedPostIds.slice(i, i + 10));
            }

            let allSavedPosts = [];
            for (const chunk of chunks) {
                const snapshots = await db.collection('posts').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                snapshots.forEach(doc => allSavedPosts.push({ id: doc.id, ...doc.data() }));
            }
            // فرز المنشورات المحفوظة حسب تاريخ الحفظ (من الخريطة)
            allSavedPosts.sort((a, b) => (savedPostsMap[b.id]?.toDate()?.getTime() || 0) - (savedPostsMap[a.id]?.toDate()?.getTime() || 0));
            callback(allSavedPosts);
        } else {
            callback([]);
        }
    }, error => {
        console.error("Error getting saved posts:", error);
    });
}

// --- وظائف المعارف (Acquaintances) ---

const MAX_ACQUAINTANCES = 300; // الحد الأقصى لعدد المعارف

/**
 * يرسل طلب إضافة معرف (أو يقبل طلب موجود ليصبحا معرفين متبادلين).
 * ملاحظة: هذا التنفيذ يجعل العلاقة متبادلة فورًا. لنظام طلبات حقيقي (معلق/مقبول)،
 * ستحتاج إلى مجموعة فرعية لـ 'acquaintanceRequests' لكل مستخدم.
 * @param {string} currentUserId - معرف المستخدم الذي يبدأ الإضافة.
 * @param {string} targetUserId - معرف المستخدم المراد إضافته كمعرف.
 * @returns {Promise<void>}
 */
async function sendAcquaintanceRequest(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
        throw new Error("لا يمكنك إضافة نفسك كمعرف.");
    }

    const currentUserRef = db.collection('users').doc(currentUserId);
    const targetUserRef = db.collection('users').doc(targetUserId);

    const [currentUserDoc, targetUserDoc] = await Promise.all([
        currentUserRef.get(),
        targetUserRef.get()
    ]);

    if (!currentUserDoc.exists || !targetUserDoc.exists) {
        throw new Error("أحد المستخدمين غير موجود.");
    }

    const currentAcquaintances = currentUserDoc.data().acquaintances || {};
    const targetAcquaintances = targetUserDoc.data().acquaintances || {};

    if (Object.keys(currentAcquaintances).length >= MAX_ACQUAINTANCES) {
        throw new Error(`لقد وصلت إلى الحد الأقصى للمعارف (${MAX_ACQUAINTANCES}).`);
    }
    if (Object.keys(targetAcquaintances).length >= MAX_ACQUAINTANCES) {
        throw new Error(`المستخدم ${targetUserDoc.data().username} وصل إلى الحد الأقصى للمعارف.`);
    }

    // التحقق مما إذا كانا معارف بالفعل
    if (currentAcquaintances[targetUserId] || targetAcquaintances[currentUserId]) {
        throw new Error("أنتم معارف بالفعل.");
    }

    // تنفيذ الإضافة المتبادلة في دفعة واحدة (Batch)
    const batch = db.batch();

    batch.update(currentUserRef, {
        [`acquaintances.${targetUserId}`]: { addedAt: firebase.firestore.FieldValue.serverTimestamp() },
        acquaintancesCount: firebase.firestore.FieldValue.increment(1)
    });
    batch.update(targetUserRef, {
        [`acquaintances.${currentUserId}`]: { addedAt: firebase.firestore.FieldValue.serverTimestamp() },
        acquaintancesCount: firebase.firestore.FieldValue.increment(1)
    });

    await batch.commit();
    console.log(`User ${currentUserId} and ${targetUserId} are now acquaintances.`);
}

/**
 * يزيل معرفاً من قائمة المعارف المتبادلة.
 * @param {string} userId - معرف المستخدم الذي يقوم بالإزالة.
 * @param {string} acquaintanceId - معرف المعرف المراد إزالته.
 * @returns {Promise<void>}
 */
async function removeAcquaintance(userId, acquaintanceId) {
    const userRef = db.collection('users').doc(userId);
    const acquaintanceRef = db.collection('users').doc(acquaintanceId);

    const batch = db.batch();

    // إزالة المعرف من قائمة المستخدم الأول
    batch.update(userRef, {
        [`acquaintances.${acquaintanceId}`]: firebase.firestore.FieldValue.delete(),
        acquaintancesCount: firebase.firestore.FieldValue.increment(-1)
    });
    // إزالة المستخدم الأول من قائمة المعارف للمستخدم الثاني
    batch.update(acquaintanceRef, {
        [`acquaintances.${userId}`]: firebase.firestore.FieldValue.delete(),
        acquaintancesCount: firebase.firestore.FieldValue.increment(-1)
    });

    await batch.commit();
    console.log(`Acquaintance ${acquaintanceId} removed from ${userId}.`);
}

/**
 * يستمع لقائمة المعارف الخاصة بالمستخدم في الوقت الفعلي.
 * @param {string} userId - معرف المستخدم.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة من كائنات المعارف.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getAcquaintances(userId, callback) {
    return db.collection('users').doc(userId).onSnapshot(async userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const acquaintanceIds = Object.keys(userData.acquaintances || {});
            
            if (acquaintanceIds.length === 0) {
                callback([]);
                return;
            }

            const acquaintances = await getUsersProfiles(acquaintanceIds);
            callback(acquaintances);
        } else {
            callback([]);
        }
    }, error => {
        console.error("Error getting acquaintances:", error);
    });
}

/**
 * تبديل خصوصية الملف الشخصي للمستخدم.
 * @param {string} userId - معرف المستخدم.
 * @param {boolean} isPrivate - القيمة الجديدة لخصوصية الملف (true للقفل، false لفتح القفل).
 * @returns {Promise<void>}
 */
async function toggleProfilePrivacy(userId, isPrivate) {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ isProfilePrivate: isPrivate });
}


// --- وظائف الدردشات والمراسلة ---

/**
 * يضيف مشاركًا إلى دردشة معينة.
 * يتم استخدامه بشكل خاص لإضافة المستخدمين الجدد إلى الدردشات العامة تلقائياً.
 * @param {string} chatId - معرف الدردشة.
 * @param {string} userId - معرف المستخدم المراد إضافته.
 * @param {string} username - اسم المستخدم المراد إضافته.
 */
async function addParticipantToChat(chatId, userId, username) {
    const chatRef = db.collection('chats').doc(chatId);
    try {
        await chatRef.update({
            [`participants.${userId}`]: { username: username, joinedAt: firebase.firestore.FieldValue.serverTimestamp() }
        });
    } catch (error) {
        // إذا لم يتم العثور على الدردشة، قم بإنشائها أولاً
        if (error.code === 'not-found') {
            let chatData = {
                participants: {
                    [userId]: { username: username, joinedAt: firebase.firestore.FieldValue.serverTimestamp() }
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: 'مرحباً بالجميع في الدردشة!',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                isGroup: true, // الدردشات العامة هي مجموعات
                typingStatus: {} // حقل لحالة الكتابة
            };
            if (chatId === PUBLIC_CHAT_ID) {
                chatData.name = 'الدردشة العامة';
                chatData.publicChat = true;
            } else if (chatId === NEWS_CHANNEL_ID) {
                chatData.name = 'قناة إعلانات الأخبار';
                chatData.newsChannel = true;
                chatData.readOnly = true; // قناة القراءة فقط
            } else if (chatId === PUBLIC_GROUP_CHAT_ID) {
                chatData.name = 'المحادثة الجماعية العامة';
                chatData.publicGroup = true;
            }
            await chatRef.set(chatData);
            console.log(`Chat ${chatId} created and user ${username} added.`);
        } else {
            console.error(`Error adding user to chat ${chatId}:`, error);
            throw new Error(`فشل إضافة المستخدم للمحادثة: ${error.message}`);
        }
    }
}


/**
 * ينشئ دردشة جديدة (فردية أو جماعية).
 * للدردشات الفردية، يحاول العثور على دردشة موجودة بالفعل بين نفس المشاركين.
 * @param {string[]} participantIds - مصفوفة من معرفات المستخدمين المشاركين.
 * @param {string} [chatName=null] - اسم الدردشة (مطلوب للمجموعات).
 * @param {boolean} [isGroup=false] - هل هي دردشة جماعية؟
 * @returns {Promise<string>} - وعد بمعرف الدردشة الجديدة أو الموجودة.
 */
async function createChat(participantIds, chatName = null, isGroup = false) {
    if (participantIds.length < 2) {
        throw new Error("يجب أن يكون هناك مشاركان على الأقل لإنشاء دردشة.");
    }

    if (!isGroup) {
        // للدردشات الفردية (1-to-1)، نستخدم معرف دردشة فريد يعتمد على ترتيب معرفات المستخدمين
        const sortedParticipantIds = [...new Set(participantIds)].sort();
        const directChatId = sortedParticipantIds.join('_'); // مثال: "user1_user2"

        const chatRef = db.collection('chats').doc(directChatId);
        const chatDoc = await chatRef.get();

        if (chatDoc.exists) {
            return directChatId; // إرجاع معرف الدردشة الموجودة
        } else {
            // إنشاء دردشة فردية جديدة
            const participantsData = {};
            const userProfiles = await getUsersProfiles(sortedParticipantIds);
            userProfiles.forEach(user => {
                participantsData[user.id] = { username: user.username || user.email.split('@')[0] };
            });

            await chatRef.set({
                participants: participantsData,
                name: null, // لا يوجد اسم للمحادثات الفردية افتراضيًا
                isGroup: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: 'ابدأ محادثتك الأولى!',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                publicChat: false,
                newsChannel: false,
                typingStatus: {}
            });
            console.log("New private chat created with ID:", directChatId);
            return directChatId;
        }
    } else {
        // إنشاء دردشة جماعية جديدة بمعرف تلقائي
        if (!chatName) {
            throw new Error("يجب توفير اسم للدردشة الجماعية.");
        }
        const newChatRef = db.collection('chats').doc(); // معرف تلقائي
        const participantsData = {};
        const userProfiles = await getUsersProfiles(participantIds);

        userProfiles.forEach(user => {
            participantsData[user.id] = { username: user.username || user.email.split('@')[0] };
        });

        await newChatRef.set({
            participants: participantsData,
            name: chatName,
            isGroup: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: 'ابدأ محادثتك الأولى في المجموعة!',
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            publicChat: false,
            newsChannel: false,
            typingStatus: {}
        });
        console.log("New group chat created with ID:", newChatRef.id);
        return newChatRef.id;
    }
}


/**
 * يرسل رسالة إلى دردشة معينة.
 * يتحقق مما إذا كانت القناة للقراءة فقط للمستخدمين العاديين.
 * @param {string} chatId - معرف الدردشة.
 * @param {string} senderId - معرف المرسل.
 * @param {string} senderUsername - اسم المرسل.
 * @param {string} content - محتوى الرسالة.
 * @returns {Promise<boolean>} - True إذا نجح الإرسال.
 */
async function sendMessage(chatId, senderId, senderUsername, content) {
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
        throw new Error("الدردشة غير موجودة.");
    }
    const chatData = chatDoc.data();

    // منع الإرسال إلى قنوات الأخبار إذا لم يكن المرسل مسؤولاً
    if (chatData.newsChannel && !isAdminUser()) {
        throw new Error("لا يمكنك إرسال رسائل إلى قناة الأخبار.");
    }

    const messagesCollectionRef = db.collection('chats').doc(chatId).collection('messages');
    try {
        await messagesCollectionRef.add({
            senderId: senderId,
            senderUsername: senderUsername,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            readBy: {
                [senderId]: true // المرسل يعتبر قد قرأ رسالته تلقائياً
            }
        });

        // تحديث آخر رسالة وتاريخها في وثيقة الدردشة الرئيسية
        await db.collection('chats').doc(chatId).update({
            lastMessage: content,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        throw new Error("فشل إرسال الرسالة.");
    }
}

/**
 * يستمع للرسائل في دردشة معينة في الوقت الفعلي.
 * @param {string} chatId - معرف الدردشة.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة الرسائل.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getMessages(chatId, callback) {
    const messagesCollectionRef = db.collection('chats').doc(chatId).collection('messages');
    return messagesCollectionRef.orderBy('timestamp', 'asc').onSnapshot(snapshot => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    }, error => {
        console.error("Error getting messages:", error);
        // يجب أن يتعامل app.js مع هذه الأخطاء
    });
}

/**
 * يقوم بتمييز الرسائل كمقروءة للمستخدم المحدد.
 * @param {string} chatId - معرف الدردشة.
 * @param {string[]} messageIds - مصفوفة بمعرفات الرسائل التي تم قراءتها.
 * @param {string} userId - معرف المستخدم الذي قرأ الرسائل.
 */
async function markMessagesAsRead(chatId, messageIds, userId) {
    const batch = db.batch();
    messageIds.forEach(msgId => {
        const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(msgId);
        batch.update(messageRef, {
            [`readBy.${userId}`]: true
        });
    });
    try {
        await batch.commit();
        // console.log(`Messages in chat ${chatId} marked as read by ${userId}`);
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}

/**
 * يجلب جميع الدردشات التي يشارك فيها مستخدم معين في الوقت الفعلي.
 * @param {string} userId - معرف المستخدم.
 * @param {function} callback - دالة يتم استدعاؤها مع مصفوفة من الدردشات.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function getParticipatingChats(userId, callback) {
    return db.collection('chats')
        .where(`participants.${userId}.username`, '!=', null) // التأكد أن المستخدم مشارك
        .orderBy('lastMessageAt', 'desc') // فرز حسب آخر رسالة
        .onSnapshot(snapshot => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(chats);
        }, error => {
            console.error("Error getting participating chats:", error);
        });
}

/**
 * تحديث حالة الكتابة للمستخدم في دردشة معينة.
 * @param {string} chatId - معرف الدردشة.
 * @param {string} userId - معرف المستخدم.
 * @param {boolean} isTyping - True إذا كان يكتب، False إذا توقف.
 */
async function updateTypingStatus(chatId, userId, isTyping) {
    const chatRef = db.collection('chats').doc(chatId);
    if (isTyping) {
        await chatRef.update({
            [`typingStatus.${userId}`]: true
        });
    } else {
        await chatRef.update({
            [`typingStatus.${userId}`]: firebase.firestore.FieldValue.delete()
        });
    }
}

/**
 * يستمع لحالة الكتابة في دردشة معينة.
 * @param {string} chatId - معرف الدردشة.
 * @param {string} otherUserId - معرف المستخدم الآخر لمراقبة حالته.
 * @param {function} callback - دالة يتم استدعاؤها مع true/false لحالة الكتابة.
 * @returns {function} - دالة لإلغاء الاشتراك من المستمع.
 */
function listenToTypingStatus(chatId, otherUserId, callback) {
    return db.collection('chats').doc(chatId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const typingUsers = data.typingStatus || {};
            const isTyping = !!typingUsers[otherUserId]; // تحقق مما إذا كان المستخدم الآخر يكتب
            callback(isTyping);
        }
    });
}