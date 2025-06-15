// public/app.js

// عناصر واجهة المستخدم الرئيسية
const showPostsBtn = document.getElementById('showPostsBtn');
const showChatsBtn = document.getElementById('showChatsBtn');
const showAcquaintancesBtn = document.getElementById('showAcquaintancesBtn'); // زر المعارف
const showProfileBtn = document.getElementById('showProfileBtn');
const toggleDarkModeBtn = document.getElementById('toggleDarkModeBtn');

const postsSection = document.getElementById('postsSection');
const chatsSection = document.getElementById('chatsSection');
const acquaintancesSection = document.getElementById('acquaintancesSection'); // قسم المعارف
const profileSection = document.getElementById('profileSection');

// عناصر المنشورات
const postContentInput = document.getElementById('postContent');
const privatePostCheckbox = document.getElementById('privatePostCheckbox'); // صندوق تحديد منشور خاص
const publishPostBtn = document.getElementById('publishPostBtn');
const postsList = document.getElementById('postsList');
const refreshPostsBtn = document.getElementById('refreshPostsBtn');

// عناصر الملف الشخصي
const profileAvatar = document.getElementById('profileAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const postsCountSpan = document.getElementById('postsCount');
const acquaintancesCountSpan = document.getElementById('acquaintancesCount'); // عداد المعارف
const savedPostsCountSpan = document.getElementById('savedPostsCount'); // عداد المنشورات المحفوظة
const editUsernameBtn = document.getElementById('editUsernameBtn');
const newUsernameInput = document.getElementById('newUsernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const profileImageUpload = document.getElementById('profileImageUpload');
const profileStatusMessage = document.getElementById('profileStatusMessage');
const editStatusMessageBtn = document.getElementById('editStatusMessageBtn');
const privateProfileCheckbox = document.getElementById('privateProfileCheckbox'); // صندوق تحديد قفل الملف الشخصي
const savedPostsList = document.getElementById('savedPostsList'); // قائمة المنشورات المحفوظة

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
const chatStatus = document.getElementById('chatStatus');
const messagesList = document.getElementById('messagesList');
const messageInputForm = document.getElementById('messageInputForm');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const recordAudioBtn = document.getElementById('recordAudioBtn');
const emojiPickerBtn = document.getElementById('emojiPickerBtn');
const emojiPicker = document.getElementById('emojiPicker');

// عناصر قسم المتصلين الآن (الشريط الجانبي)
const onlineUsersSidebar = document.getElementById('onlineUsersSidebar');
const onlineUsersList = document.getElementById('onlineUsersList');
const onlineUsersCountSpan = document.getElementById('onlineUsersCount');

// متغيرات حالة التطبيق
let currentChatId = null;
let currentChatName = null;
let currentChatAvatar = null;
let isCurrentChatGroup = false;
let isCurrentChatNewsChannel = false;
let currentOtherParticipantId = null;

// إلغاء الاشتراكات في الوقت الفعلي
let unsubscribeMessages = null;
let unsubscribeChatStatus = null;
let unsubscribeTypingStatus = null;
let unsubscribeAcquaintances = null;
let unsubscribeOnlineUsers = null;
let unsubscribeSavedPosts = null;

// مؤقت حالة الكتابة
let typingTimer;
const TYPING_TIMEOUT = 3000; // 3 ثواني

// الإيموجي المستخدمة للتفاعلات على المنشورات
const REACTION_EMOJIS = {
    heart: '❤',
    tears: '😫',
    clown: '🤡',
    thumbsUp: '👍',
    thumbsDown: '👎'
};


// --- وظائف عامة للواجهة ---

/**
 * تبديل القسم النشط في الواجهة.
 * @param {string} sectionId - معرف القسم المراد إظهاره (مثلاً: 'postsSection').
 */
function showSection(sectionId) {
    // إخفاء جميع الأقسام أولاً
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    // إظهار القسم المطلوب
    document.getElementById(sectionId).classList.add('active');

    // تحديث حالة أزرار التنقل في الرأس (Nav Buttons)
    document.querySelectorAll('header nav .nav-button').forEach(btn => btn.classList.remove('active'));
    if (sectionId === 'postsSection') showPostsBtn.classList.add('active');
    else if (sectionId === 'chatsSection') showChatsBtn.classList.add('active');
    else if (sectionId === 'acquaintancesSection') showAcquaintancesBtn.classList.add('active');
    else if (sectionId === 'profileSection') showProfileBtn.classList.add('active');

    // إخفاء نتائج البحث عند التبديل بعيداً عن قسم الدردشات
    searchResultsList.innerHTML = '';
    searchUserInput.value = '';

    // إغلاق الدردشة المفتوحة إذا تم التبديل إلى قسم آخر غير الدردشات
    if (sectionId !== 'chatsSection' && chatContainer.classList.contains('active')) {
        closeChat();
    }
    // إخفاء لوحة الإيموجي
    emojiPicker.classList.remove('active');

    // تحميل البيانات الخاصة بالقسم عند التبديل إليه
    if (sectionId === 'postsSection') {
        loadPosts();
    } else if (sectionId === 'chatsSection') {
        loadChats();
    } else if (sectionId === 'profileSection') {
        if (currentUser) {
            loadUserProfile(currentUser.uid);
            loadSavedPosts(currentUser.uid); // تحميل المنشورات المحفوظة
        }
    } else if (sectionId === 'acquaintancesSection') {
        if (currentUser) {
            loadAcquaintances(); // تحميل قائمة المعارف
        }
    }
}

/**
 * تنسيق الوقت لعرضه بشكل نسبي (مثلاً: "5 دقائق مضت").
 * @param {firebase.firestore.Timestamp} timestamp - كائن Timestamp من Firestore.
 * @returns {string} - السلسلة الزمنية المنسقة.
 */
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'الآن';
    else if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} دقيقة مضت`;
    else if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} ساعة مضت`;
    else if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} يوم مضت`;
    else return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * تنسيق الوقت لعرضه بشكل دقيق (مثلاً: "اليوم، 10:30 ص").
 * @param {firebase.firestore.Timestamp} timestamp - كائن Timestamp من Firestore.
 * @returns {string} - السلسلة الزمنية المنسقة.
 */
function formatPreciseTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isToday) return `اليوم، ${time}`;
    else if (isYesterday) return `أمس، ${time}`;
    else return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) + `، ${time}`;
}

// تبديل الوضع الليلي/النهاري
toggleDarkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
});

// تطبيق الوضع الليلي عند تحميل الصفحة إذا كان مفعلاً سابقاً
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
}

// --- وظائف قسم المنشورات ---

/**
 * معالج لزر "نشر" المنشورات.
 */
publishPostBtn.addEventListener('click', async () => {
    const content = postContentInput.value.trim();
    if (!content) {
        alert('الرجاء كتابة شيء لنشره.');
        return;
    }

    publishPostBtn.disabled = true;
    publishPostBtn.textContent = 'جاري النشر...';
    
    try {
        const isPrivate = privatePostCheckbox.checked; // الحصول على حالة الخصوصية
        await createPost(content, isPrivate);
        postContentInput.value = '';
        privatePostCheckbox.checked = false; // إعادة تعيين حالة الخصوصية
        alert('تم نشر المنشور بنجاح!');
    } catch (error) {
        alert('فشل نشر المنشور: ' + error.message);
    } finally {
        publishPostBtn.disabled = false;
        publishPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر';
    }
});

/**
 * معالج لزر "تحديث" المنشورات.
 */
refreshPostsBtn.addEventListener('click', loadPosts);

/**
 * عرض قائمة المنشورات في الواجهة.
 * @param {Array<Object>} posts - مصفوفة من كائنات المنشورات.
 */
function displayPosts(posts) {
    postsList.innerHTML = ''; // مسح المنشورات القديمة
    
    if (posts.length === 0) {
        postsList.innerHTML = '<div class="empty">لا توجد منشورات حاليًا. كن أول من ينشر!</div>';
        return;
    }
    
    posts.forEach(post => {
        // منطق إخفاء المنشورات الخاصة عن غير المعارف أو غير صاحب المنشور
        const isMyPost = currentUser && post.userId === currentUser.uid;
        const isAcquaintance = currentUserProfileData && currentUserProfileData.acquaintances && currentUserProfileData.acquaintances[post.userId];
        
        if (post.isPrivate && !isMyPost && !isAcquaintance) {
            return; // تخطي عرض المنشور إذا كان خاصًا والمستخدم ليس صاحبه أو معرفًا له
        }

        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.setAttribute('data-post-id', post.id);

        // إنشاء أزرار التفاعل والإيموجي
        let reactionsHtml = '';
        const userSelectedReaction = post.userReactions?.[currentUser?.uid];
        for (const emojiType in REACTION_EMOJIS) {
            const isActive = userSelectedReaction === emojiType;
            reactionsHtml += `
                <button class="reaction-btn ${isActive ? 'active' : ''}" data-reaction-type="${emojiType}" data-post-id="${post.id}">
                    ${REACTION_EMOJIS[emojiType]} <span class="reaction-count">${post.reactions?.[emojiType] || 0}</span>
                </button>
            `;
        }

        postItem.innerHTML = `
            <div class="post-header">
                <img src="${post.userProfilePic || defaultAvatarUrl}" alt="صورة الملف الشخصي" class="post-avatar">
                <span class="post-username">${post.username}</span>
                ${isMyPost ? `
                    <div class="post-actions">
                        <button class="edit-post-btn" data-post-id="${post.id}">تعديل</button>
                        <button class="delete-post-btn" data-post-id="${post.id}">حذف</button>
                        <!-- زر جعل المنشور خاص يحتاج منطق إضافي لتغيير isPrivate -->
                    </div>
                ` : ''}
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-footer">
                <span class="time">${formatTime(post.timestamp)} ${post.editedAt ? '(معدّل)' : ''}</span>
                <div class="post-interactions">
                    <div class="reactions-container">
                        ${reactionsHtml}
                    </div>
                    <button class="comment-btn" data-post-id="${post.id}">
                        <i class="fas fa-comment-dots"></i> تعليقات (${post.commentsCount || 0})
                    </button>
                    <button class="save-post-btn" data-post-id="${post.id}" data-saved="${currentUserProfileData?.savedPosts?.[post.id] ? 'true' : 'false'}">
                        <i class="${currentUserProfileData?.savedPosts?.[post.id] ? 'fas' : 'far'} fa-bookmark"></i> حفظ
                    </button>
                </div>
            </div>
            <div class="comments-section" id="comments-${post.id}">
                <h4>التعليقات (<span class="comments-count">${post.commentsCount || 0}</span>)</h4>
                <div class="comment-input-area">
                    <textarea placeholder="اكتب تعليقًا..." data-post-id="${post.id}"></textarea>
                    <button class="primary-button add-comment-btn" data-post-id="${post.id}">
                        <i class="fas fa-plus"></i> إضافة تعليق
                    </button>
                </div>
                <div class="comments-list" id="commentsList-${post.id}">
                    <!-- التعليقات ستعرض هنا بواسطة JavaScript -->
                    <div class="empty">لا توجد تعليقات بعد.</div>
                </div>
            </div>
        `;
        postsList.appendChild(postItem);

        // إضافة مستمعي الأحداث للتفاعلات
        postItem.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (currentUser) {
                    const postId = e.currentTarget.dataset.postId;
                    const reactionType = e.currentTarget.dataset.reactionType;
                    try {
                        await addReaction(postId, currentUser.uid, reactionType);
                    } catch (error) {
                        alert(error.message);
                    }
                } else {
                    alert('الرجاء تسجيل الدخول للتفاعل مع المنشورات.');
                }
            });
        });

        // إضافة مستمعي الأحداث للتعليقات
        const commentInput = postItem.querySelector(`.comments-section textarea`);
        const addCommentButton = postItem.querySelector(`.add-comment-btn`);
        addCommentButton.addEventListener('click', async () => {
            const commentContent = commentInput.value.trim();
            if (commentContent && currentUser) {
                addCommentButton.disabled = true;
                addCommentButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // أيقونة تحميل
                try {
                    await addComment(post.id, currentUser.uid, currentUserProfileData.username, currentUserProfileData.profilePictureUrl, commentContent);
                    commentInput.value = '';
                } catch (error) {
                    alert('فشل إضافة التعليق: ' + error.message);
                } finally {
                    addCommentButton.disabled = false;
                    addCommentButton.innerHTML = '<i class="fas fa-plus"></i> إضافة تعليق';
                }
            } else if (!commentContent) {
                alert('الرجاء كتابة تعليق.');
            } else {
                alert('الرجاء تسجيل الدخول لإضافة تعليق.');
            }
        });

        // تحميل التعليقات للمنشور
        getComments(post.id, comments => {
            const commentsListElement = postItem.querySelector(`#commentsList-${post.id}`);
            commentsListElement.innerHTML = '';
            if (comments.length === 0) {
                commentsListElement.innerHTML = '<div class="empty">لا توجد تعليقات بعد.</div>';
            } else {
                comments.forEach(comment => {
                    const commentEl = document.createElement('div');
                    commentEl.className = 'comment-item';
                    commentEl.innerHTML = `
                        <img src="${comment.userProfilePic || defaultAvatarUrl}" alt="صورة التعليق" class="comment-avatar">
                        <div class="comment-content-wrapper">
                            <span class="comment-author">${comment.username}</span>
                            <p class="comment-text">${comment.content}</p>
                            <div class="comment-time">${formatTime(comment.timestamp)}</div>
                        </div>
                    `;
                    commentsListElement.appendChild(commentEl);
                });
            }
            postItem.querySelector('.comments-count').textContent = comments.length;
        });

        // أحداث أزرار إدارة المنشور (تعديل/حذف)
        if (isMyPost) {
            // زر التعديل
            postItem.querySelector('.edit-post-btn').addEventListener('click', () => {
                const currentContentElement = postItem.querySelector('.post-content');
                const originalContent = currentContentElement.textContent;

                const textarea = document.createElement('textarea');
                textarea.className = 'edit-post-textarea';
                textarea.value = originalContent;
                textarea.rows = 4;

                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'حفظ التعديل';
                saveBtn.className = 'primary-button';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'إلغاء';
                cancelBtn.className = 'secondary-button';

                // إخفاء المحتوى الحالي وعرض مربع النص والأزرار
                currentContentElement.style.display = 'none';
                postItem.querySelector('.post-actions').style.display = 'none';
                
                const footer = postItem.querySelector('.post-footer');
                footer.insertBefore(textarea, footer.firstChild);
                footer.appendChild(saveBtn);
                footer.appendChild(cancelBtn);

                saveBtn.addEventListener('click', async () => {
                    const newContent = textarea.value.trim();
                    if (newContent && currentUser) {
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                        try {
                            await updatePost(post.id, newContent, currentUser.uid);
                            alert('تم تعديل المنشور بنجاح.');
                            // إعادة تحديث الواجهة أو إعادة تحميل المنشورات
                            loadPosts();
                        } catch (error) {
                            alert('فشل تعديل المنشور: ' + error.message);
                        } finally {
                            saveBtn.disabled = false;
                            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديل';
                            // إخفاء عناصر التعديل واستعادة المحتوى الأصلي
                            textarea.remove();
                            saveBtn.remove();
                            cancelBtn.remove();
                            currentContentElement.style.display = 'block';
                            postItem.querySelector('.post-actions').style.display = 'flex';
                        }
                    } else {
                        alert('الرجاء كتابة محتوى صالح للمنشور.');
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    textarea.remove();
                    saveBtn.remove();
                    cancelBtn.remove();
                    currentContentElement.style.display = 'block';
                    postItem.querySelector('.post-actions').style.display = 'flex';
                });
            });

            // زر الحذف
            postItem.querySelector('.delete-post-btn').addEventListener('click', async () => {
                if (confirm('هل أنت متأكد أنك تريد حذف هذا المنشور؟ سيتم حذف جميع التعليقات أيضاً.')) {
                    try {
                        await deletePost(post.id, currentUser.uid);
                        alert('تم حذف المنشور بنجاح.');
                        // إعادة تحديث الواجهة أو إعادة تحميل المنشورات
                        loadPosts();
                    } catch (error) {
                        alert('فشل حذف المنشور: ' + error.message);
                    }
                }
            });
        }

        // زر حفظ المنشور
        const savePostButton = postItem.querySelector('.save-post-btn');
        const bookmarkIcon = savePostButton.querySelector('i');
        
        savePostButton.addEventListener('click', async () => {
            if (!currentUser) {
                alert('الرجاء تسجيل الدخول لحفظ المنشورات.');
                return;
            }
            try {
                if (savePostButton.dataset.saved === 'true') { // إذا كان محفوظاً
                    await unsavePost(currentUser.uid, post.id);
                    bookmarkIcon.classList.remove('fas');
                    bookmarkIcon.classList.add('far');
                    savePostButton.dataset.saved = 'false';
                    alert('تم إزالة حفظ المنشور.');
                } else { // إذا لم يكن محفوظاً
                    await savePost(currentUser.uid, post.id);
                    bookmarkIcon.classList.remove('far');
                    bookmarkIcon.classList.add('fas');
                    savePostButton.dataset.saved = 'true';
                    alert('تم حفظ المنشور بنجاح.');
                }
                // تحديث عداد المنشورات المحفوظة في الملف الشخصي
                loadUserProfile(currentUser.uid);
            } catch (error) {
                alert('فشل حفظ/إزالة حفظ المنشور: ' + error.message);
            }
        });
    });
}

/**
 * تحميل وعرض المنشورات في الواجهة.
 */
function loadPosts() {
    postsList.innerHTML = '<div class="loading">جاري تحميل المنشورات...</div>';
    getPosts(displayPosts);
}


// --- وظائف قسم الملف الشخصي ---

/**
 * تحميل وعرض بيانات الملف الشخصي للمستخدم.
 * @param {string} userId - معرف المستخدم.
 */
async function loadUserProfile(userId) {
    const doc = await getUserProfile(userId);
    if (doc.exists) {
        currentUserProfileData = doc.data(); // تحديث بيانات الملف الشخصي العالمية
        displayUserProfile(currentUserProfileData);
    } else {
        console.error("User profile not found for ID:", userId);
        // في حالة عدم وجود ملف شخصي، يتم التعامل معها في auth.js
        profileUsername.textContent = currentUser.email.split('@')[0];
        profileEmail.textContent = currentUser.email;
        profileAvatar.src = defaultAvatarUrl;
        postsCountSpan.textContent = '0';
        acquaintancesCountSpan.textContent = '0';
        savedPostsCountSpan.textContent = '0';
        profileStatusMessage.textContent = 'لا توجد حالة محددة.';
    }

    // إظهار/إخفاء زر إعدادات Firebase للمسؤولين
    if (isAdminUser()) {
        showSettingsBtn.style.display = 'block';
        populateFirebaseConfigInputs();
    } else {
        showSettingsBtn.style.display = 'none';
        settingsCard.style.display = 'none';
    }
}

/**
 * عرض بيانات الملف الشخصي في الواجهة.
 * @param {Object} user - كائن بيانات المستخدم من Firestore.
 */
function displayUserProfile(user) {
    profileUsername.textContent = user.username || 'مستخدم جديد';
    profileEmail.textContent = user.email || 'لا يوجد بريد إلكتروني';
    profileAvatar.src = user.profilePictureUrl || defaultAvatarUrl;
    postsCountSpan.textContent = user.postsCount || 0;
    // عدد المعارف يتم جلبه من حقل `acquaintances` في Firestore
    acquaintancesCountSpan.textContent = Object.keys(user.acquaintances || {}).length || 0; 
    savedPostsCountSpan.textContent = Object.keys(user.savedPosts || {}).length || 0;
    profileStatusMessage.textContent = user.statusMessage || 'لا توجد حالة محددة.';
    privateProfileCheckbox.checked = user.isProfilePrivate || false;
}

// معالجات أحداث تعديل اسم المستخدم
editUsernameBtn.addEventListener('click', () => {
    profileUsername.style.display = 'none';
    editUsernameBtn.style.display = 'none';
    newUsernameInput.style.display = 'block';
    saveUsernameBtn.style.display = 'block';
    newUsernameInput.value = profileUsername.textContent;
    newUsernameInput.focus();
});

saveUsernameBtn.addEventListener('click', async () => {
    const newUsername = newUsernameInput.value.trim();
    if (newUsername && currentUser) {
        if (newUsername === currentUserProfileData.username) {
            alert('الاسم الجديد هو نفس الاسم الحالي.');
            profileUsername.style.display = 'block';
            editUsernameBtn.style.display = 'block';
            newUsernameInput.style.display = 'none';
            saveUsernameBtn.style.display = 'none';
            return;
        }

        saveUsernameBtn.disabled = true;
        saveUsernameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        try {
            const success = await updateUsername(currentUser.uid, newUsername);
            if (success) {
                profileUsername.textContent = newUsername;
                currentUserProfileData.username = newUsername; // تحديث البيانات المحلية
                alert('تم تحديث اسم المستخدم بنجاح.');
            }
        } catch (error) {
            alert('خطأ: ' + error.message);
        } finally {
            saveUsernameBtn.disabled = false;
            saveUsernameBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الاسم';
            profileUsername.style.display = 'block';
            editUsernameBtn.style.display = 'block';
            newUsernameInput.style.display = 'none';
            saveUsernameBtn.style.display = 'none';
        }
    } else {
        alert('الرجاء إدخال اسم مستخدم صالح.');
    }
});

// معالج حدث لتعديل حالة المزاج
editStatusMessageBtn.addEventListener('click', async () => {
    const currentStatus = currentUserProfileData.statusMessage || '';
    const newStatus = prompt('أدخل حالة المزاج الجديدة:', currentStatus);
    if (newStatus !== null && newStatus.trim() !== currentStatus.trim()) {
        try {
            await updateStatusMessage(currentUser.uid, newStatus.trim());
            profileStatusMessage.textContent = newStatus.trim();
            currentUserProfileData.statusMessage = newStatus.trim();
            alert('تم تحديث حالة المزاج بنجاح.');
        } catch (error) {
            alert('فشل تحديث حالة المزاج: ' + error.message);
        }
    }
});

// معالج حدث لتغيير صورة الملف الشخصي
changeAvatarBtn.addEventListener('click', () => {
    profileImageUpload.click(); // يحفز النقر على حقل إدخال الملف المخفي
});

profileImageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && currentUser) {
        alert("وظيفة تغيير الصورة غير مدعومة مباشرة من خلال Firebase Free Tier لهذا السياق. تحتاج لخدمة رفع خارجية (مثل Imgur للحصول على رابط مباشر) أو Firebase Storage.");
        // مثال: يمكنك استخدام خدمة خارجية لرفع الصورة والحصول على رابط لها:
        // const imageUrl = await uploadImageToExternalService(file);
        // if (imageUrl) {
        //     await updateProfilePicture(currentUser.uid, imageUrl);
        //     profileAvatar.src = imageUrl; // تحديث فوري للواجهة
        //     currentUserProfileData.profilePictureUrl = imageUrl; // تحديث البيانات المحلية
        //     alert('تم تحديث صورة الملف الشخصي بنجاح.');
        // } else {
        //     alert('فشل رفع الصورة.');
        // }
    }
});

// معالج حدث لتبديل خصوصية الملف الشخصي
privateProfileCheckbox.addEventListener('change', async () => {
    if (!currentUser) return;
    const isPrivate = privateProfileCheckbox.checked;
    try {
        await toggleProfilePrivacy(currentUser.uid, isPrivate);
        currentUserProfileData.isProfilePrivate = isPrivate; // تحديث البيانات المحلية
        alert(`تم ${isPrivate ? 'قفل' : 'إلغاء قفل'} ملفك الشخصي بنجاح.`);
    } catch (error) {
        alert('فشل تغيير خصوصية الملف الشخصي: ' + error.message);
    }
});

/**
 * تحميل وعرض المنشورات المحفوظة للمستخدم.
 * @param {string} userId - معرف المستخدم.
 */
function loadSavedPosts(userId) {
    if (unsubscribeSavedPosts) {
        unsubscribeSavedPosts(); // إلغاء الاشتراك السابق لتجنب التكرار
    }
    savedPostsList.innerHTML = '<div class="loading">جاري تحميل المنشورات المحفوظة...</div>';
    unsubscribeSavedPosts = getSavedPosts(userId, (posts) => {
        savedPostsList.innerHTML = '';
        if (posts.length === 0) {
            savedPostsList.innerHTML = '<div class="empty">لا توجد منشورات محفوظة.</div>';
            savedPostsCountSpan.textContent = '0';
            return;
        }
        savedPostsCountSpan.textContent = posts.length;
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
                    <span class="time">${formatTime(post.timestamp)}</span>
                    <button class="save-post-btn saved" data-post-id="${post.id}" data-saved="true">
                        <i class="fas fa-bookmark"></i> إزالة حفظ
                    </button>
                </div>
            `;
            savedPostsList.appendChild(postItem);

            // معالج لزر إزالة الحفظ
            postItem.querySelector('.save-post-btn').addEventListener('click', async (e) => {
                if (!currentUser) return;
                const postId = e.currentTarget.dataset.postId;
                try {
                    await unsavePost(currentUser.uid, postId);
                    alert('تم إزالة حفظ المنشور.');
                    // سيتم تحديث القائمة تلقائياً عبر listener لـ getSavedPosts
                } catch (error) {
                    alert('فشل إزالة حفظ المنشور: ' + error.message);
                }
            });
        });
    });
}


// --- وظائف إعدادات Firebase (للمسؤولين فقط) ---

showSettingsBtn.addEventListener('click', () => {
    if (isAdminUser()) {
        settingsCard.style.display = settingsCard.style.display === 'none' ? 'block' : 'none';
        if (settingsCard.style.display === 'block') {
            populateFirebaseConfigInputs();
        }
    } else {
        alert("ليس لديك صلاحية الوصول إلى هذه الإعدادات.");
    }
});

/**
 * ملء حقول إعدادات Firebase في الواجهة بقيمها الحالية.
 */
function populateFirebaseConfigInputs() {
    apiKeyInput.value = firebaseConfig.apiKey || '';
    authDomainInput.value = firebaseConfig.authDomain || '';
    databaseURLInput.value = firebaseConfig.databaseURL || '';
    projectIdInput.value = firebaseConfig.projectId || '';
    storageBucketInput.value = firebaseConfig.storageBucket || '';
    messagingSenderIdInput.value = firebaseConfig.messagingSenderId || '';
    appIdInput.value = firebaseConfig.appId || '';
    firebaseConfigMessage.textContent = '';
}

/**
 * معالج لزر "حفظ إعدادات Firebase".
 */
saveFirebaseConfigBtn.addEventListener('click', () => {
    if (!isAdminUser()) {
        firebaseConfigMessage.textContent = 'ليس لديك صلاحية لتعديل الإعدادات.';
        firebaseConfigMessage.style.color = 'var(--error-color)';
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

    const hasEmptyField = Object.values(newConfig).some(val => val === '');
    if (hasEmptyField) {
        firebaseConfigMessage.style.color = 'var(--error-color)';
        firebaseConfigMessage.textContent = 'الرجاء ملء جميع حقول إعدادات Firebase المطلوبة.';
        return;
    }

    saveFirebaseConfigBtn.disabled = true;
    saveFirebaseConfigBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
        const success = updateFirebaseConfig(newConfig); // دالة من firebase-config.js
        if (success) {
            firebaseConfigMessage.style.color = 'var(--primary-color)';
            firebaseConfigMessage.textContent = 'تم حفظ إعدادات Firebase بنجاح! يرجى إعادة تحميل الصفحة لتطبيق التغييرات.';
        } else {
            firebaseConfigMessage.style.color = 'var(--error-color)';
            firebaseConfigMessage.textContent = 'فشل حفظ الإعدادات. تحقق من القيم المدخلة.';
        }
    } catch (error) {
        firebaseConfigMessage.style.color = 'var(--error-color)';
        firebaseConfigMessage.textContent = 'خطأ أثناء حفظ الإعدادات: ' + error.message;
        console.error("Error saving Firebase config:", error);
    } finally {
        saveFirebaseConfigBtn.disabled = false;
        saveFirebaseConfigBtn.innerHTML = '<i class="fas fa-save"></i> حفظ إعدادات Firebase';
    }
});


// --- وظائف قسم المعارف (Acquaintances) ---

showAcquaintancesBtn.addEventListener('click', () => showSection('acquaintancesSection'));
refreshAcquaintancesBtn.addEventListener('click', loadAcquaintances);

/**
 * تحميل وعرض قائمة المعارف للمستخدم الحالي.
 */
function loadAcquaintances() {
    if (!currentUser) {
        acquaintancesList.innerHTML = '<div class="empty">الرجاء تسجيل الدخول لعرض المعارف.</div>';
        acquaintancesCountSpan.textContent = '0';
        return;
    }

    acquaintancesList.innerHTML = '<div class="loading">جاري تحميل المعارف...</div>';

    if (unsubscribeAcquaintances) {
        unsubscribeAcquaintances(); // إلغاء الاشتراك السابق
    }

    unsubscribeAcquaintances = getAcquaintances(currentUser.uid, (acquaintances) => {
        acquaintancesList.innerHTML = '';
        if (acquaintances.length === 0) {
            acquaintancesList.innerHTML = '<div class="empty">لا توجد لديك معارف بعد.</div>';
            acquaintancesCountSpan.textContent = '0';
            return;
        }

        acquaintancesCountSpan.textContent = acquaintances.length;
        acquaintances.forEach(acquaintance => {
            const acquaintanceItem = document.createElement('div');
            acquaintanceItem.className = 'user-item card'; // استخدام نفس تصميم بطاقة المستخدم
            acquaintanceItem.innerHTML = `
                <img src="${acquaintance.profilePictureUrl || defaultAvatarUrl}" alt="صورة المعرف" class="user-avatar">
                <div class="user-info">
                    <h3>${acquaintance.username}</h3>
                    <!-- لا نعرض البريد الإلكتروني هنا -->
                </div>
                <button class="secondary-button remove-acquaintance-btn" data-acquaintance-id="${acquaintance.id}">
                    <i class="fas fa-user-minus"></i> إزالة
                </button>
            `;
            acquaintancesList.appendChild(acquaintanceItem);

            // معالج زر إزالة المعارف
            acquaintanceItem.querySelector('.remove-acquaintance-btn').addEventListener('click', async (e) => {
                const targetAcquaintanceId = e.currentTarget.dataset.acquaintanceId;
                const confirmRemoval = confirm(`هل أنت متأكد أنك تريد إزالة ${acquaintance.username} من معارفك؟`);
                if (confirmRemoval) {
                    try {
                        await removeAcquaintance(currentUser.uid, targetAcquaintanceId);
                        alert(`تم إزالة ${acquaintance.username} من معارفك.`);
                        // loadAcquaintances(); // المستمع سيحدث القائمة تلقائيا
                    } catch (error) {
                        alert('فشل إزالة المعرف: ' + error.message);
                    }
                }
            });
            // إضافة حدث لفتح الملف الشخصي عند النقر على عنصر المعرف (يمكن تطويره لاحقاً لعرض ملفات شخصية عامة)
            acquaintanceItem.addEventListener('click', (e) => {
                // منع فتح الملف الشخصي إذا تم النقر على زر الإزالة
                if (!e.target.closest('.remove-acquaintance-btn')) {
                    alert(`ستفتح صفحة الملف الشخصي للمعرف ${acquaintance.username} هنا. (ميزة قيد التطوير)`);
                    // يمكنك هنا استدعاء دالة لفتح ملف شخصي عام: مثلاً showPublicProfile(acquaintance.id);
                }
            });
        });
    });
}


// --- وظائف قسم المتصلين الآن (الشريط الجانبي) ---

/**
 * تحميل وعرض قائمة المستخدمين المتصلين حاليا.
 */
function loadOnlineUsers() {
    if (!currentUser) {
        onlineUsersList.innerHTML = '<div class="empty">الرجاء تسجيل الدخول لعرض المتصلين.</div>';
        onlineUsersCountSpan.textContent = '(0)';
        return;
    }

    onlineUsersList.innerHTML = '<div class="loading">جاري تحميل المتصلين...</div>';

    if (unsubscribeOnlineUsers) {
        unsubscribeOnlineUsers(); // إلغاء الاشتراك السابق
    }

    unsubscribeOnlineUsers = getOnlineUsers((users) => {
        onlineUsersList.innerHTML = '';
        // تصفية المستخدم الحالي من قائمة المتصلين
        const filteredUsers = users.filter(user => user.id !== currentUser.uid);
        onlineUsersCountSpan.textContent = `(${filteredUsers.length})`;

        if (filteredUsers.length === 0) {
            onlineUsersList.innerHTML = '<div class="empty">لا يوجد متصلون آخرون حاليًا.</div>';
            return;
        }

        filteredUsers.forEach(user => {
            const userItem = document.createElement('li');
            userItem.innerHTML = `
                <span class="status-indicator online"></span>
                <img src="${user.profilePictureUrl || defaultAvatarUrl}" alt="صورة ${user.username}" class="online-avatar">
                <span>${user.username}</span>
            `;
            userItem.addEventListener('click', async () => {
                // عند النقر على مستخدم متصل، افتح محادثة معه
                if (currentUser && currentUser.uid !== user.id) {
                    try {
                        const chatId = await createChat([currentUser.uid, user.id]);
                        if (chatId) {
                            openChat(chatId, user.username, user.profilePictureUrl, false, false, user.id);
                            showSection('chatsSection'); // الانتقال لقسم الدردشات وفتح الدردشة
                        } else {
                            alert('فشل بدء المحادثة.');
                        }
                    } catch (error) {
                        alert('خطأ في بدء المحادثة: ' + error.message);
                    }
                }
            });
            onlineUsersList.appendChild(userItem);
        });
    });
}


// --- وظائف قسم الدردشات ---

/**
 * معالج لزر البحث عن المستخدمين.
 */
searchUserBtn.addEventListener('click', async () => {
    const searchTerm = searchUserInput.value.trim();
    if (!searchTerm) {
        searchResultsList.innerHTML = '';
        return;
    }

    searchResultsList.innerHTML = '<div class="loading">جاري البحث عن مستخدمين...</div>';
    
    try {
        const users = await searchUsers(searchTerm); // البريد الإلكتروني مخفي من firestore.js
        searchResultsList.innerHTML = '';
        
        if (users.length === 0) {
            searchResultsList.innerHTML = '<div class="empty">لا توجد نتائج بحث مطابقة.</div>';
            return;
        }
        
        users.forEach(user => {
            if (user.id === currentUser.uid) return; // لا تعرض المستخدم الحالي في نتائج البحث
            
            const userItem = document.createElement('div');
            userItem.className = 'user-item card';
            userItem.innerHTML = `
                <img src="${user.profilePictureUrl || defaultAvatarUrl}" alt="صورة المستخدم" class="user-avatar">
                <div class="user-info">
                    <h3>${user.username}</h3>
                </div>
                <button class="primary-button add-acquaintance-btn" data-user-id="${user.id}">
                    <i class="fas fa-user-plus"></i> إضافة كمعرف
                </button>
            `;
            searchResultsList.appendChild(userItem);

            // معالج لزر "إضافة كمعرف"
            userItem.querySelector('.add-acquaintance-btn').addEventListener('click', async (e) => {
                const userIdToAdd = e.currentTarget.dataset.userId;
                if (currentUser && currentUser.uid !== userIdToAdd) {
                    try {
                        await sendAcquaintanceRequest(currentUser.uid, userIdToAdd);
                        alert(`تمت إضافة ${user.username} كمعرف بنجاح!`);
                        // تحديث بيانات الملف الشخصي ليعكس التغيير
                        loadUserProfile(currentUser.uid); 
                        e.currentTarget.disabled = true; // تعطيل الزر
                        e.currentTarget.innerHTML = '<i class="fas fa-check"></i> تمت الإضافة';
                    } catch (error) {
                        alert('فشل إضافة المعرف: ' + error.message);
                    }
                } else if (currentUser.uid === userIdToAdd) {
                    alert('لا يمكنك إضافة نفسك كمعرف.');
                } else {
                    alert('الرجاء تسجيل الدخول لإضافة المعارف.');
                }
            });

            // معالج للنقر على عنصر المستخدم لفتح محادثة (ما عدا زر الإضافة)
            userItem.addEventListener('click', async (e) => {
                // تأكد أن النقر لم يكن على زر الإضافة
                if (e.target.closest('.add-acquaintance-btn')) return;

                if (!currentUser) {
                    alert('الرجاء تسجيل الدخول لبدء محادثة.');
                    return;
                }
                if (currentUser.uid === user.id) {
                    alert('لا يمكنك بدء محادثة مع نفسك.');
                    return;
                }
                // مسح نتائج البحث بعد اختيار مستخدم
                searchResultsList.innerHTML = '';
                searchUserInput.value = '';

                try {
                    const chatId = await createChat([currentUser.uid, user.id]);
                    if (chatId) {
                        openChat(chatId, user.username || user.email.split('@')[0], user.profilePictureUrl, false, false, user.id);
                    } else {
                        alert('فشل إنشاء/فتح المحادثة.');
                    }
                } catch (error) {
                    alert('خطأ في بدء المحادثة: ' + error.message);
                }
            });
        });
    } catch (error) {
        console.error("Search users error:", error);
        searchResultsList.innerHTML = `<div class="error-message">حدث خطأ أثناء البحث: ${error.message}</div>`;
    }
});

/**
 * تحميل وعرض قائمة الدردشات التي يشارك فيها المستخدم.
 */
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
            const chat = chatDoc;
            const chatId = chat.id;

            let chatName = chat.name || 'محادثة فردية';
            let chatAvatar = defaultAvatarUrl;
            let isGroup = chat.isGroup || false; // استخدام isGroup من Firestore
            let isNewsChannel = chat.newsChannel || false;
            let otherParticipantId = null;

            // تحديد الاسم والصورة للدردشات العامة والخاصة
            if (chat.publicChat) {
                chatName = 'الدردشة العامة';
                chatAvatar = 'https://via.placeholder.com/50/800080/FFFFFF?text=GC'; // أيقونة للدردشة العامة
            } else if (chat.newsChannel) {
                chatName = 'إعلانات الأخبار';
                chatAvatar = 'https://via.placeholder.com/50/FFD700/000000?text=NEWS'; // أيقونة لقناة الأخبار
            } else if (chat.publicGroup) {
                 chatName = 'المحادثة الجماعية العامة';
                 chatAvatar = 'https://via.placeholder.com/50/008080/FFFFFF?text=ALL'; // أيقونة للمجموعة العامة
            }
             else if (!isGroup) {
                // للدردشات الفردية، ابحث عن المشارك الآخر
                const otherParticipantsIds = Object.keys(chat.participants).filter(uid => uid !== currentUser.uid);
                if (otherParticipantsIds.length > 0) {
                    otherParticipantId = otherParticipantsIds[0];
                    try {
                        const otherUserDoc = await getUserProfile(otherParticipantId);
                        if (otherUserDoc.exists) {
                            const otherUser = otherUserDoc.data();
                            chatName = otherUser.username || 'مستخدم غير معروف';
                            chatAvatar = otherUser.profilePictureUrl || defaultAvatarUrl;
                        } else {
                            chatName = 'مستخدم غير معروف';
                            chatAvatar = defaultAvatarUrl;
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
            if (chatId === currentChatId) {
                chatItem.classList.add('active'); // تمييز الدردشة النشطة
            }
            chatItem.setAttribute('data-chat-id', chatId);

            // هنا يمكنك إضافة منطق لعداد الرسائل غير المقروءة إذا كان متاحًا في بيانات الدردشة
            const unreadCount = 0; // تحتاج إلى جلب هذا من Firestore
            const unreadBadge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';

            chatItem.innerHTML = `
                <img src="${chatAvatar}" alt="صورة الدردشة" class="chat-avatar">
                <div class="chat-item-content">
                    <h3>${chatName}</h3>
                    <p class="last-message">${chat.lastMessage || 'ابدأ محادثتك الأولى!'}</p>
                </div>
                <span class="time">${formatTime(chat.lastMessageAt)}</span>
                ${unreadBadge}
            `;

            chatItem.addEventListener('click', () => {
                openChat(chatId, chatName, chatAvatar, isGroup, isNewsChannel, otherParticipantId);
            });
            return chatItem;
        });

        const chatItems = await Promise.all(chatItemsPromises);
        chatItems.forEach(item => chatsList.appendChild(item));

        // التأكد من أن الدردشة النشطة حالياً تظل مميزة بعد إعادة تحميل القائمة
        if (currentChatId) {
            const activeChatItem = chatsList.querySelector(`[data-chat-id="${currentChatId}"]`);
            if (activeChatItem) {
                activeChatItem.classList.add('active');
            }
        }
    });
}

/**
 * فتح دردشة معينة وعرض رسائلها.
 * @param {string} chatId - معرف الدردشة.
 * @param {string} chatName - اسم الدردشة.
 * @param {string} chatAvatar - رابط صورة الدردشة.
 * @param {boolean} isGroupChat - هل هي دردشة جماعية؟
 * @param {boolean} isNewsChannel - هل هي قناة أخبار (للقراءة فقط)؟
 * @param {string} [otherId=null] - معرف المشارك الآخر في الدردشة الفردية.
 */
function openChat(chatId, chatName, chatAvatar, isGroupChat, isNewsChannel = false, otherId = null) {
    currentChatId = chatId;
    currentChatName = chatName;
    currentChatAvatar = chatAvatar;
    isCurrentChatGroup = isGroupChat;
    isCurrentChatNewsChannel = isNewsChannel;
    currentOtherParticipantId = otherId;

    chatHeaderName.textContent = chatName;
    chatHeaderAvatar.src = chatAvatar;
    chatContainer.classList.add('active'); // إظهار حاوية الدردشة
    chatsSection.classList.remove('active'); // إخفاء الشريط الجانبي للمحادثات على الموبايل

    // إزالة تمييز الدردشة النشطة السابقة وإضافة تمييز للدردشة الحالية
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const activeChatItem = chatsList.querySelector(`[data-chat-id="${chatId}"]`);
    if (activeChatItem) {
        activeChatItem.classList.add('active');
    }

    // إظهار/إخفاء مربع إدخال الرسائل بناءً على نوع الدردشة (قناة أخبار للقراءة فقط)
    if (isNewsChannel && !isAdminUser()) { // فقط المسؤول يمكنه الكتابة في قناة الأخبار
        messageInputForm.style.display = 'none';
    } else {
        messageInputForm.style.display = 'flex';
    }

    // إلغاء اشتراكات حالة الدردشة السابقة
    if (unsubscribeChatStatus) {
        unsubscribeChatStatus();
    }
    if (unsubscribeTypingStatus) {
        unsubscribeTypingStatus();
    }
    chatStatus.textContent = ''; // مسح حالة الدردشة القديمة

    // الاستماع لحالة المستخدم الآخر (متصل/آخر ظهور) وحالة الكتابة في الدردشات الفردية
    if (!isGroupChat && otherId) {
        unsubscribeChatStatus = listenToUserStatus(otherId, (userData) => {
            if (userData.isOnline) {
                chatStatus.textContent = 'متصل الآن';
                chatStatus.style.color = 'var(--online-indicator-color)';
            } else {
                chatStatus.textContent = `آخر ظهور: ${formatPreciseTime(userData.lastSeen)}`;
                chatStatus.style.color = 'var(--text-light-color)';
            }
        });
        unsubscribeTypingStatus = listenToTypingStatus(chatId, otherId, (isTyping) => {
            if (isTyping) {
                chatStatus.textContent = 'يكتب الآن...';
                chatStatus.style.color = 'var(--primary-color)'; // لون مميز للكتابة
            } else if (chatStatus.textContent === 'يكتب الآن...') {
                // إذا توقف عن الكتابة، أعد عرض حالة الاتصال الأصلية
                if (unsubscribeChatStatus) { // أعد الاشتراك في مستمع الحالة ليعود للعرض الطبيعي
                    unsubscribeChatStatus();
                }
                unsubscribeChatStatus = listenToUserStatus(otherId, (userData) => {
                    if (userData.isOnline) {
                        chatStatus.textContent = 'متصل الآن';
                        chatStatus.style.color = 'var(--online-indicator-color)';
                    } else {
                        chatStatus.textContent = `آخر ظهور: ${formatPreciseTime(userData.lastSeen)}`;
                        chatStatus.style.color = 'var(--text-light-color)';
                    }
                });
            }
        });
    }

    loadMessages(chatId); // تحميل الرسائل للدردشة المفتوحة
}

/**
 * إغلاق حاوية الدردشة والعودة إلى قائمة الدردشات.
 */
function closeChat() {
    chatContainer.classList.remove('active');
    chatsSection.classList.add('active'); // إظهار الشريط الجانبي للمحادثات
    
    // إلغاء جميع الاشتراكات المتعلقة بالدردشة الحالية
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    if (unsubscribeChatStatus) {
        unsubscribeChatStatus();
        unsubscribeChatStatus = null;
    }
    if (unsubscribeTypingStatus) {
        unsubscribeTypingStatus();
        unsubscribeTypingStatus = null;
    }
    
    messagesList.innerHTML = ''; // مسح الرسائل من الواجهة
    chatStatus.textContent = '';
    currentChatId = null; // مسح معرف الدردشة الحالي
    currentChatName = null;
    currentChatAvatar = null;
    isCurrentChatGroup = false;
    isCurrentChatNewsChannel = false;
    currentOtherParticipantId = null;
}

closeChatBtn.addEventListener('click', closeChat);

/**
 * عرض رسائل الدردشة في الواجهة.
 * @param {Array<Object>} messages - مصفوفة من كائنات الرسائل.
 */
function displayMessages(messages) {
    messagesList.innerHTML = '';
    const messagesToMarkAsRead = [];
    let firstUnreadMessageId = null; // لتحديد مكان فاصل "رسائل جديدة"

    // عرض الرسائل بترتيب زمني صحيح (الأقدم في الأعلى، الأحدث في الأسفل)
    // Firestore يرجعها هنا descending، لذا يجب عكسها أو استخدام flex-direction: column-reverse
    // لقد قمنا بالفعل بتعيين flex-direction: column-reverse في CSS، لذا نضيفها مباشرة.

    messages.forEach(message => {
        const messageItem = document.createElement('div');
        const isSentByCurrentUser = message.senderId === currentUser.uid;
        messageItem.className = `message-item ${isSentByCurrentUser ? 'sent' : 'received'}`;
        messageItem.setAttribute('data-message-id', message.id);

        const senderUsername = message.senderUsername || 'مستخدم غير معروف';
        // لا يوجد حقل userProfilePic في كائن الرسالة، لذا نستخدم defaultAvatarUrl
        const senderProfilePic = defaultAvatarUrl;

        // تحديد الرسائل غير المقروءة لتمييزها (للمستقبل فقط)
        if (!isSentByCurrentUser && !(message.readBy && message.readBy[currentUser.uid])) {
            messagesToMarkAsRead.push(message.id);
            if (!firstUnreadMessageId) {
                firstUnreadMessageId = message.id; // أول رسالة غير مقروءة
            }
        }

        // عرض علامات الصح للرسائل المرسلة (تم الإرسال / تم القراءة)
        let readStatusHtml = '';
        if (isSentByCurrentUser) {
            // تحقق مما إذا كان هناك مشاركون آخرون في الدردشة
            const otherParticipantsIds = Object.keys(currentChatId === PUBLIC_GROUP_CHAT_ID ? {} : (isCurrentChatGroup ? {} : chatHeaderName.dataset.participants || {})).filter(id => id !== currentUser.uid);
            
            // ببساطة، إذا لم تكن دردشة جماعية وكان هناك طرف آخر وقرأ الرسالة
            const otherUserRead = (message.readBy && currentOtherParticipantId && message.readBy[currentOtherParticipantId]);
            
            // تحقق مزدوج (✓✓) عندما يقرأ الطرف الآخر
            readStatusHtml = `
                <div class="message-status">
                    <span class="check-icon fas fa-check ${otherUserRead ? 'read' : ''}"></span>
                    <span class="check-icon fas fa-check ${otherUserRead ? 'read' : ''}"></span>
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
        messagesList.appendChild(messageItem);
    });

    // إضافة فاصل "رسائل جديدة" إذا كان هناك رسائل غير مقروءة
    if (firstUnreadMessageId) {
        const firstUnreadElement = messagesList.querySelector(`[data-message-id="${firstUnreadMessageId}"]`);
        if (firstUnreadElement) {
            const unreadDivider = document.createElement('div');
            unreadDivider.className = 'unread-divider';
            unreadDivider.textContent = 'رسائل جديدة';
            messagesList.insertBefore(unreadDivider, firstUnreadElement);
        }
    }

    // تمييز الرسائل كمقروءة في Firestore بعد عرضها للمستخدم
    if (messagesToMarkAsRead.length > 0 && currentUser) {
        markMessagesAsRead(currentChatId, messagesToMarkAsRead, currentUser.uid);
    }

    // التمرير لأسفل لعرض أحدث الرسائل
    messagesList.scrollTop = messagesList.scrollHeight;
}

/**
 * تحميل رسائل دردشة معينة.
 * @param {string} chatId - معرف الدردشة.
 */
function loadMessages(chatId) {
    if (unsubscribeMessages) {
        unsubscribeMessages(); // إلغاء الاشتراك السابق لتجنب تكرار البيانات
    }
    messagesList.innerHTML = '<div class="loading">جاري تحميل الرسائل...</div>';
    unsubscribeMessages = getMessages(chatId, displayMessages); // الاستماع للرسائل في الوقت الفعلي
}

/**
 * معالج لإرسال الرسائل.
 */
messageInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content || !currentChatId || !currentUser) return; // التحقق من وجود المحتوى والدردشة والمستخدم

    sendMessageBtn.disabled = true;
    sendMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    
    try {
        const senderUsername = currentUserProfileData.username; // استخدام اسم المستخدم من الملف الشخصي
        const success = await sendMessage(currentChatId, currentUser.uid, senderUsername, content);
        if (success) {
            messageInput.value = ''; // مسح حقل الإدخال
            messageInput.style.height = 'auto'; // إعادة تعيين ارتفاع حقل الإدخال
            await updateTypingStatus(currentChatId, currentUser.uid, false); // إيقاف مؤشر الكتابة
        }
    } catch (error) {
        alert('خطأ في إرسال الرسالة: ' + error.message);
    } finally {
        sendMessageBtn.disabled = false;
        sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال';
    }
});

// ضبط ارتفاع حقل إدخال الرسائل تلقائياً عند الكتابة
messageInput.addEventListener('input', async () => {
    messageInput.style.height = 'auto'; // إعادة تعيين الارتفاع للحساب الصحيح
    messageInput.style.height = messageInput.scrollHeight + 'px'; // ضبط الارتفاع بناءً على المحتوى

    // تحديث حالة الكتابة للمستخدم
    if (currentUser && currentChatId) {
        await updateTypingStatus(currentChatId, currentUser.uid, true);
        clearTimeout(typingTimer); // مسح المؤقت السابق
        typingTimer = setTimeout(async () => {
            await updateTypingStatus(currentChatId, currentUser.uid, false); // إيقاف مؤشر الكتابة بعد فترة
        }, TYPING_TIMEOUT);
    }
});

// معالج زر الرسائل الصوتية (ميزة قيد التطوير)
recordAudioBtn.addEventListener('click', () => {
    alert("وظيفة الرسائل الصوتية غير مطبقة بعد. تتطلب الوصول إلى الميكروفون وتحميل الملفات.");
});

// معالج زر لوحة الإيموجي
emojiPickerBtn.addEventListener('click', () => {
    emojiPicker.classList.toggle('active'); // تبديل رؤية لوحة الإيموجي
    if (emojiPicker.classList.contains('active')) {
        // بناء لوحة الإيموجي (يمكن توسيعها لتشمل المزيد من الإيموجي)
        emojiPicker.innerHTML = `
            <span class="emoji-item">😀</span>
            <span class="emoji-item">👋</span>
            <span class="emoji-item">👍</span>
            <span class="emoji-item">❤️</span>
            <span class="emoji-item">😂</span>
            <span class="emoji-item">🤔</span>
            <span class="emoji-item">🎉</span>
            <span class="emoji-item">👏</span>
            <span class="emoji-item">😎</span>
            <span class="emoji-item">🤩</span>
            <span class="emoji-item">😭</span>
            <span class="emoji-item">😤</span>
            <span class="emoji-item">😡</span>
            <span class="emoji-item">🥺</span>
            <span class="emoji-item">🤯</span>
            <span class="emoji-item">😴</span>
        `;
        emojiPicker.querySelectorAll('.emoji-item').forEach(span => {
            span.addEventListener('click', () => {
                messageInput.value += span.textContent; // إضافة الإيموجي إلى حقل الإدخال
                messageInput.focus();
                messageInput.style.height = 'auto'; // ضبط ارتفاع حقل الإدخال
                messageInput.style.height = messageInput.scrollHeight + 'px';
                emojiPicker.classList.remove('active'); // إخفاء لوحة الإيموجي
            });
        });
    }
});

// إخفاء لوحة الإيموجي عند النقر خارجها
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiPickerBtn && emojiPicker.classList.contains('active')) {
        emojiPicker.classList.remove('active');
    }
});


// --- معالجات أحداث التنقل بين الأقسام ---
showPostsBtn.addEventListener('click', () => showSection('postsSection'));
showChatsBtn.addEventListener('click', () => showSection('chatsSection'));
showAcquaintancesBtn.addEventListener('click', () => showSection('acquaintancesSection'));
showProfileBtn.addEventListener('click', () => showSection('profileSection'));


// --- الإعدادات الأولية عند تحميل التطبيق ---

// عند تحميل محتوى DOM بالكامل، نقوم بتهيئة بعض الوظائف.
document.addEventListener('DOMContentLoaded', () => {
    // إذا كان المستخدم مسجل الدخول بالفعل، قم بتحديث حالته إلى "متصل" وتحميل قائمة المتصلين
    if (auth.currentUser) {
        updateUserStatus(auth.currentUser.uid, true);
        loadOnlineUsers();
    }
});

// عند إغلاق النافذة أو علامة التبويب، قم بتحديث حالة المستخدم إلى "غير متصل"
// (يتم التعامل مع هذا في auth.js بواسطة addEventListener('beforeunload'))