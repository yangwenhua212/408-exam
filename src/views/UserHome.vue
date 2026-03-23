<template>
  <div class="user-home">
    <header class="header">
      <div class="header-container">
        <h1 class="page-title">个人主页</h1>
        <nav class="header-nav">
          <router-link to="/" class="nav-item">首页</router-link>
          <span class="nav-item active">我的主页</span>
          <span @click="handleLogout" class="nav-item logout-btn">退出登录</span>
        </nav>
      </div>
    </header>

    <main class="main-container">
      <div class="left-section">
        <div class="user-info-card">
          <div class="cover-bg"></div>
          <div class="user-base">
            <div class="avatar-wrap">
              <img :src="userInfo.avatar || 'https://picsum.photos/200/200'" alt="用户头像" class="user-avatar">
              <button @click="showEditModal = true" class="btn-edit">编辑资料</button>
            </div>
            <div class="user-name">{{ userInfo.username }}</div>
            <p class="user-desc">{{ userInfo.bio || '这个人很懒，什么都没写~' }}</p>
            <p class="user-location">📍 {{ userInfo.location || '未设置' }}</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 编辑资料模态框 -->
    <div v-if="showEditModal" class="modal-mask" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑个人资料</h3>
          <button @click="showEditModal = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>用户名</label>
            <input v-model="editForm.username" type="text" class="form-input" placeholder="请输入用户名">
          </div>
          <div class="form-item">
            <label>个人简介</label>
            <textarea v-model="editForm.bio" class="form-textarea" rows="3" placeholder="介绍一下自己吧"></textarea>
          </div>
          <div class="form-item">
            <label>所在地</label>
            <input v-model="editForm.location" type="text" class="form-input" placeholder="例如：广西·百色">
          </div>
          <!-- 头像上传区域 -->
          <div class="form-item">
            <label>头像</label>
            <div class="avatar-upload">
              <img :src="editForm.avatar || 'https://picsum.photos/200/200'" class="preview-avatar" />
              <div class="upload-controls">
                <input v-model="editForm.avatar" type="text" class="form-input" placeholder="输入图片URL（可选）">
                <button type="button" @click="triggerFileUpload" class="btn-upload">从相册上传</button>
                <input ref="fileInput" type="file" accept="image/*" @change="handleFileUpload" style="display: none;">
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn-cancel">取消</button>
          <button @click="saveUserInfo" class="btn-save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request';

const router = useRouter()
const showEditModal = ref(false)
const fileInput = ref(null)

const userInfo = reactive({
  username: '',
  bio: '',
  location: '',
  avatar: ''
})

const editForm = reactive({
  username: '',
  bio: '',
  location: '',
  avatar: ''
})

onMounted(() => {
  loadUserInfo()
})

const loadUserInfo = () => {
  const user = localStorage.getItem('currentUser')
  if (user) {
    const parsedUser = JSON.parse(user)
    Object.assign(userInfo, {
      username: parsedUser.username || '用户',
      bio: parsedUser.bio || '',
      location: parsedUser.location || '',
      avatar: parsedUser.avatar || ''
    })
    Object.assign(editForm, userInfo)
  } else {
    alert('请先登录后再进行操作！')
    router.push('/login')
  }
}

const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    editForm.avatar = e.target.result
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

// 修改为异步更新后端
const saveUserInfo = async () => {
  if (!editForm.username.trim()) {
    alert('用户名不能为空！');
    return;
  }

  try {
    await request.post('/user/update', editForm);
    // 更新 localStorage 和本地 userInfo
    const oldUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const newUser = { ...oldUser, ...editForm };
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    Object.assign(userInfo, newUser);
    showEditModal.value = false;
    alert('保存成功！');
  } catch (err) {
    alert('更新失败，请检查网络或后端是否启动');
  }
};


const handleLogout = () => {
  localStorage.removeItem('currentUser')
  router.push('/')
}
</script>

<style scoped>
.user-home {
  min-height: 100vh;
  /* 统一淡蓝渐变 */
  background: linear-gradient(135deg, #d6f4ff 0%, #a8dfff 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.2rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2b6cb0;
  margin: 0;
}
.header-nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}
.nav-item {
  text-decoration: none;
  color: #4a5568;
  font-weight: 500;
  font-size: 1rem;
  transition: color 0.3s ease;
  cursor: pointer;
}
.nav-item.active, .nav-item:hover {
  color: #2b6cb0;
}
.logout-btn:hover {
  color: #e53e3e;
}
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
}
.left-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 380px;
}
.user-info-card {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.cover-bg {
  height: 120px;
  /* 淡蓝渐变封面 */
  background: linear-gradient(135deg, #90cdf4 0%, #2b6cb0 100%);
}
.user-base {
  padding: 0 1.5rem 1.5rem;
  margin-top: -50px;
}
.avatar-wrap {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1rem;
}
.user-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid #fff;
  object-fit: cover;
}
.btn-edit {
  padding: 0.4rem 1rem;
  border: 1px solid #2b6cb0;
  color: #2b6cb0;
  background: #fff;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-edit:hover {
  background: #2b6cb0;
  color: #fff;
}
.user-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.3rem;
}
.user-desc {
  color: #4a5568;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  line-height: 1.4;
}
.user-location {
  color: #718096;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}
/* 模态框样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}
.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #2d3748;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  line-height: 1;
}
.close-btn:hover {
  color: #2d3748;
}
.modal-body {
  padding: 1.5rem;
}
.form-item {
  margin-bottom: 1.2rem;
}
.form-item label {
  display: block;
  font-size: 0.9rem;
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
.form-input, .form-textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}
.form-input:focus, .form-textarea:focus {
  border-color: #2b6cb0;
}
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
  border: 2px solid #2b6cb0;
}
.upload-controls {
  display: flex;
  gap: 10px;
  width: 100%;
}
.btn-upload {
  padding: 0.6rem 1rem;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9rem;
}
.btn-upload:hover {
  background: #e2e8f0;
}
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.btn-cancel, .btn-save {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}
.btn-cancel {
  background: #f7fafc;
  color: #4a5568;
}
.btn-cancel:hover {
  background: #e2e8f0;
}
.btn-save {
  background: #2b6cb0;
  color: #fff;
}
.btn-save:hover {
  background: #2c5282;
}
/* 手机适配 */
@media (max-width: 768px) {
  .header-container {
    padding: 1rem;
  }
  .page-title {
    font-size: 1.2rem;
  }
  .header-nav {
    gap: 1rem;
  }
  .main-container {
    padding: 1rem;
  }
  .left-section {
    width: 100%;
  }
}
</style>