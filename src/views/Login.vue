<template>
  <div class="auth-container">
    <div class="auth-card">
      <button class="btn btn-back" @click="goBack"> 返回首页</button>
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

// 返回首页逻辑（保留）
const goBack = () => {
  router.push('/')
}

// 修改：对接后端数据库的登录接口
const handleLogin = async () => {
  try {
    // 1. 调用后端登录接口
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    })

    if (res.ok) {
      // 2. 登录成功
      const data = await res.json()
      // 3. 把用户信息存入localStorage（和首页权限判断兼容）
      localStorage.setItem('currentUser', JSON.stringify(data.userInfo))
      alert('登录成功！')
      router.push('/')
    } else {
      // 4. 登录失败（用户名或密码错误）
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
/* 你原来的样式完全不动 */
.auth-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.auth-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.auth-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.btn-primary {
  width: 100%;
  padding: 0.8rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary:hover {
  background: #5568d3;
}

.auth-link {
  text-align: center;
  margin-top: 1.5rem;
  color: #666;
}

.auth-link a {
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
}
</style>