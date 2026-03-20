<template>
  <div class="auth-container">
    <div class="auth-card">
      <button class="btn btn-back" @click="goBack">← 返回首页</button>
      <h2>登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            type="text"
            id="username"
            v-model="loginForm.username"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="loginForm.password"
            placeholder="请输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary">登录</button>
        <p class="auth-link">
          还没有账号？<a @click="goToRegister">立即注册</a>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loginForm = ref({
  username: '',
  password: ''
})

const goBack = () => {
  router.push('/')
}

const handleLogin = async () => {
  try {
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    })

    if (res.ok) {
      const data = await res.json()
      // 保存完整的用户信息（包含 avatar、bio、location 等）
      localStorage.setItem('currentUser', JSON.stringify(data.userInfo))
      alert('登录成功！')
      router.push('/')
    } else {
      const data = await res.json()
      alert(data.error || '用户名或密码错误')
    }
  } catch (err) {
    alert('登录失败，请确保后端已启动')
  }
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  /* 统一淡蓝色渐变 */
  background: linear-gradient(135deg, #d6f4ff 0%, #a8dfff 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}
.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
  position: relative;
}
.btn-back {
  background: none;
  border: none;
  color: #2b6cb0;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1rem;
  position: absolute;
  top: 1.2rem;
  left: 1.2rem;
}
.auth-card h2 {
  text-align: center;
  color: #2d3748;
  margin-bottom: 1.5rem;
}
.form-group {
  margin-bottom: 1.2rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-weight: 500;
}
.form-group input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}
.form-group input:focus {
  border-color: #90cdf4;
  outline: none;
}
.btn-primary {
  width: 100%;
  padding: 0.8rem;
  background: #2b6cb0;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}
.btn-primary:hover {
  background: #2c5282;
}
.auth-link {
  text-align: center;
  margin-top: 1.2rem;
  color: #4a5568;
}
.auth-link a {
  color: #2b6cb0;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}
</style>