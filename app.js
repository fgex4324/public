// في ملف app.js
// يجب أن تكون auth, db, currentUser, currentUserProfileData, defaultAvatarUrl, isAdminUser معرفة من الملفات الأخرى
// PUBLIC_CHAT_ID, NEWS_CHANNEL_ID معرفين من firestore.js

// عناصر واجهة المستخدم الرئيسية
const showPostsBtn = document.getElementById('showPostsBtn');
const showChatsBtn = document.getElementById('showChatsBtn');
const showProfileBtn = document.getElementById('showProfileBtn');

const postsSection = document.getElementById('postsSection');
const chatsSection = document.getElementById('chatsSection');
const profileSection = document.getElementById('profileSection');

// عناصر المنشورات
const postContentInput = document.getElementById('postContent');
const publishPostBtn = document.getElementById('publishPostBtn');
const postsList = document.getElementById('postsList');

// عناصر الملف الشخصي
const profileAvatar = document.getElementById('profileAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const postsCountSpan = document.getElementById('postsCount');
const editUsernameBtn = document.getElementById('editUsernameBtn');
const newUsernameInput = document.getElementById('newUsernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const profileImageUpload = document.getElementById('profileImageUpload');

// عناصر إعدادات Firebase (للمسؤولين فقط)
const showSettingsBtn = document.getElementById('showSettingsBtn');
const settingsCard = document.getElementById('settingsCard');
const apiKeyInput = document.getElementById('apiKeyInput');
const authDomainInput = document.getElementById('authDomainInput');
const databaseURLInput = document.getElementById('databaseURLInput');
const projectIdInput = document.getElementById('projectIdInput');
const storageBucketInput = document.getElementById('storageBucketInput');
const messagingSenderIdInput = document.getElementById('messagingSenderIdInput');
const appIdInput = document.getElementById('appIdInput');
const saveFirebaseConfigBtn = document.getElementById('saveFirebaseConfigBtn');
const firebaseConfigMessage = document.getElementById('firebaseConfigMessage');


// عناصر الدردشة
const searchUserInput = document.getElementById('searchUserInput');
const searchUserBtn = document.getElementById('searchUserBtn');
const searchResultsList = document.getElementById('searchResults');
const chatsList = document.getElementById('chatsList');
const chatContainer = document.getElementById('chatContainer');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatHeaderName = document.getElementById('chatHeaderName');
const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
const chatStatus = document.getElementById('chatStatus'); // مؤشر الحالة
const messagesList = document.getElementById('messagesList');
const messageInputForm = document.getElementById('messageInputForm');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const recordAudioBtn = document.getElementById('recordAudioBtn'); // زر الرسائل الصوتية (placeholder)


let currentChatId = null;
let unsubscribeMessages = null; // لتنظيف الـ listener عند تبديل الدردشة
let unsubscribeChatStatus = null; // لتنظيف الـ listener لحالة المستخدم في الدردشة

// --- وظائف عامة ---
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // تحديث حالة الأزرار في الـ nav
    document.querySelectorAll('header nav button').forEach(btn => btn.classList.remove('active'));
    if (sectionId === 'postsSection') showPostsBtn.classList.add('active');
    else if (sectionId === 'chatsSection') showChatsBtn.classList.add('active');
    else if (sectionId === 'profileSection') showProfileBtn.classList.add('active');

    // إخفاء نتائج البحث عند التبديل بين الأقسام
    searchResultsList.innerHTML = '';
    searchUserInput.value = '';
    // إخفاء الدردشة المفتوحة عند التبديل بعيداً عن قسم المحادثات
    if (sectionId !== 'chatsSection' && chatContainer.classList.contains('active')) {
        chatContainer.classList.remove('active');
        if (unsubscribeMessages) {
            unsubscribeMessages();
            unsubscribeMessages = null;
        }
        if (unsubscribeChatStatus) {
            unsubscribeChatStatus();
            unsubscribeChatStatus = null;
        }
        messagesList.innerHTML = '';
        currentChatId = null;
    }
}

// دالة لتنسيق التاريخ والوقت بشكل ودود
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
        return 'الآن';
    } else if (diffSeconds < 3600) {
        return `${Math.floor(diffSeconds / 60)} دقيقة مضت`;
    } else if (diffSeconds < 86400) { // أقل من 24 ساعة
        return `${Math.floor(diffSeconds / 3600)} ساعة مضت`;
    } else if (diffSeconds < 604800) { // أقل من 7 أيام
        return `${Math.floor(diffSeconds / 86400)} يوم مضت`;
    } else {
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

// --- وظائف قسم المنشورات ---
publishPostBtn.addEventListener('click', async () => {
    const content = postContentInput.value.trim();
    if (content) {
        publishPostBtn.disabled = true; // تعطيل الزر لمنع النشر المتكرر
        publishPostBtn.textContent = 'جاري النشر...';
        try {
            await createPost(content);
            postContentInput.value = '';
            alert('تم نشر المنشور بنجاح!');
        } catch (error) {
            alert('فشل نشر المنشور: ' + error.message);
        } finally {
            publishPostBtn.disabled = false;
            publishPostBtn.textContent = 'نشر';
        }
    } else {
        alert('الرجاء كتابة شيء لنشره.');
    }
});

function displayPosts(posts) {
    postsList.innerHTML = '';
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty">لا توجد منشورات حاليًا. كن أول من ينشر!</div>';
        return;
    }
    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';

        // تحقق مما إذا كان المستخدم الحالي قد أعجب بالمنشور
        const isLiked = post.likedBy && post.likedBy[currentUser.uid];
        const likeButtonClass = isLiked ? 'liked' : ''; // لتطبيق ستايل مختلف إذا كان معجباً

        postItem.innerHTML = `
            <div class="post-header">
                <img src="${post.userProfilePic || defaultAvatarUrl}" alt="صورة الملف الشخصي" class="post-avatar">
                <span class="post-username">${post.username}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-footer">
                <span class="time">${formatTime(post.timestamp)}</span>
                <div class="likes">
                    <button class="like-btn ${likeButtonClass}" data-post-id="${post.id}">❤</button>
                    <span>${post.likesCount || 0}</span>
                </div>
            </div>
        `;
        postsList.appendChild(postItem);

        // إضافة مستمع لزر الإعجاب
        postItem.querySelector('.like-btn').addEventListener('click', async (e) => {
            if (currentUser) {
                const postId = e.target.dataset.postId;
                e.target.disabled = true; // منع النقر المتكرر
                try {
                    await toggleLike(postId, currentUser.uid);
                    // UI will update automatically via onSnapshot
                } catch (error) {
                    alert(error.message);
                } finally {
                    e.target.disabled = false;
                }
            } else {
                alert('الرجاء تسجيل الدخول للإعجاب بالمنشورات.');
            }
        });
    });
}

function loadPosts() {
    postsList.innerHTML = '<div class="loading">جاري تحميل المنشورات...</div>';
    getPosts(displayPosts);
}

// --- وظائف قسم الملف الشخصي ---
async function loadUserProfile(userId) {
    const doc = await getUserProfile(userId);
    if (doc.exists) {
        currentUserProfileData = doc.data(); // تحديث البيانات المخزنة
        displayUserProfile(currentUserProfileData);
    } else {
        console.error("User profile not found for ID:", userId);
        // في حال عدم وجود ملف شخصي (يجب ألا يحدث إذا تم createUserProfile بشكل صحيح)
        profileUsername.textContent = currentUser.email.split('@')[0];
        profileEmail.textContent = currentUser.email;
        profileAvatar.src = defaultAvatarUrl;
        postsCountSpan.textContent = '0';
        alert("لم يتم العثور على ملفك الشخصي. قد تحتاج لإعادة تسجيل الدخول.");
        auth.signOut(); // تسجيل الخروج لإعادة محاولة إنشاء الملف الشخصي
    }

    // عرض أو إخفاء زر الإعدادات بناءً على صلاحية المسؤول
    if (isAdminUser()) {
        showSettingsBtn.style.display = 'block';
        populateFirebaseConfigInputs(); // تعبئة الحقول إذا كان مسؤولاً
    } else {
        showSettingsBtn.style.display = 'none';
        settingsCard.style.display = 'none'; // إخفاء لوحة الإعدادات
    }
}

function displayUserProfile(user) {
    profileUsername.textContent = user.username || 'مستخدم جديد';
    profileEmail.textContent = user.email || 'لا يوجد بريد إلكتروني';
    profileAvatar.src = user.profilePictureUrl || defaultAvatarUrl;
    postsCountSpan.textContent = user.postsCount || 0;
}

editUsernameBtn.addEventListener('click', () => {
    profileUsername.style.display = 'none';
    editUsernameBtn.style.display = 'none';
    newUsernameInput.style.display = 'block';
    saveUsernameBtn.style.display = 'block';
    newUsernameInput.value = profileUsername.textContent; // تعبئة الاسم الحالي
    newUsernameInput.focus();
});

saveUsernameBtn.addEventListener('click', async () => {
    const newUsername = newUsernameInput.value.trim();
    if (newUsername && currentUser) {
        if (newUsername === currentUserProfileData.username) {
            alert('الاسم الجديد هو نفس الاسم الحالي.');
            // فقط إخفاء حقول التعديل
            profileUsername.style.display = 'block';
            editUsernameBtn.style.display = 'block';
            newUsernameInput.style.display = 'none';
            saveUsernameBtn.style.display = 'none';
            return;
        }

        saveUsernameBtn.disabled = true;
        saveUsernameBtn.textContent = 'جاري الحفظ...';
        try {
            const success = await updateUsername(currentUser.uid, newUsername);
            if (success) {
                profileUsername.textContent = newUsername;
                currentUserProfileData.username = newUsername; // تحديث البيانات في الذاكرة
                alert('تم تحديث اسم المستخدم بنجاح.');
            } else {
                alert('فشل تحديث اسم المستخدم.');
            }
        } catch (error) {
            alert('خطأ: ' + error.message);
        } finally {
            saveUsernameBtn.disabled = false;
            saveUsernameBtn.textContent = 'حفظ';
            profileUsername.style.display = 'block';
            editUsernameBtn.style.display = 'block';
            newUsernameInput.style.display = 'none';
            saveUsernameBtn.style.display = 'none';
        }
    } else {
        alert('الرجاء إدخال اسم مستخدم صالح.');
    }
});

changeAvatarBtn.addEventListener('click', () => {
    profileImageUpload.click(); // يحفز النقر على input file المخفي
});

profileImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && currentUser) {
        // هنا يجب أن تدمج خدمة رفع الصور مثل Cloudinary أو Firebase Storage
        // حالياً، لا يوجد دعم مباشر لرفع الصور هنا في هذا الكود.
        // يجب أن تضيف كود رفع الصورة هنا والحصول على الـ URL بعد الرفع الناجح
        // ثم تستخدم الـ URL مع دالة updateProfilePicture

        alert("وظيفة تغيير الصورة غير مدعومة حالياً. تحتاج إلى دمج خدمة رفع صور مثل Cloudinary أو Firebase Storage.");
        // مثال (كود وهمي لرفع الصورة):
        // try {
        //     const imageUrl = await uploadImageToFirebaseStorage(file, currentUser.uid); // دالة وهمية
        //     if (imageUrl) {
        //         await updateProfilePicture(currentUser.uid, imageUrl);
        //         profileAvatar.src = imageUrl; // تحديث الصورة في الواجهة
        //         currentUserProfileData.profilePictureUrl = imageUrl; // تحديث البيانات في الذاكرة
        //         alert('تم تحديث صورة الملف الشخصي بنجاح.');
        //     } else {
        //         alert('فشل رفع الصورة.');
        //     }
        // } catch (error) {
        //     console.error("Error uploading image:", error);
        //     alert('خطأ أثناء رفع الصورة: ' + error.message);
        // }
    }
});

// --- وظائف إعدادات Firebase (للمسؤولين فقط) ---
showSettingsBtn.addEventListener('click', () => {
    if (isAdminUser()) {
        settingsCard.style.display = settingsCard.style.display === 'none' ? 'block' : 'none';
    } else {
        alert("ليس لديك صلاحية الوصول إلى هذه الإعدادات.");
    }
});

function populateFirebaseConfigInputs() {
    // استخدم firebaseConfig الحالي من firebase-config.js
    apiKeyInput.value = firebaseConfig.apiKey || '';
    authDomainInput.value = firebaseConfig.authDomain || '';
    databaseURLInput.value = firebaseConfig.databaseURL || '';
    projectIdInput.value = firebaseConfig.projectId || '';
    storageBucketInput.value = firebaseConfig.storageBucket || '';
    messagingSenderIdInput.value = firebaseConfig.messagingSenderId || '';
    appIdInput.value = firebaseConfig.appId || '';
    firebaseConfigMessage.textContent = '';
}

saveFirebaseConfigBtn.addEventListener('click', () => {
    if (!isAdminUser()) {
        firebaseConfigMessage.textContent = 'ليس لديك صلاحية لتعديل الإعدادات.';
        return;
    }

    const newConfig = {
        apiKey: apiKeyInput.value.trim(),
        authDomain: authDomainInput.value.trim(),
        databaseURL: databaseURLInput.value.trim(),
        projectId: projectIdInput.value.trim(),
        storageBucket: storageBucketInput.value.trim(),
        messagingSenderId: messagingSenderIdInput.value.trim(),
        appId: appIdInput.value.trim()
    };

    // تحقق بسيط من أن جميع الحقول مملوءة
    const hasEmptyField = Object.values(newConfig).some(val => val === '');
    if (hasEmptyField) {
        firebaseConfigMessage.textContent = 'الرجاء ملء جميع حقول إعدادات Firebase.';
        return;
    }

    saveFirebaseConfigBtn.disabled = true;
    saveFirebaseConfigBtn.textContent = 'جاري الحفظ...';

    try {
        const success = updateFirebaseConfig(newConfig); // دالة من firebase-config.js
        if (success) {
            firebaseConfigMessage.style.color = 'green';
            firebaseConfigMessage.textContent = 'تم حفظ إعدادات Firebase بنجاح! يرجى إعادة تحميل الصفحة لتطبيق التغييرات.';
            // لا تقوم بإعادة تحميل الصفحة تلقائياً لمنح المستخدم فرصة لقراءة الرسالة
        } else {
            firebaseConfigMessage.style.color = 'red';
            firebaseConfigMessage.textContent = 'فشل حفظ الإعدادات. تحقق من القيم المدخلة.';
        }
    } catch (error) {
        firebaseConfigMessage.style.color = 'red';
        firebaseConfigMessage.textContent = 'خطأ أثناء حفظ الإعدادات: ' + error.message;
        console.error("Error saving Firebase config:", error);
    } finally {
        saveFirebaseConfigBtn.disabled = false;
        saveFirebaseConfigBtn.textContent = 'حفظ إعدادات Firebase';
    }
});


// --- وظائف قسم المحادثات ---

// بحث المستخدمين
searchUserBtn.addEventListener('click', async () => {
    const searchTerm = searchUserInput.value.trim();
    if (searchTerm) {
        searchResultsList.innerHTML = '<div class="loading">جاري البحث عن مستخدمين...</div>';
        try {
            const users = await searchUsers(searchTerm); // البحث بالاسم أو البريد
            searchResultsList.innerHTML = '';
            if (users.length === 0) {
                searchResultsList.innerHTML = '<div class="empty">لا توجد نتائج بحث مطابقة.</div>';
                return;
            }
            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <img src="${user.profilePictureUrl || defaultAvatarUrl}" alt="صورة المستخدم" class="user-avatar">
                    <h3>${user.username || user.email.split('@')[0]}</h3>
                    <p>${user.email}</p>
                `;
                userItem.addEventListener('click', async () => {
                    if (!currentUser) {
                        alert('الرجاء تسجيل الدخول لبدء محادثة.');
                        return;
                    }
                    if (currentUser.uid === user.id) {
                        alert('لا يمكنك بدء محادثة مع نفسك.');
                        return;
                    }
                    searchResultsList.innerHTML = ''; // مسح نتائج البحث
                    searchUserInput.value = ''; // مسح حقل البحث

                    try {
                        const chatId = await createChat([currentUser.uid, user.id]);
                        if (chatId) {
                            openChat(chatId, user.username || user.email.split('@')[0], user.profilePictureUrl, false, false);
                        } else {
                            alert('فشل إنشاء/فتح المحادثة.');
                        }
                    } catch (error) {
                        alert('خطأ في بدء المحادثة: ' + error.message);
                    }
                });
                searchResultsList.appendChild(userItem);
            });
        } catch (error) {
            console.error("Search users error:", error);
            searchResultsList.innerHTML = `<div class="error-message">حدث خطأ أثناء البحث: ${error.message}</div>`;
        }
    } else {
        searchResultsList.innerHTML = '';
    }
});


// تحميل قائمة المحادثات
async function loadChats() {
    if (!currentUser) {
        chatsList.innerHTML = '<div class="empty">الرجاء تسجيل الدخول لعرض الدردشات.</div>';
        return;
    }

    chatsList.innerHTML = '<div class="loading">جاري تحميل الدردشات...</div>';

    getParticipatingChats(currentUser.uid, async (chats) => {
        chatsList.innerHTML = ''; // مسح القائمة الحالية

        if (chats.length === 0) {
            chatsList.innerHTML = '<div class="empty">لا توجد دردشات حاليًا. ابدأ محادثة جديدة!</div>';
            return;
        }

        const chatItemsPromises = chats.map(async chatDoc => {
            const chat = chatDoc; // chatDoc هنا هو الكائن المحول بالفعل
            const chatId = chat.id;

            let chatName = chat.name || 'محادثة فردية';
            let chatAvatar = defaultAvatarUrl;
            let isGroup = chat.isGroup || chat.publicChat || chat.newsChannel;
            let isNewsChannel = chat.newsChannel;
            let otherParticipantId = null;

            if (chat.publicChat) {
                chatName = chat.name || 'الدردشة العامة';
                chatAvatar = 'https://via.placeholder.com/50/800080/FFFFFF?text=GC'; // أيقونة للدردشة العامة
            } else if (chat.newsChannel) {
                chatName = chat.name || 'الأخبار';
                chatAvatar = 'https://via.placeholder.com/50/FFD700/000000?text=NEWS'; // أيقونة للأخبار (ذهبي)
            } else if (!isGroup) { // للمحادثات الفردية
                const otherParticipantsIds = Object.keys(chat.participants).filter(uid => uid !== currentUser.uid);
                if (otherParticipantsIds.length > 0) {
                    otherParticipantId = otherParticipantsIds[0];
                    try {
                        const otherUserDoc = await getUserProfile(otherParticipantId);
                        if (otherUserDoc.exists) {
                            const otherUser = otherUserDoc.data();
                            chatName = otherUser.username || otherUser.email.split('@')[0];
                            chatAvatar = otherUser.profilePictureUrl || defaultAvatarUrl;
                        } else {
                            chatName = 'مستخدم غير معروف';
                            chatAvatar = defaultAvatarUrl; // fallback if profile deleted
                        }
                    } catch (e) {
                        console.error("Error fetching other user profile:", e);
                        chatName = 'مستخدم غير معروف (خطأ)';
                        chatAvatar = defaultAvatarUrl;
                    }
                }
            }

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.setAttribute('data-chat-id', chatId);

            chatItem.innerHTML = `
                <img src="${chatAvatar}" alt="صورة الدردشة" class="chat-avatar">
                <div class="chat-item-content">
                    <h3>${chatName}</h3>
                    <p class="last-message">${chat.lastMessage || 'ابدأ محادثتك الأولى!'}</p>
                </div>
                <span class="time">${formatTime(chat.lastMessageAt)}</span>
            `;

            chatItem.addEventListener('click', () => {
                openChat(chatId, chatName, chatAvatar, isGroup, isNewsChannel, otherParticipantId);
            });
            return chatItem;
        });

        const chatItems = await Promise.all(chatItemsPromises);
        chatItems.forEach(item => chatsList.appendChild(item));
    });
}

function openChat(chatId, chatName, chatAvatar, isGroupChat, isNewsChannel = false, otherParticipantId = null) {
    currentChatId = chatId;
    chatHeaderName.textContent = chatName;
    chatHeaderAvatar.src = chatAvatar;
    chatContainer.classList.add('active');
    chatsSection.classList.remove('active');

    // إظهار أو إخفاء حقل الرسائل بناءً على ما إذا كانت قناة أخبار أو إذا كان المستخدم لا يملك صلاحية الكتابة
    if (isNewsChannel) {
        messageInputForm.style.display = 'none'; // إخفاء نموذج الإرسال لقناة الأخبار
    } else {
        messageInputForm.style.display = 'flex'; // إظهاره للمحادثات الأخرى
    }

    // إدارة مؤشر حالة الاتصال/الكتابة
    if (unsubscribeChatStatus) {
        unsubscribeChatStatus(); // تنظيف الـ listener القديم
    }
    chatStatus.textContent = ''; // مسح أي حالة سابقة

    if (!isGroupChat && otherParticipantId) { // فقط للمحادثات الفردية
        unsubscribeChatStatus = listenToUserStatus(otherParticipantId, (userData) => {
            if (userData.isOnline) {
                chatStatus.textContent = 'متصل الآن';
                chatStatus.style.color = '#28a745'; // أخضر
            } else {
                chatStatus.textContent = `آخر ظهور: ${formatTime(userData.lastSeen)}`;
                chatStatus.style.color = '#6c757d'; // رمادي
            }
            // يمكن إضافة مؤشر الكتابة هنا لاحقاً
        });
    }

    loadMessages(chatId);
}

closeChatBtn.addEventListener('click', () => {
    chatContainer.classList.remove('active');
    chatsSection.classList.add('active'); // إعادة إظهار قسم الدردشات
    currentChatId = null;
    if (unsubscribeMessages) {
        unsubscribeMessages(); // تنظيف الـ listener عند إغلاق الدردشة
        unsubscribeMessages = null;
    }
    if (unsubscribeChatStatus) {
        unsubscribeChatStatus(); // تنظيف الـ listener لحالة المستخدم
        unsubscribeChatStatus = null;
    }
    messagesList.innerHTML = ''; // مسح الرسائل
    chatStatus.textContent = ''; // مسح الحالة
});

function displayMessages(messages) {
    messagesList.innerHTML = '';
    const messagesToMarkAsRead = []; // لتخزين IDs الرسائل غير المقروءة التي ظهرت
    let firstUnreadMessageId = null; // لتحديد أول رسالة غير مقروءة

    messages.forEach(message => {
        const messageItem = document.createElement('div');
        const isSentByCurrentUser = message.senderId === currentUser.uid;
        messageItem.className = `message-item ${isSentByCurrentUser ? 'sent' : 'received'}`;

        const senderUsername = message.senderUsername || 'مستخدم غير معروف';
        const senderProfilePic = message.userProfilePic || defaultAvatarUrl; // إذا كان متوفراً في الرسالة نفسها (لم يتم تضمينه حالياً)

        // للرسائل الواردة فقط التي لم يقرأها المستخدم الحالي
        if (!isSentByCurrentUser && !message.readBy[currentUser.uid]) {
            messagesToMarkAsRead.push(message.id);
            if (!firstUnreadMessageId) {
                firstUnreadMessageId = message.id; // تسجيل أول رسالة غير مقروءة
            }
        }

        // مؤشرات "تمت القراءة"
        let readStatusHtml = '';
        if (isSentByCurrentUser) {
            // تحقق مما إذا كانت قد قرأت بواسطة الطرف الآخر (فقط للمحادثات الفردية)
            // هذا يتطلب معرفة الطرف الآخر وتتبع إذا قرأ الرسالة
            // لتبسيط، سنعرض علامتي صح إذا كان هناك أي readBy غير المرسل نفسه
            const othersRead = Object.keys(message.readBy || {}).some(uid => uid !== currentUser.uid);
            readStatusHtml = `
                <div class="message-status">
                    <span class="check-icon ${othersRead ? 'read' : ''}">✓</span>
                    <span class="check-icon ${othersRead ? 'read' : ''}">✓</span>
                </div>
            `;
        }

        messageItem.innerHTML = `
            <img src="${senderProfilePic}" alt="صورة المرسل" class="message-avatar">
            <div class="message-content">
                ${!isSentByCurrentUser ? `<div class="message-sender">${senderUsername}</div>` : ''}
                <p>${message.content}</p>
                <div class="message-time">${formatTime(message.timestamp)}</div>
                ${readStatusHtml}
            </div>
        `;
        messagesList.prepend(messageItem); // إضافة الرسائل في الأعلى (لأننا نستخدم flex-direction: column-reverse)
    });

    // وضع خط فاصل "رسائل جديدة" عند أول رسالة غير مقروءة (إذا وجدت)
    if (firstUnreadMessageId) {
        const firstUnreadElement = messagesList.querySelector(`[data-message-id="${firstUnreadMessageId}"]`);
        if (firstUnreadElement) {
            const unreadDivider = document.createElement('div');
            unreadDivider.className = 'unread-divider';
            unreadDivider.textContent = 'رسائل جديدة';
            messagesList.insertBefore(unreadDivider, firstUnreadElement);
        }
    }

    // تمييز الرسائل التي ظهرت للمستخدم كـ "مقروءة" بعد عرضها
    if (messagesToMarkAsRead.length > 0 && currentUser) {
        markMessagesAsRead(currentChatId, messagesToMarkAsRead, currentUser.uid);
    }

    // التمرير لأسفل لآخر رسالة فقط عند فتح الدردشة أو إرسال رسالة جديدة بواسطة المستخدم
    // لضمان عدم القفز عند وصول رسالة جديدة والتحرك لأعلى
    if (messagesList.scrollTop === 0 || isScrollingDown) { // isScrollingDown يجب أن يتم تتبعه
         messagesList.scrollTop = messagesList.scrollHeight;
    }
}

function loadMessages(chatId) {
    if (unsubscribeMessages) {
        unsubscribeMessages(); // تنظيف الـ listener القديم
    }
    messagesList.innerHTML = '<div class="loading">جاري تحميل الرسائل...</div>';
    unsubscribeMessages = getMessages(chatId, displayMessages);
}

messageInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (content && currentChatId && currentUser) {
        sendMessageBtn.disabled = true; // تعطيل زر الإرسال
        sendMessageBtn.textContent = 'جاري الإرسال...';
        try {
            // الحصول على اسم المستخدم الحالي وصورته للأفاتار في الرسالة إذا لم يكن موجوداً
            const senderUsername = currentUserProfileData.username || currentUser.email.split('@')[0];
            const success = await sendMessage(currentChatId, currentUser.uid, senderUsername, content);
            if (success) {
                messageInput.value = ''; // مسح حقل الإدخال
                messageInput.style.height = 'auto'; // إعادة تعيين الارتفاع
                // الرسائل يتم تحميلها تلقائياً بواسطة onSnapshot
            } else {
                alert('فشل إرسال الرسالة.');
            }
        } catch (error) {
            alert('خطأ في إرسال الرسالة: ' + error.message);
        } finally {
            sendMessageBtn.disabled = false;
            sendMessageBtn.textContent = 'إرسال';
        }
    }
});

// توسيع مربع الإدخال تلقائياً
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Placeholder لزر الرسائل الصوتية
recordAudioBtn.addEventListener('click', () => {
    alert("وظيفة الرسائل الصوتية غير مطبقة بعد. تتطلب الوصول إلى الميكروفون.");
    // هنا يمكنك إضافة منطق لبدء تسجيل الصوت
});

// --- التنقل بين الأقسام ---
showPostsBtn.addEventListener('click', () => showSection('postsSection'));
showChatsBtn.addEventListener('click', () => showSection('chatsSection'));
showProfileBtn.addEventListener('click', () => showSection('profileSection'));


// الإعداد الأولي: عرض شاشة التحميل
loadingScreen.classList.add('active');

// وظيفة لتسجيل حالة المستخدم كمتصل عند تحميل التطبيق أو تحديثه
document.addEventListener('DOMContentLoaded', () => {
    if (auth.currentUser) {
        updateUserStatus(auth.currentUser.uid, true);
    }
});

// وظيفة لتسجيل حالة المستخدم كغير متصل عند إغلاق أو مغادرة الصفحة
window.addEventListener('beforeunload', async () => {
    if (auth.currentUser) {
        await updateUserStatus(auth.currentUser.uid, false);
    }
});