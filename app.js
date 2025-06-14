import { 
  loginWithEmail, 
  signUpWithEmail, 
  loginWithGoogle, 
  logout,
  onAuthStateChanged,
  auth, db // تم إزالة 'storage' من الاستيراد
} from './auth.js';

import {
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
  offTypingStatusChanged
} from './firestore.js';


// ----------------------------------------------------
// عناصر واجهة المستخدم (UI Elements)
// ----------------------------------------------------
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authErrorMsg = document.getElementById('auth-error');

// شاشة المصادقة
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login');

// الشاشة الرئيسية
const logoutBtn = document.getElementById('logout-btn');
const navBtns = document.querySelectorAll('.nav-btn');
const headerTitle = document.getElementById('header-title');

// قسم الدردشات
const chatsList = document.getElementById('chats-list');
const newChatBtn = document.getElementById('new-chat-btn'); // زر إنشاء دردشة جديدة

// شاشة الدردشة الفردية
const singleChatScreen = document.getElementById('single-chat-screen');
const backToChatsBtn = document.getElementById('back-to-chats-btn');
const chatPartnerName = document.getElementById('chat-partner-name');
const chatPartnerPic = document.getElementById('chat-partner-pic');
const messagesList = document.getElementById('messages-list');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const typingIndicator = document.getElementById('typing-indicator');

// قسم المنشورات
const postContentInput = document.getElementById('post-content');
// const postImageInput = document.getElementById('post-image'); // تم إزالة هذا
// const imagePreviewName = document.getElementById('image-preview-name'); // تم إزالة هذا
const publishPostBtn = document.getElementById('publish-post');
const postsList = document.getElementById('posts-list');

// قسم الملف الشخصي
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profilePic = document.getElementById('profile-pic');
const bioText = document.getElementById('bio-text');
const postsCount = document.getElementById('posts-count');
const followersCount = document.getElementById('followers-count');
const followingCount = document.getElementById('following-count');
const editProfileBtn = document.getElementById('edit-profile-btn');

// نموذج تعديل الملف الشخصي (Modal)
const editProfileModal = document.getElementById('edit-profile-modal');
const editUsernameInput = document.getElementById('edit-username');
const editBioTextarea = document.getElementById('edit-bio');
// const editProfileImageInput = document.getElementById('edit-profile-image'); // تم إزالة هذا
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelEditProfileBtn = document.getElementById('cancel-edit-profile-btn');

// ----------------------------------------------------
// متغيرات التطبيق والحالة
// ----------------------------------------------------
let currentUser = null;
let currentChatId = null; // لتتبع الدردشة المفتوحة حاليًا
let unsubscribeFromMessages = null; // لفك الاشتراك من الاستماع للرسائل
let unsubscribeFromTyping = null; // لفك الاشتراك من مؤشر الكتابة


// ----------------------------------------------------
// وظائف واجهة المستخدم العامة
// ----------------------------------------------------

// تبديل الشاشات (المصادقة / الرئيسية)
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

// تبديل الأقسام داخل الشاشة الرئيسية
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
}

function displayAuthError(message) {
  authErrorMsg.textContent = message;
  authErrorMsg.classList.remove('hidden');
  setTimeout(() => {
    authErrorMsg.textContent = '';
    authErrorMsg.classList.add('hidden');
  }, 5000);
}

// تنسيق التاريخ والوقت
function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date; // الفرق بالملي ثانية
  
  if (diff < 60 * 1000) { // أقل من دقيقة
    return 'الآن';
  } else if (diff < 60 * 60 * 1000) { // أقل من ساعة
    return `${Math.floor(diff / (60 * 1000))} دقيقة`;
  } else if (diff < 24 * 60 * 60 * 1000) { // أقل من يوم
    return `${Math.floor(diff / (60 * 60 * 1000))} ساعة`;
  } else if (diff < 7 * 24 * 60 * 60 * 1000) { // أقل من أسبوع
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} يوم`;
  } else {
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

// ----------------------------------------------------
// معالجات أحداث المصادقة
// ----------------------------------------------------
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await loginWithEmail(email, password);
  } catch (error) {
    displayAuthError(`خطأ في تسجيل الدخول: ${error.message}`);
    console.error("Login error:", error);
  }
});

signupBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  // إضافة حقل لاسم المستخدم إذا أردت إجبار المستخدم على إدخاله
  const username = email.split('@')[0]; // اسم مستخدم افتراضي
  
  try {
    await signUpWithEmail(email, password, username);
  } catch (error) {
    displayAuthError(`خطأ في إنشاء الحساب: ${error.message}`);
    console.error("Signup error:", error);
  }
});

googleLoginBtn.addEventListener('click', async () => {
  try {
    await loginWithGoogle();
  } catch (error) {
    displayAuthError(`خطأ في تسجيل الدخول بواسطة Google: ${error.message}`);
    console.error("Google login error:", error);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await logout();
  } catch (error) {
    console.error("Logout error:", error);
  }
});

// ----------------------------------------------------
// التنقل بين الأقسام
// ----------------------------------------------------
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    
    // تحديث حالة أزرار التنقل
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // إظهار القسم المطلوب وإخفاء الأقسام الأخرى
    showSection(`${target}-section`);
    
    // تحديث العنوان
    headerTitle.textContent = btn.textContent.trim();
    
    // تحميل المحتوى عند الحاجة
    if (target === 'chats') {
      loadChats();
      // تأكد من إخفاء شاشة الدردشة الفردية عند العودة لقائمة الدردشات
      singleChatScreen.classList.add('hidden');
    }
    if (target === 'posts') loadPosts();
    // يمكنك إضافة منطق تحميل للبحث والملف الشخصي هنا إذا كانت هناك بيانات ديناميكية تحتاج للتحميل عند التبديل
  });
});

// ----------------------------------------------------
// منطق الدردشات
// ----------------------------------------------------

// تحميل قائمة الدردشات
async function loadChats() {
  if (!currentUser) return;

  chatsList.innerHTML = '<div class="loading">جاري تحميل الدردشات...</div>';
  
  // الاستماع للتغييرات في قائمة الدردشات في الوقت الفعلي
  db.collection('chats')
    .where(`participants.${currentUser.uid}`, '==', true)
    .orderBy('lastMessageAt', 'desc')
    .onSnapshot(async (snapshot) => {
      chatsList.innerHTML = '';
      
      if (snapshot.empty) {
        chatsList.innerHTML = '<div class="empty">لا توجد دردشات حاليًا. ابدأ واحدة!</div>';
        return;
      }
      
      const chatPromises = snapshot.docs.map(async doc => {
        const chat = doc.data();
        const chatId = doc.id;
        
        let chatName = chat.name || 'محادثة فردية';
        // استخدام صورة افتراضية عامة لصور الدردشات
        let chatAvatar = 'https://via.placeholder.com/50/CCCCCC/FFFFFF?text=AV'; 

        if (!chat.isGroup) {
          const otherParticipantsIds = Object.keys(chat.participants).filter(uid => uid !== currentUser.uid);
          if (otherParticipantsIds.length > 0) {
            const otherUserDoc = await getUserProfile(otherParticipantsIds[0]);
            if (otherUserDoc.exists) {
              const otherUser = otherUserDoc.data();
              chatName = otherUser.username || otherUser.email.split('@')[0];
              chatAvatar = otherUser.profilePictureUrl || chatAvatar;
            } else {
              chatName = 'مستخدم غير معروف';
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
          <span class="time">${formatDate(chat.lastMessageAt)}</span>
        `;
        
        chatItem.addEventListener('click', () => {
          openChat(chatId, chatName, chatAvatar, chat.isGroup);
        });
        
        return chatItem;
      });

      const chatItems = await Promise.all(chatPromises);
      chatItems.forEach(item => chatsList.appendChild(item));
    }, (error) => {
      console.error("Error loading chats:", error);
      chatsList.innerHTML = '<div class="empty">حدث خطأ أثناء تحميل الدردشات.</div>';
    });
}

// فتح شاشة الدردشة الفردية
async function openChat(chatId, name, avatar, isGroup) {
  currentChatId = chatId;
  chatPartnerName.textContent = name;
  chatPartnerPic.src = avatar;
  
  showSection('single-chat-screen');
  mainScreen.classList.add('hidden'); // إخفاء الشاشة الرئيسية

  messagesList.innerHTML = '<div class="loading">جاري تحميل الرسائل...</div>';
  typingIndicator.classList.add('hidden'); // إخفاء مؤشر الكتابة مبدئيًا

  // فك الاشتراك من أي دردشة سابقة
  if (unsubscribeFromMessages) {
    unsubscribeFromMessages();
  }
  if (unsubscribeFromTyping) {
    offTypingStatusChanged(currentChatId); // إيقاف الاستماع للمؤشرات للدردشة السابقة
  }

  // الاستماع للرسائل في الوقت الفعلي
  unsubscribeFromMessages = getMessages(chatId).onSnapshot(snapshot => {
    messagesList.innerHTML = ''; // مسح الرسائل القديمة قبل إضافة الجديدة
    if (snapshot.empty) {
      messagesList.innerHTML = '<div class="empty">ابدأ بإرسال رسالتك الأولى!</div>';
      return;
    }
    
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        const message = { id: change.doc.id, ...change.doc.data() };
        addMessageToUI(message);
      }
      // يمكنك إضافة منطق لـ "modified" و "removed" إذا أردت تحديث الرسائل أو حذفها
    });
    messagesList.scrollTop = messagesList.scrollHeight; // التمرير لأسفل لآخر رسالة
  }, (error) => {
    console.error("Error listening to messages:", error);
    messagesList.innerHTML = '<div class="empty">خطأ في تحميل الرسائل.</div>';
  });

  // الاستماع لمؤشرات الكتابة
  unsubscribeFromTyping = onTypingStatusChanged(chatId, (typingUsers) => {
    const otherTypingUsers = Object.keys(typingUsers || {}).filter(uid => uid !== currentUser.uid && typingUsers[uid]);
    if (otherTypingUsers.length > 0) {
      typingIndicator.textContent = otherTypingUsers.length > 1 ? 'يكتب العديد من الأشخاص الآن...' : 'يكتب الآن...';
      typingIndicator.classList.remove('hidden');
    } else {
      typingIndicator.classList.add('hidden');
    }
  });
}

// إضافة رسالة إلى واجهة المستخدم
function addMessageToUI(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-bubble ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
  
  let content = message.content;
  // لا يوجد دعم لصور الميديا في الرسائل
  // if (message.mediaUrl && message.mediaType && message.mediaType.startsWith('image/')) {
  //   content += `<br><img src="${message.mediaUrl}" alt="صورة" style="max-width: 100%; border-radius: 8px; margin-top: 5px;">`;
  // }
  
  messageDiv.innerHTML = `
    <p>${content}</p>
    <span class="timestamp">${formatDate(message.timestamp)}</span>
  `;
  messagesList.prepend(messageDiv); // إضافة الرسالة في الأعلى لـ flex-direction: column-reverse
}


// إرسال رسالة
sendMessageBtn.addEventListener('click', async () => {
  const content = messageInput.value.trim();
  if (!currentChatId || !content) return;

  try {
    await sendMessage(currentChatId, content);
    messageInput.value = ''; // مسح حقل الإدخال
    setTypingIndicator(currentChatId, false); // إيقاف مؤشر الكتابة بعد الإرسال
  } catch (error) {
    console.error("Error sending message:", error);
    alert('حدث خطأ أثناء إرسال الرسالة.');
  }
});

// مؤشر الكتابة
let typingTimeout = null;
messageInput.addEventListener('input', () => {
  if (currentChatId && currentUser) {
    setTypingIndicator(currentChatId, true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setTypingIndicator(currentChatId, false);
    }, 3000); // إزالة المؤشر بعد 3 ثوانٍ من التوقف عن الكتابة
  }
});

// العودة إلى قائمة الدردشات
backToChatsBtn.addEventListener('click', () => {
  showSection('chats-section');
  mainScreen.classList.remove('hidden'); // إظهار الشاشة الرئيسية
  currentChatId = null; // إعادة تعيين معرف الدردشة الحالية
  if (unsubscribeFromMessages) {
    unsubscribeFromMessages(); // فك الاشتراك من الاستماع للرسائل
    unsubscribeFromMessages = null;
  }
  if (unsubscribeFromTyping) {
    offTypingStatusChanged(currentChatId);
    unsubscribeFromTyping = null;
  }
});

// إنشاء دردشة جديدة (يمكنك توسيع هذا لفتح مودال اختيار المستخدمين)
newChatBtn.addEventListener('click', async () => {
  const recipientEmail = prompt("أدخل البريد الإلكتروني للمستخدم الذي تريد الدردشة معه:");
  if (!recipientEmail || !currentUser) return;

  try {
    // البحث عن المستخدم بالبريد الإلكتروني
    const usersSnapshot = await db.collection('users').where('email', '==', recipientEmail).limit(1).get();
    if (usersSnapshot.empty) {
      alert("لم يتم العثور على مستخدم بهذا البريد الإلكتروني.");
      return;
    }
    const recipientUser = usersSnapshot.docs[0].data();
    const recipientId = usersSnapshot.docs[0].id;

    if (recipientId === currentUser.uid) {
      alert("لا يمكنك بدء دردشة مع نفسك.");
      return;
    }

    // التحقق مما إذا كانت هناك دردشة موجودة بالفعل بين المستخدمين
    const existingChatSnapshot = await db.collection('chats')
      .where(`participants.${currentUser.uid}`, '==', true)
      .where(`participants.${recipientId}`, '==', true)
      .where('isGroup', '==', false)
      .limit(1)
      .get();

    if (!existingChatSnapshot.empty) {
      const existingChatId = existingChatSnapshot.docs[0].id;
      alert("توجد دردشة بالفعل مع هذا المستخدم.");
      openChat(existingChatId, recipientUser.username || recipientUser.email.split('@')[0], recipientUser.profilePictureUrl || 'https://via.placeholder.com/50/CCCCCC/FFFFFF?text=AV', false);
    } else {
      // إنشاء دردشة جديدة
      const newChatId = await createChat([currentUser.uid, recipientId]);
      alert("تم إنشاء دردشة جديدة!");
      openChat(newChatId, recipientUser.username || recipientUser.email.split('@')[0], recipientUser.profilePictureUrl || 'https://via.placeholder.com/50/CCCCCC/FFFFFF?text=AV', false);
    }
  } catch (error) {
    console.error("Error creating chat:", error);
    alert("حدث خطأ أثناء إنشاء الدردشة: " + error.message);
  }
});


// ----------------------------------------------------
// منطق المنشورات
// ----------------------------------------------------

// تم إزالة معاينة اسم الصورة قبل الرفع (postImageInput)

// نشر منشور جديد
publishPostBtn.addEventListener('click', async () => {
  const content = postContentInput.value.trim();
  // تم إزالة 'imageFile'
  
  if (!content) { // تم التعديل للتحقق من المحتوى فقط
    alert('المنشور لا يمكن أن يكون فارغًا!');
    return;
  }
  
  try {
    publishPostBtn.textContent = 'جاري النشر...';
    publishPostBtn.disabled = true;

    await createPost(content); // تم إزالة 'imageFile'
    postContentInput.value = '';
    // تم إزالة مسح الملف المحدد ومعاينة الصورة
    alert('تم نشر المنشور بنجاح!');
    loadPosts(); // إعادة تحميل المنشورات
  } catch (error) {
    console.error("Error publishing post:", error);
    alert(`خطأ في نشر المنشور: ${error.message}`);
  } finally {
    publishPostBtn.textContent = 'نشر';
    publishPostBtn.disabled = false;
  }
});

// تحميل المنشورات
async function loadPosts() {
  postsList.innerHTML = '<div class="loading">جاري تحميل المنشورات...</div>';
  
  // الاستماع للتغييرات في المنشورات في الوقت الفعلي
  db.collection('posts')
    .orderBy('timestamp', 'desc')
    .onSnapshot(async (snapshot) => {
      postsList.innerHTML = '';
      
      if (snapshot.empty) {
        postsList.innerHTML = '<div class="empty">لا توجد منشورات حاليًا. كن أول من ينشر!</div>';
        return;
      }
      
      const postsPromises = snapshot.docs.map(async doc => {
        const post = doc.data();
        const postId = doc.id;
        
        // جلب حالة الإعجاب الحالية للمستخدم
        let isLiked = false;
        if (currentUser) {
          const likeDoc = await db.collection(`posts/${postId}/likes`).doc(currentUser.uid).get();
          isLiked = likeDoc.exists;
        }

        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        
        postItem.innerHTML = `
          <div class="post-header">
            <img src="${post.userProfilePic || 'https://via.placeholder.com/50/CCCCCC/FFFFFF?text=AV'}" alt="صورة المستخدم" class="user-pic">
            <div class="user-info">
              <strong>${post.username}</strong>
              <span>${formatDate(post.timestamp)}</span>
            </div>
          </div>
          <div class="post-content">
            <p>${post.content}</p>
            </div>
          <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${postId}">
              <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> <span class="like-count">${post.likesCount || 0}</span>
            </button>
            <button class="comment-btn">
              <i class="far fa-comment"></i> ${post.commentsCount || 0}
            </button>
          </div>
        `;
        
        // إضافة حدث الإعجاب
        const likeBtn = postItem.querySelector('.like-btn');
        likeBtn.addEventListener('click', async () => {
          if (!currentUser) {
            alert('يجب تسجيل الدخول للإعجاب بالمنشورات.');
            return;
          }
          try {
            await likePost(postId);
            // لا حاجة لإعادة تحميل كل المنشورات، onSnapshot سيتولى التحديث
          } catch (error) {
            console.error("Error liking post:", error);
          }
        });
        
        return postItem;
      });

      const postItems = await Promise.all(postsPromises);
      postItems.forEach(item => postsList.appendChild(item));
    }, (error) => {
      console.error("Error loading posts:", error);
      postsList.innerHTML = '<div class="empty">حدث خطأ أثناء تحميل المنشورات.</div>';
    });
}

// ----------------------------------------------------
// منطق الملف الشخصي
// ----------------------------------------------------

// تحميل الملف الشخصي
async function loadUserProfile(userId) {
  try {
    const doc = await getUserProfile(userId);
    if (doc.exists) {
      const userData = doc.data();
      profileName.textContent = userData.username || 'اسم المستخدم';
      profileEmail.textContent = userData.email || '';
      profilePic.src = userData.profilePictureUrl || 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=AV';
      bioText.textContent = userData.bio || 'لا يوجد وصف حاليًا...';
      postsCount.textContent = userData.postsCount || 0;
      followersCount.textContent = userData.followersCount || 0; // تحتاج لتطبيق منطق المتابعة في Firestore
      followingCount.textContent = userData.followingCount || 0; // تحتاج لتطبيق منطق المتابعة في Firestore

      // تعبئة المودال بالبيانات الحالية
      editUsernameInput.value = userData.username || '';
      editBioTextarea.value = userData.bio || '';

    } else {
      console.warn("User profile not found for ID:", userId);
      // قد تكون هذه حالة لمستخدم تم إنشاؤه حديثًا ولم يكتمل ملفه الشخصي بعد
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
  }
}

// فتح نموذج تعديل الملف الشخصي
editProfileBtn.addEventListener('click', () => {
  editProfileModal.classList.remove('hidden');
});

// إغلاق نموذج تعديل الملف الشخصي
cancelEditProfileBtn.addEventListener('click', () => {
  editProfileModal.classList.add('hidden');
});

// حفظ تغييرات الملف الشخصي
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  const newUsername = editUsernameInput.value.trim();
  const newBio = editBioTextarea.value.trim();
  // تم إزالة 'newProfileImage'
  
  const updates = {};
  if (newUsername) updates.username = newUsername;
  updates.bio = newBio; // يمكن أن يكون فارغًا

  try {
    saveProfileBtn.textContent = 'جاري الحفظ...';
    saveProfileBtn.disabled = true;

    // تم إزالة منطق رفع الصورة
    // if (newProfileImage) {
    //   const imageUrl = await uploadImage(newProfileImage, 'profile_pictures');
    //   updates.profilePictureUrl = imageUrl;
    // }

    await updateUserProfile(currentUser.uid, updates);
    alert('تم تحديث الملف الشخصي بنجاح!');
    editProfileModal.classList.add('hidden');
    loadUserProfile(currentUser.uid); // إعادة تحميل الملف الشخصي بعد التحديث
  } catch (error) {
    console.error("Error updating profile:", error);
    alert(`خطأ في تحديث الملف الشخصي: ${error.message}`);
  } finally {
    saveProfileBtn.textContent = 'حفظ التغييرات';
    saveProfileBtn.disabled = false;
  }
});


// ----------------------------------------------------
// متابعة حالة المصادقة (Auth State)
// ----------------------------------------------------
onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    showScreen('main-screen');
    // لضمان تحميل الدردشات كواجهة أولية عند تسجيل الدخول
    navBtns[0].classList.add('active'); // تفعيل زر الدردشات افتراضياً
    headerTitle.textContent = navBtns[0].textContent.trim(); // تحديث العنوان
    showSection('chats-section'); // إظهار قسم الدردشات
    
    loadUserProfile(user.uid);
    loadChats(); // تحميل الدردشات الأولية
  } else {
    currentUser = null;
    showScreen('auth-screen');
    // التأكد من فك الاشتراك عند تسجيل الخروج
    if (unsubscribeFromMessages) {
      unsubscribeFromMessages();
      unsubscribeFromMessages = null;
    }
    if (unsubscribeFromTyping) {
      offTypingStatusChanged(currentChatId);
      unsubscribeFromTyping = null;
    }
  }
});

// ----------------------------------------------------
// تهيئة التطبيق
// ----------------------------------------------------
function initApp() {
  // لا يوجد هنا سوى منطق الانتظار حتى تحميل DOM بالكامل
}

window.addEventListener('DOMContentLoaded', initApp);