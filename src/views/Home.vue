<template>
  <div class="home-container">
    <!-- 顶部居中标题 -->
    <header class="home-header">
      <h1>题计划Lab</h1>
      <p>计算机专业刷题系统</p>
    </header>

    <!-- 欢迎栏 + 个人卡片 布局 -->
    <div class="welcome-row">
      <div class="welcome-bar" v-if="isLoggedIn">
        <p>欢迎回来，{{ username }}！</p>
        <button @click="handleLogout" class="btn-logout">退出登录</button>
      </div>

      <div class="user-info-mini" v-if="isLoggedIn" @click="goToUserHome">
        <img :src="userInfo.avatar || 'https://picsum.photos/100/100'" alt="头像" class="mini-avatar">
        <div class="mini-text">
          <div class="mini-name">{{ userInfo.username }}</div>
          <div class="mini-desc">点击查看个人主页</div>
        </div>
        <span class="mini-arrow">›</span>
      </div>
    </div>

    <!-- 未登录按钮 -->
    <div class="action-buttons" v-if="!isLoggedIn">
      <button @click="goToLogin" class="btn btn-primary">登录</button>
      <button @click="goToRegister" class="btn btn-secondary">注册</button>
    </div>

    <!-- 功能卡片区域（仅登录后显示） -->
    <div class="card-grid" v-if="isLoggedIn">
      <!-- 日常刷题 -->
      <div class="card" @click="goToExam">
        <div class="card-icon"></div>
        <h3>日常刷题</h3>
        <p>按科目专项练习，巩固知识点</p>
      </div>

      <!-- 模拟考试 -->
      <div class="card" @click="goToMockExam">
        <div class="card-icon"></div>
        <h3>真题测试</h3>
        <p>90分钟限时</p>
      </div>

      <!-- 错题本 -->
      <div class="card" @click="goToErrorBook">
        <div class="card-icon"></div>
        <h3>错题本</h3>
        <p>回顾错题，查漏补缺</p>
      </div>

      <!-- 管理员后台：仅admin登录时显示 -->
      <div class="card" @click="goToAdmin" v-if="isAdmin">
        <div class="card-icon"></div>
        <h3>管理员后台</h3>
        <p>登录管理题库，批量导入题目</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoggedIn = ref(false)
const username = ref('')
const isAdmin = ref(false) // 新增：管理员标识

const userInfo = reactive({
  username: '',
  bio: '',
  avatar: ''
})

onMounted(() => {
  loadUserInfo()
})

const loadUserInfo = () => {
  const user = localStorage.getItem('currentUser')
  if (user) {
    isLoggedIn.value = true
    const parsedUser = JSON.parse(user)
    username.value = parsedUser.username
    Object.assign(userInfo, {
      username: parsedUser.username || '用户',
      bio: parsedUser.bio || '',
      avatar: parsedUser.avatar || ''
    })
    // 核心判断：是否为管理员账号
    isAdmin.value = parsedUser.username === 'admin'
  }
}

// 所有跳转函数
const goToUserHome = () => router.push('/user')
const goToLogin = () => router.push('/login')
const goToRegister = () => router.push('/register')
const goToExam = () => router.push('/exam')
const goToMockExam = () => router.push('/exam-mock')
const goToErrorBook = () => router.push('/error-book')
const goToAdmin = () => router.push('/admin')

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('currentUser')
  isLoggedIn.value = false
  isAdmin.value = false // 重置管理员标识
  username.value = ''
  router.push('/')
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  /* 淡蓝色渐变背景 */
  background: linear-gradient(135deg, #d6f4ff 0%, #85c9f0 100%);
  color: #2d3748;
  padding: 2rem 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.home-header {
  text-align: center;
  margin-bottom: 2rem;
}
.home-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2b6cb0;
}
.home-header p {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
}
.welcome-row {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.welcome-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.btn-logout {
  background: #fff;
  border: 1px solid #90cdf4;
  color: #2b6cb0;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-logout:hover {
  background: #bee3f8;
}
.user-info-mini {
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid #bee3f8;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.user-info-mini:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
}
.mini-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #90cdf4;
  object-fit: cover;
}
.mini-text {
  text-align: left;
}
.mini-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.1rem;
  color: #2d3748;
}
.mini-desc {
  font-size: 0.8rem;
  opacity: 0.8;
  color: #4a5568;
}
.mini-arrow {
  font-size: 1.4rem;
  opacity: 0.7;
  font-weight: 300;
  color: #2b6cb0;
}
.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}
.btn {
  padding: 0.8rem 2rem;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
.btn-primary {
  background: #2b6cb0;
  color: white;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(43, 108, 176, 0.3);
}
.btn-secondary {
  background: white;
  color: #2b6cb0;
  border: 2px solid #2b6cb0;
}
.btn-secondary:hover {
  background: #bee3f8;
  color: #2b6cb0;
}
.card-grid {
  width: 100%;
  max-width: 600px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
}
.card {
  background: white;
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid #bee3f8;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 32px rgba(43, 108, 176, 0.15);
  border-color: #90cdf4;
}
.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #2b6cb0;
}
.card h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #2d3748;
}
.card p {
  opacity: 0.9;
  margin: 0;
  color: #4a5568;
  font-size: 0.9rem;
}

/* 手机适配 */
@media (min-width: 500px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>