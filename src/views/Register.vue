<template>
  <div class="auth-container">
    <div class="auth-card">
      <button class="btn btn-back" @click="goBack">返回首页</button>
      <h2>注册</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            type="text"
            id="username"
            v-model="registerForm.username"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label for="phone">手机号（选填）</label>
          <input
            type="tel"
            id="phone"
            v-model="registerForm.phone"
            placeholder="请输入手机号"
          />
        </div>
        <div class="form-group">
          <label for="qq">QQ号（选填）</label>
          <input
            type="text"
            id="qq"
            v-model="registerForm.qq"
            placeholder="请输入QQ号"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="registerForm.password"
            placeholder="请输入密码"
            required
          />
        </div>
        <div class="form-group">
          <label for="confirmPwd">确认密码</label>
          <input
            type="password"
            id="confirmPwd"
            v-model="registerForm.confirmPwd"
            placeholder="请再次输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary">注册</button>
        <p class="auth-link">
          已有账号？<a @click="goToLogin">立即登录</a>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const registerForm = ref({
  username: '',
  phone: '',
  qq: '',
  password: '',
  confirmPwd: ''
})

const handleRegister = async () => {
  const { username, password, confirmPwd, phone, qq } = registerForm.value

  if (password !== confirmPwd) {
    alert('两次密码不一致！')
    return
  }

  try {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, phone, qq })
    })

    if (res.ok) {
      alert('注册成功！请登录')
      router.push('/login')
    } else {
      const data = await res.json()
      alert(data.error || '注册失败，请重试')
    }
  } catch (err) {
    alert('注册失败，请确保后端已启动')
  }
}

const goBack = () => {
  router.push('/')
}

const goToLogin = () => {
  router.push('/login')
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
  position: relative;
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
.btn-back {
  position: absolute;
  top: 15px;
  left: 15px;
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
}
</style>