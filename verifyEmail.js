

const admin = require('firebase-admin');

// ************* 请替换您的密钥文件路径 *************
const serviceAccount = require('./serviceAccountKey.json'); 
const TARGET_UID = 'griyPsQGlBPq8ZFXirawqHAgkWj2'; 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminEmailVerified() {
  try {
    // 1. 更新用户的 emailVerified 属性为 true
    await admin.auth().updateUser(TARGET_UID, {
      emailVerified: true
    });
    
    console.log(`✅ 成功：用户 admin@magicbroom.com 的邮箱已强制验证为 true.`);

    // 2. 再次获取并确认
    const updatedUser = await admin.auth().getUser(TARGET_UID);
    console.log(`新的 emailVerified 状态: ${updatedUser.emailVerified}`);

  } catch (error) {
    console.error("❌ 发生错误:", error);
    if (error.code === 'auth/user-not-found') {
        console.error("请确认 UID 'IISmWozfPLXc59a0WrN4z4InMYW2' 是否在 Firebase Authentication 中存在。");
    }
  }
  process.exit();
}

setAdminEmailVerified();