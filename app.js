// في ملف app.js
// يجب أن تكون auth, db, currentUser, defaultAvatarUrl معرفة من الملفات الأخرى

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
const profileEmail = document.getElementById('profileEmail'); // سيبقى مرئياً هنا
const postsCountSpan = document.getElementById('postsCount');
const editUsernameBtn = document.getElementById('editUsernameBtn');
const newUsernameInput = document.getElementById('newUsernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const profileImageUpload = document.getElementById('profileImageUpload');

// عناصر الدردشة
const searchUserInput = document.getElementById('searchUserInput');
const searchUserBtn = document.getElementById('searchUserBtn');
const searchResultsList = document.getElementById('searchResults');
const chatsList = document.getElementById('chatsList');
const chatContainer = document.getElementById('chatContainer');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatHeaderName = document.getElementById('chatHeaderName');
const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
const messagesList = document.getElementById('messagesList');
const messageInputForm = document.getElementById('messageInputForm');
const messageInput = document.getElementById('messageInput');

let currentChatId = null;
let unsubscribeMessages = null; // لتنظيف الـ listener عند تبديل الدردشة

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
}

// دالة لتنسيق التاريخ
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } else if (days > 0) {
        return `${days} يوم مضت`;
    } else if (hours > 0) {
        return `${hours} ساعة مضت`;
    } else if (minutes > 0) {
        return `${minutes} دقيقة مضت`;
    } else {
        return `الآن`;
    }
}

// --- وظائف قسم المنشورات ---
publishPostBtn.addEventListener('click', async () => {
    const content = postContentInput.value.trim();
    if (content) {
        try {
            await createPost(content);
            postContentInput.value = '';
            // المنشورات يتم تحميلها تلقائياً بسبب onSnapshot
        } catch (error) {
            alert('فشل نشر المنشور: ' + error.message);
        }
    } else {
        alert('الرجاء كتابة شيء لنشره.');
    }
});

function displayPosts(posts) {
    postsList.innerHTML = '';
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty">لا توجد منشورات حاليًا.</div>';
        return;
    }
    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.innerHTML = `
            <div class="post-header">
                <img src="${post.userProfilePic || defaultAvatarUrl}" alt="صورة الملف الشخصي" class="post-avatar">
                <span class="post-username">${post.username}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-footer">
                <span class="time">${formatDate(post.timestamp)}</span>
                <div class="likes">
                    <button class="like-btn" data-post-id="${post.id}">❤</button>
                    <span>${post.likesCount || 0}</span>
                </div>
            </div>
        `;
        postsList.appendChild(postItem);

        // إضافة مستمع لزر الإعجاب
        postItem.querySelector('.like-btn').addEventListener('click', async (e) => {
            if (currentUser) {
                const postId = e.target.dataset.postId;
                await toggleLike(postId, currentUser.uid);
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
        const user = doc.data();
        displayUserProfile(user);
    } else {
        console.log("No such user profile!");
        // في حال عدم وجود ملف شخصي، استخدم بيانات Firebase الأساسية
        profileUsername.textContent = currentUser.email.split('@')[0];
        profileEmail.textContent = currentUser.email;
        profileAvatar.src = defaultAvatarUrl;
        postsCountSpan.textContent = '0';
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
});

saveUsernameBtn.addEventListener('click', async () => {
    const newUsername = newUsernameInput.value.trim();
    if (newUsername && currentUser) {
        const success = await updateUsername(currentUser.uid, newUsername);
        if (success) {
            profileUsername.textContent = newUsername;
        } else {
            alert('فشل تحديث اسم المستخدم.');
        }
    } else {
        alert('الرجاء إدخال اسم مستخدم صالح.');
    }
    profileUsername.style.display = 'block';
    editUsernameBtn.style.display = 'block';
    newUsernameInput.style.display = 'none';
    saveUsernameBtn.style.display = 'none';
});

changeAvatarBtn.addEventListener('click', () => {
    profileImageUpload.click(); // يحفز النقر على input file المخفي
});

profileImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && currentUser) {
        // هنا يجب أن تدمج خدمة رفع الصور مثل Cloudinary
        // حالياً، لا يوجد دعم مباشر لرفع الصور هنا.
        // يجب أن تضيف كود رفع الصورة هنا والحصول على الـ URL
        // ثم تستخدم الـ URL مع دالة updateProfilePicture
        alert("وظيفة تغيير الصورة غير مدعومة حالياً. تحتاج إلى دمج خدمة رفع صور مثل Cloudinary.");
        // مثال (كود وهمي):
        // const imageUrl = await uploadImageToCloudinary(file);
        // if (imageUrl) {
        //     await updateProfilePicture(currentUser.uid, imageUrl);
        //     profileAvatar.src = imageUrl;
        // } else {
        //     alert('فشل رفع الصورة.');
        // }
    }
});


// --- وظائف قسم المحادثات ---

// بحث المستخدمين
searchUserBtn.addEventListener('click', async () => {
    const searchTerm = searchUserInput.value.trim();
    if (searchTerm) {
        searchResultsList.innerHTML = '<div class="loading">جاري البحث...</div>';
        const users = await searchUsers(searchTerm);
        searchResultsList.innerHTML = ''; // مسح النتائج السابقة
        if (users.length === 0) {
            searchResultsList.innerHTML = '<div class="empty">لا توجد نتائج بحث.</div>';
            return;
        }
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <img src="${user.profilePictureUrl || defaultAvatarUrl}" alt="صورة المستخدم" class="user-avatar">
                <h3>${user.username}</h3>
            `;
            userItem.addEventListener('click', async () => {
                // إنشاء أو فتح محادثة مع هذا المستخدم
                const chatId = await createChat([currentUser.uid, user.id]);
                if (chatId) {
                    openChat(chatId, user.username, user.profilePictureUrl, false); // false للمحادثات الفردية
                    searchResultsList.innerHTML = ''; // مسح نتائج البحث بعد فتح المحادثة
                    searchUserInput.value = ''; // مسح حقل البحث
                } else {
                    alert('فشل إنشاء/فتح المحادثة.');
                }
            });
            searchResultsList.appendChild(userItem);
        });
    } else {
        searchResultsList.innerHTML = ''; // مسح النتائج إذا كان حقل البحث فارغاً
    }
});


// تحميل قائمة المحادثات
async function loadChats() {
    if (!currentUser) return;

    chatsList.innerHTML = '<div class="loading">جاري تحميل الدردشات...</div>';

    // 1. الاستعلام عن الدردشات الفردية للمستخدم
    const personalChatsQuery = db.collection('chats')
      .where(`participants.${currentUser.uid}`, '==', true)
      .where('isGroup', '==', false) // للتأكد من أنها فردية
      .orderBy('lastMessageAt', 'desc');

    // 2. الاستعلام عن الدردشات العامة (التي لها publicChat: true)
    const publicChatQuery = db.collection('chats')
      .where('publicChat', '==', true)
      .orderBy('lastMessageAt', 'desc');

    // 3. الاستعلام عن قناة الأخبار (التي لها newsChannel: true)
    const newsChannelQuery = db.collection('chats')
      .where('newsChannel', '==', true)
      .orderBy('lastMessageAt', 'desc');

    let personalChats = [];
    let publicChats = [];
    let newsChats = [];
    let combinedChatsMap = new Map();

    const updateChatListUI = async () => {
        combinedChatsMap.clear();
        // الترتيب: الأخبار أولاً، ثم العامة، ثم الشخصية (يمكنك تعديل الترتيب كما تريد)
        [...newsChats, ...publicChats, ...personalChats].forEach(chat => {
            combinedChatsMap.set(chat.id, chat);
        });
        const combinedChats = Array.from(combinedChatsMap.values());

        chatsList.innerHTML = ''; // مسح القائمة

        if (combinedChats.length === 0) {
            chatsList.innerHTML = '<div class="empty">لا توجد دردشات حاليًا. ابدأ واحدة!</div>';
            return;
        }

        const chatPromises = combinedChats.map(async chatDoc => {
            const chat = chatDoc.data();
            const chatId = chatDoc.id;

            let chatName = chat.name || 'محادثة فردية';
            let chatAvatar = defaultAvatarUrl; // الصورة الافتراضية

            if (!chat.isGroup && !chat.publicChat && !chat.newsChannel) { // فقط للمحادثات الفردية
                const otherParticipantsIds = Object.keys(chat.participants).filter(uid => uid !== currentUser.uid);
                if (otherParticipantsIds.length > 0) {
                    const otherUserDoc = await getUserProfile(otherParticipantsIds[0]);
                    if (otherUserDoc.exists) {
                        const otherUser = otherUserDoc.data();
                        chatName = otherUser.username || 'مستخدم غير معروف';
                        chatAvatar = otherUser.profilePictureUrl || defaultAvatarUrl;
                    } else {
                        chatName = 'مستخدم غير معروف';
                    }
                }
            } else if (chat.publicChat) { // للدردشة العامة
                chatName = chat.name || 'الدردشة العامة';
                chatAvatar = 'https://via.placeholder.com/50/800080/FFFFFF?text=GC'; // أيقونة للدردشة العامة
            } else if (chat.newsChannel) { // لقناة الأخبار
                chatName = chat.name || 'الأخبار';
                chatAvatar = 'https://via.placeholder.com/50/FFD700/000000?text=NEWS'; // أيقونة للأخبار (ذهبي)
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
                <span class="time">${formatDate(chat.lastMessageAt)}</span>
            `;

            chatItem.addEventListener('click', () => {
                // نمرر isGroup كـ true للدردشات الجماعية مثل العامة/الأخبار لضبط واجهة الدردشة
                openChat(chatId, chatName, chatAvatar, chat.isGroup || chat.publicChat || chat.newsChannel, chat.newsChannel);
            });

            return chatItem;
        });

        const chatItems = await Promise.all(chatPromises);
        chatItems.forEach(item => chatsList.appendChild(item));
    };

    // الاشتراك في تحديثات الدردشات الشخصية
    personalChatsQuery.onSnapshot(async (snapshot) => {
        personalChats = snapshot.docs;
        await updateChatListUI();
    }, (error) => {
        console.error("Error loading personal chats:", error);
        chatsList.innerHTML = '<div class="empty">حدث خطأ أثناء تحميل الدردشات الشخصية.</div>';
    });

    // الاشتراك في تحديثات الدردشة العامة
    publicChatQuery.onSnapshot(async (snapshot) => {
        publicChats = snapshot.docs;
        await updateChatListUI();
    }, (error) => {
        console.error("Error loading public chat:", error);
    });

    // الاشتراك في تحديثات قناة الأخبار
    newsChannelQuery.onSnapshot(async (snapshot) => {
        newsChats = snapshot.docs;
        await updateChatListUI();
    }, (error) => {
        console.error("Error loading news channel:", error);
    });
}


function openChat(chatId, chatName, chatAvatar, isGroupChat, isNewsChannel = false) {
    currentChatId = chatId;
    chatHeaderName.textContent = chatName;
    chatHeaderAvatar.src = chatAvatar;
    chatContainer.classList.add('active');
    chatsSection.classList.remove('active'); // إخفاء قسم الدردشات بأكمله

    // عرض أو إخفاء حقل الرسائل بناءً على ما إذا كانت قناة أخبار
    if (isNewsChannel) {
        messageInputForm.style.display = 'none'; // إخفاء نموذج الإرسال
    } else {
        messageInputForm.style.display = 'flex'; // إظهاره للمحادثات الأخرى
    }

    loadMessages(chatId);
}

closeChatBtn.addEventListener('click', () => {
    chatContainer.classList.remove('active');
    chatsSection.classList.add('active'); // إعادة إظهار قسم الدردشات
    currentChatId = null;
    if (unsubscribeMessages) {
        unsubscribeMessages(); // تنظيف الـ listener عند إغلاق الدردشة
    }
    messagesList.innerHTML = ''; // مسح الرسائل
});

function displayMessages(messages) {
    messagesList.innerHTML = '';
    messages.forEach(async message => {
        const messageItem = document.createElement('div');
        messageItem.className = `message-item ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;

        const senderProfile = await getUserProfile(message.senderId);
        const senderData = senderProfile.exists ? senderProfile.data() : { username: 'مستخدم غير معروف', profilePictureUrl: defaultAvatarUrl };

        messageItem.innerHTML = `
            <img src="${senderData.profilePictureUrl || defaultAvatarUrl}" alt="صورة المرسل" class="message-avatar">
            <div class="message-content">
                <div class="message-sender">${message.senderUsername || senderData.username}</div>
                <p>${message.content}</p>
                <div class="message-time">${formatDate(message.timestamp)}</div>
            </div>
        `;
        messagesList.prepend(messageItem); // إضافة الرسائل في الأعلى (لأننا نستخدم flex-direction: column-reverse)
    });
    // التمرير لأسفل لآخر رسالة
    messagesList.scrollTop = messagesList.scrollHeight;
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
        const currentUserProfile = await getUserProfile(currentUser.uid);
        const username = currentUserProfile.exists ? currentUserProfile.data().username : currentUser.email.split('@')[0];
        const success = await sendMessage(currentChatId, currentUser.uid, username, content);
        if (success) {
            messageInput.value = ''; // مسح حقل الإدخال
            // الرسائل يتم تحميلها تلقائياً بواسطة onSnapshot
        } else {
            alert('فشل إرسال الرسالة.');
        }
    }
});

// --- التنقل بين الأقسام ---
showPostsBtn.addEventListener('click', () => showSection('postsSection'));
showChatsBtn.addEventListener('click', () => showSection('chatsSection'));
showProfileBtn.addEventListener('click', () => showSection('profileSection'));

// الإعداد الأولي: عرض شاشة التحميل
loadingScreen.classList.add('active');