<template>
  <div class="admin-dashboard">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <h1>📝 408题库管理后台</h1>
      <div class="header-right">
        <span>欢迎，{{ adminUsername }}</span>
        <button @click="handleLogout" class="btn-logout">退出登录</button>
      </div>
    </header>

    <!-- 标签页切换 -->
    <div class="tab-nav">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-item"
        :class="{ 'active': currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 单题添加 -->
    <div v-if="currentTab === 'single'" class="tab-content">
      <div class="form-card">
        <h3>添加单题</h3>
        <!-- 第一行：题目类型 -->
        <div class="form-row">
          <div class="form-group full-width">
            <label>题目类型</label>
            <select v-model="singleForm.type" @change="onTypeChange">
              <option value="真题">408统考真题</option>
              <option value="自定义题">自定义练习题</option>
            </select>
          </div>
        </div>

        <!-- 第二行：年份/科目 动态显示 -->
        <div class="form-row">
          <!-- 年份：仅真题显示 -->
          <div class="form-group" v-if="singleForm.type === '真题'">
            <label>年份</label>
            <select v-model="singleForm.year">
              <option v-for="year in yearList" :key="year" :value="year">{{ year }}年</option>
            </select>
          </div>

          <!-- 科目：仅自定义题显示 -->
          <div class="form-group" v-if="singleForm.type === '自定义题'">
            <label>科目</label>
            <select v-model="singleForm.subject">
              <option value="数据结构">数据结构</option>
              <option value="计算机组成原理">计算机组成原理</option>
              <option value="操作系统">操作系统</option>
              <option value="计算机网络">计算机网络</option>
            </select>
          </div>

          <!-- 难度：始终显示 -->
          <div class="form-group">
            <label>难度</label>
            <select v-model="singleForm.difficulty">
              <option value="简单">简单</option>
              <option value="中等">中等</option>
              <option value="困难">困难</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>题干</label>
          <textarea v-model="singleForm.question" placeholder="请输入题目内容"></textarea>
        </div>

        <div class="options-row">
          <div class="form-group">
            <label>选项A</label>
            <input v-model="singleForm.optionA" placeholder="选项A内容">
          </div>
          <div class="form-group">
            <label>选项B</label>
            <input v-model="singleForm.optionB" placeholder="选项B内容">
          </div>
          <div class="form-group">
            <label>选项C</label>
            <input v-model="singleForm.optionC" placeholder="选项C内容">
          </div>
          <div class="form-group">
            <label>选项D</label>
            <input v-model="singleForm.optionD" placeholder="选项D内容">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>正确答案</label>
            <select v-model="singleForm.answer">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>答案解析</label>
          <textarea v-model="singleForm.analysis" placeholder="请输入答案解析"></textarea>
        </div>

        <button @click="addSingleQuestion" class="btn-submit">✅ 添加题目</button>
      </div>
    </div>

    <!-- 批量导入 -->
    <div v-if="currentTab === 'batch'" class="tab-content">
      <div class="form-card">
        <h3>批量导入题目</h3>
        <p class="tips">请将题目整理为JSON数组格式，粘贴到下方输入框</p>
        <textarea v-model="batchText" class="batch-textarea" placeholder='[
  {
    "year": 2025,
    "subject": "数据结构",
    "question": "题干",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "C",
    "analysis": "解析",
    "difficulty": "简单",
    "type": "真题"
  }
]'></textarea>
        <button @click="batchImport" class="btn-submit">🚀 批量导入</button>
        <div v-if="importResult" class="import-result">
          导入成功：{{ importResult.successCount }} 题，失败：{{ importResult.failCount }} 题
        </div>
      </div>
    </div>

    <!-- 题目列表（已集成批量删除） -->
    <div v-if="currentTab === 'list'" class="tab-content">
      <div class="list-card">
        <div class="list-header">
          <h3>题目列表</h3>
          <div class="list-actions">
            <!-- 全选复选框 -->
            <label class="select-all">
              <input type="checkbox" v-model="selectAll" @change="toggleAll">
              全选
            </label>
            <!-- 批量删除按钮 -->
            <button @click="batchDelete" :disabled="selectedIds.length === 0" class="btn-batch-delete">
              批量删除 ({{ selectedIds.length }})
            </button>
            <button @click="loadQuestionList" class="btn-refresh">🔄 刷新</button>
          </div>
        </div>
        <div class="question-list">
          <div v-for="q in questionList" :key="q.id" class="list-item">
            <!-- 复选框列 -->
            <input type="checkbox" class="item-checkbox" v-model="selectedIds" :value="q.id">
            <div class="item-content">
              <div class="item-header">
                <span class="item-tag">{{ q.year ? q.year + '年 | ' : '' }}{{ q.subject }} | {{ q.type }}</span>
                <button @click="deleteQuestion(q.id)" class="btn-delete">删除</button>
              </div>
              <div class="item-question">{{ q.question }}</div>
              <div class="item-answer">正确答案：{{ q.answer }}</div>
            </div>
          </div>
        </div>
        <div v-if="questionList.length === 0" class="empty-tip">
          暂无题目，请先添加
        </div>
      </div>
    </div>

    <!-- 用户管理 -->
    <div v-if="currentTab === 'users'" class="tab-content">
      <div class="list-card">
        <div class="list-header">
          <h3>用户列表</h3>
          <button @click="loadUserList" class="btn-refresh">🔄 刷新</button>
        </div>
        <div class="user-list">
          <div v-for="user in userList" :key="user.id" class="user-item">
            <div class="user-info">
              <img :src="user.avatar || 'https://picsum.photos/60/60?random=' + user.id" alt="头像" class="user-avatar">
              <div class="user-details">
                <div class="user-name">{{ user.username }}</div>
                <div class="user-meta">
                  <span>注册时间：{{ user.registerTime }}</span>
                  <span v-if="user.phone">📱 {{ user.phone }}</span>
                  <span v-if="user.qq">QQ：{{ user.qq }}</span>
                  <span v-if="user.location">📍 {{ user.location }}</span>
                </div>
                <div class="user-bio" v-if="user.bio">{{ user.bio }}</div>
              </div>
            </div>
            <button @click="deleteUser(user.id)" class="btn-delete">删除用户</button>
          </div>
        </div>
        <div v-if="userList.length === 0" class="empty-tip">
          暂无注册用户
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const adminUsername = ref('')

// 年份列表：2009-2025年
const yearList = computed(() => {
  const list = []
  for (let year = 2025; year >= 2009; year--) {
    list.push(year)
  }
  return list
})

// 标签页
const tabs = [
  { key: 'single', label: '添加单题' },
  { key: 'batch', label: '批量导入' },
  { key: 'list', label: '题目列表' },
  { key: 'users', label: '用户管理' }
]
const currentTab = ref('single')

// 单题表单
const singleForm = reactive({
  type: '真题',
  year: 2025,
  subject: '数据结构',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  answer: 'A',
  difficulty: '简单',
  analysis: ''
})

// 切换题目类型
const onTypeChange = () => {
  if (singleForm.type === '真题') {
    singleForm.subject = ''
  } else {
    singleForm.year = 2025
  }
}

// 批量导入
const batchText = ref('')
const importResult = ref(null)

// 题目列表
const questionList = ref([])
// 用户列表
const userList = ref([])

// ---------- 批量删除相关 ----------
const selectedIds = ref([])
const selectAll = ref(false)

// 全选/取消全选
const toggleAll = () => {
  if (selectAll.value) {
    selectedIds.value = questionList.value.map(item => item.id)
  } else {
    selectedIds.value = []
  }
}

// 监听 selectedIds 变化，更新全选状态
watch(selectedIds, (newVal) => {
  if (newVal.length === questionList.value.length && questionList.value.length > 0) {
    selectAll.value = true
  } else {
    selectAll.value = false
  }
})

// 批量删除
const batchDelete = async () => {
  console.log('准备删除的ID列表:', selectedIds.value);
  if (selectedIds.value.length === 0) return
  if (!confirm(`确定要删除选中的 ${selectedIds.value.length} 道题目吗？`)) return

  try {
    const res = await fetch('/api/questions/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value })
    })
    const data = await res.json()
    if (data.success) {
      alert(`✅ 成功删除 ${data.deletedCount} 道题目`)
      selectedIds.value = []
      await loadQuestionList()
    } else {
      alert('删除失败：' + data.error)
    }
  } catch (err) {
    console.error(err)
    alert('请求失败')
  }
}
// ---------------------------------

onMounted(() => {
  const user = localStorage.getItem('currentUser')
  if (!user) {
    alert('请先登录！')
    router.push('/login')
    return
  }
  const parsedUser = JSON.parse(user)
  if (parsedUser.username !== 'admin') {
    alert('只有管理员才能访问此页面！')
    router.push('/')
    return
  }
  adminUsername.value = parsedUser.username
  loadQuestionList()
  loadUserList()
})

// 添加单题
const addSingleQuestion = async () => {
  if (!singleForm.question || !singleForm.optionA) {
    alert('请填写完整题目和选项')
    return
  }
  
  const question = {
    year: singleForm.type === '真题' ? singleForm.year : null,
    subject: singleForm.type === '自定义题' ? singleForm.subject : '',
    question: singleForm.question,
    options: [
      'A. ' + singleForm.optionA,
      'B. ' + singleForm.optionB,
      'C. ' + singleForm.optionC,
      'D. ' + singleForm.optionD
    ],
    answer: singleForm.answer,
    analysis: singleForm.analysis,
    difficulty: singleForm.difficulty,
    type: singleForm.type
  }
  
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    })
    
    if (res.ok) {
      alert('✅ 添加成功！')
      // 清空表单
      singleForm.question = ''
      singleForm.optionA = ''
      singleForm.optionB = ''
      singleForm.optionC = ''
      singleForm.optionD = ''
      singleForm.analysis = ''
      loadQuestionList()
    }
  } catch (err) {
    alert('添加失败')
  }
}

// 批量导入
const batchImport = async () => {
  try {
    const questions = JSON.parse(batchText.value)
    const res = await fetch('/api/admin/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questions)
    })
    
    if (res.ok) {
      importResult.value = await res.json()
      alert(`✅ 导入完成！成功：${importResult.value.successCount} 题`)
      batchText.value = ''
      loadQuestionList()
    }
  } catch (err) {
    alert('JSON格式错误，请检查输入')
  }
}

// 加载题目列表
const loadQuestionList = async () => {
  try {
    const res = await fetch('/api/questions')
    questionList.value = await res.json()
    console.log('题目列表:', questionList.value);
  } catch (err) {
    console.error('加载失败')
  }
}

// 删除单个题目
const deleteQuestion = async (id) => {
  if (!confirm('确定要删除这道题吗？')) return
  try {
    await fetch(`/api/questions/${id}`, { method: 'DELETE' })
    alert('✅ 删除成功')
    loadQuestionList()
  } catch (err) {
    alert('删除失败')
  }
}

// 加载用户列表
const loadUserList = async () => {
  try {
    const res = await fetch('/api/admin/users')
    userList.value = await res.json()
  } catch (err) {
    console.error('用户列表加载失败')
  }
}

// 删除用户
const deleteUser = async (id) => {
  if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return
  try {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    alert('✅ 用户删除成功')
    loadUserList()
  } catch (err) {
    alert('删除失败')
  }
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('currentUser')
  router.push('/login')
}
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 顶部导航 */
.admin-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.admin-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.4rem;
}
.header-right {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.btn-logout {
  padding: 0.5rem 1.2rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-logout:hover {
  background: #e8e8e8;
}

/* 标签页 */
.tab-nav {
  display: flex;
  gap: 0.5rem;
  background: white;
  padding: 0 2rem;
  border-bottom: 1px solid #e8e8e8;
}
.tab-item {
  padding: 1rem 1.5rem;
  cursor: pointer;
  color: #666;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}
.tab-item:hover {
  color: #667eea;
}
.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

/* 内容区 */
.tab-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 2rem;
}
.form-card, .list-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.form-card h3, .list-card h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}
.form-row, .options-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #667eea;
}
.btn-submit {
  width: 100%;
  padding: 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}
.btn-submit:hover {
  background: #5568d3;
}

/* 批量导入 */
.tips {
  color: #666;
  margin-bottom: 1rem;
}
.batch-textarea {
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-family: 'Consolas', monospace;
  font-size: 0.95rem;
  box-sizing: border-box;
  margin-bottom: 1rem;
}
.import-result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  color: #52c41a;
  font-weight: 500;
}

/* 列表公共样式 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.list-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.select-all {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  user-select: none;
}
.btn-batch-delete {
  padding: 0.6rem 1.2rem;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}
.btn-batch-delete:hover:not(:disabled) {
  background: #f14545;
}
.btn-batch-delete:disabled {
  background: #f8b3b3;
  cursor: not-allowed;
}
.btn-refresh {
  padding: 0.6rem 1.2rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
}
.btn-refresh:hover {
  background: #e8e8e8;
}
.question-list, .user-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.list-item, .user-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}
.item-checkbox {
  margin-top: 0.3rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}
.item-content {
  flex: 1;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}
.item-tag {
  background: #667eea15;
  color: #667eea;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}
.item-question, .user-name {
  color: #333;
  margin-bottom: 0.5rem;
  line-height: 1.6;
  font-weight: 600;
}
.item-answer, .user-meta {
  color: #666;
  font-size: 0.95rem;
}
.user-meta span {
  margin-right: 1rem;
}
.user-bio {
  color: #999;
  font-size: 0.9rem;
  margin-top: 0.3rem;
}
.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1rem;
}
.user-details {
  flex: 1;
}
.btn-delete {
  padding: 0.4rem 1rem;
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-delete:hover {
  background: #ff4d4f;
  color: white;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 2rem;
}

/* 响应式 */
@media (max-width: 900px) {
  .form-row, .options-row {
    grid-template-columns: 1fr;
  }
  .user-info {
    flex-direction: column;
    text-align: center;
  }
  .user-avatar {
    margin-right: 0;
    margin-bottom: 1rem;
  }
}
</style>