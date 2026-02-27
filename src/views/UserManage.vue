<template>
  <div class="manage-container">
    <div class="manage-card">
      <h2>用户管理</h2>
      <div v-if="users.length === 0" class="empty">暂无用户</div>
      <table v-else class="user-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(user, index) in users" :key="index">
            <td>{{ user.username }}</td>
            <td>
              <button
                class="btn-delete"
                @click="handleDeleteUser(user.username)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button @click="goBack" class="btn-back">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const users = ref([])

onMounted(() => {
  const userList = JSON.parse(localStorage.getItem('users') || '[]')
  users.value = userList
})

const handleDeleteUser = (username) => {
  if (confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复。`)) {
    const userList = JSON.parse(localStorage.getItem('users') || '[]')
    const updatedList = userList.filter((u) => u.username !== username)
    localStorage.setItem('users', JSON.stringify(updatedList))
    users.value = updatedList
    alert(`用户 "${username}" 已删除`)
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.manage-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.manage-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 600px;
}

.manage-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.empty {
  text-align: center;
  color: #999;
  padding: 2rem 0;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}

.user-table th,
.user-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.user-table th {
  background-color: #f8f9fa;
  color: #555;
}

.btn-delete {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-delete:hover {
  background: #ff7875;
}

.btn-back {
  display: block;
  margin: 0 auto;
  padding: 0.8rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-back:hover {
  background: #5568d3;
}
</style>
