<template>
  <div class="user-home">
    <!-- 顶部导航栏 -->
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

    <!-- 主体内容：只保留左侧用户信息，删除右侧功能卡片 -->
    <main class="main-container">
      <!-- 左侧：用户信息卡片（完全保留） -->
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

      <!-- 右侧功能卡片已完全删除 -->
    </main>

    <!-- 编辑资料模态框（完全保留） -->
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
          <div class="form-item">
            <label>头像链接</label>
            <input v-model="editForm.avatar" type="text" class="form-input" placeholder="输入图片URL（可选）">
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

const router = useRouter()
const showEditModal = ref(false)

// 用户信息
const userInfo = reactive({
  username: '',
  bio: '',
  location: '',
  avatar: ''
})

// 编辑表单
const editForm = reactive({
  username: '',
  bio: '',
  location: '',
  avatar: ''
})

onMounted(() => {
  loadUserInfo()
})

// 读取用户信息
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

// 保存用户信息
const saveUserInfo = () => {
  if (!editForm.username.trim()) {
    alert('用户名不能为空！')
    return
  }

  const oldUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const newUser = {
    ...oldUser,
    username: editForm.username,
    bio: editForm.bio,
    location: editForm.location,
    avatar: editForm.avatar
  }

  localStorage.setItem('currentUser', JSON.stringify(newUser))
  Object.assign(userInfo, newUser)
  showEditModal.value = false
  alert('保存成功！')
}

// 删除了右侧卡片的跳转函数（goToExam/goToErrorBook/goToStats）

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('currentUser')
  router.push('/')
}
</script>

<style scoped>
/* 全局容器 */
.user-home {
  min-height: 100vh;
  background-color: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 顶部导航栏 */
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
  color: #333;
  margin: 0;
}
.header-nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}
.nav-item {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  font-size: 1rem;
  transition: color 0.3s ease;
  cursor: pointer;
}
.nav-item.active, .nav-item:hover {
  color: #667eea;
}
.logout-btn:hover {
  color: #ff4d4f;
}

/* 主体容器：只保留左侧，删除右侧布局 */
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  justify-content: center; /* 居中显示用户卡片 */
}

/* 左侧：用户信息卡片（样式完全保留） */
.left-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 380px; /* 固定宽度，居中显示 */
}
.user-info-card {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.cover-bg {
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  border: 1px solid #667eea;
  color: #667eea;
  background: #fff;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-edit:hover {
  background: #667eea;
  color: #fff;
}
.user-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.3rem;
}
.user-desc {
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  line-height: 1.4;
}
.user-location {
  color: #999;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}

/* 模态框样式（完全保留） */
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
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  line-height: 1;
}
.close-btn:hover {
  color: #333;
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
  color: #333;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
.form-input, .form-textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}
.form-input:focus, .form-textarea:focus {
  border-color: #667eea;
}
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
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
}
.btn-cancel {
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  color: #666;
}
.btn-cancel:hover {
  background: #e8e8e8;
}
.btn-save {
  background: #667eea;
  border: none;
  color: #fff;
}
.btn-save:hover {
  background: #5568d3;
}

/* 响应式适配（调整居中显示） */
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
    width: 100%; /* 移动端占满宽度 */
  }
}
</style>