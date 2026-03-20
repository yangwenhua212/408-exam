<template>
  <div class="admin-dashboard">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <h1>408题库管理后台</h1>
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

        <!-- 第二行：年份/科目/难度 -->
        <div class="form-row">
          <div class="form-group" v-if="singleForm.type === '真题'">
            <label>年份</label>
            <select v-model="singleForm.year">
              <option v-for="year in yearList" :key="year" :value="year">{{ year }}年</option>
            </select>
          </div>

          <div class="form-group" v-if="singleForm.type === '自定义题'">
            <label>科目</label>
            <select v-model="singleForm.subject">
              <option value="数据结构">数据结构</option>
              <option value="计算机组成原理">计算机组成原理</option>
              <option value="操作系统">操作系统</option>
              <option value="计算机网络">计算机网络</option>
            </select>
          </div>

          <div class="form-group">
            <label>难度</label>
            <select v-model="singleForm.difficulty">
              <option value="简单">简单</option>
              <option value="中等">中等</option>
              <option value="困难">困难</option>
            </select>
          </div>
        </div>

        <!-- 第三行：题型 -->
        <div class="form-row" style="grid-template-columns: 1fr;">
          <div class="form-group full-width">
            <label>题型</label>
            <select v-model="singleForm.questionType">
              <option v-for="type in questionTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
        </div>

        <!-- 题干 + 图片上传 -->
        <div class="form-group full-width">
          <label>题干（支持图片）</label>
          <div style="display: flex; gap: 10px; margin-bottom: 8px;">
            <button type="button" class="btn-upload-img" @click="triggerUpload">
              上传图片
            </button>
            <span style="color: #718096; font-size: 0.85rem;">
              支持jpg/png/gif，最大5MB
            </span>
          </div>
          <textarea 
            v-model="singleForm.question" 
            placeholder="输入题目内容（支持HTML和图片）..."
            rows="6"
          ></textarea>
          <input 
            type="file" 
            ref="imageInput" 
            accept="image/*" 
            style="display: none;"
            @change="handleImageUpload"
          >
        </div>

        <!-- 选项 -->
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

        <!-- 正确答案 -->
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

        <!-- 答案解析 -->
        <div class="form-group">
          <label>答案解析</label>
          <textarea v-model="singleForm.analysis" placeholder="请输入答案解析"></textarea>
        </div>

        <button @click="addSingleQuestion" class="btn-submit">添加题目</button>
      </div>
    </div>

    <!-- 批量导入 -->
    <div v-if="currentTab === 'batch'" class="tab-content">
      <div class="form-card">
        <h3>批量导入题目</h3>
        <p class="tips">请将题目整理为JSON数组格式，粘贴到下方输入框（请包含question_type字段）</p>
        <textarea v-model="batchText" class="batch-textarea" placeholder='[
  {
    "year": 2025,
    "subject": "数据结构",
    "question": "题干",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "C",
    "analysis": "解析",
    "difficulty": "简单",
    "type": "真题",
    "question_type": "单选题"
  }
]'></textarea>
        <button @click="batchImport" class="btn-submit">批量导入</button>
        <div v-if="importResult" class="import-result">
          导入成功：{{ importResult.successCount }} 题，失败：{{ importResult.failCount }} 题
        </div>
      </div>
    </div>

    <!-- 题目列表（集成筛选功能） -->
    <div v-if="currentTab === 'list'" class="tab-content">
      <div class="list-card">
        <div class="list-header">
          <h3>题目列表</h3>
          <div class="list-actions">
            <!-- 筛选控件组 -->
            <div class="filter-group">
              <select v-model="filterSubject" class="filter-select">
                <option value="">全部科目</option>
                <option v-for="sub in subjectOptions" :key="sub" :value="sub">{{ sub }}</option>
              </select>
              <select v-model="filterYear" class="filter-select">
                <option value="">全部年份</option>
                <option v-for="year in yearList" :key="year" :value="year">{{ year }}年</option>
              </select>
              <select v-model="filterType" class="filter-select">
                <option value="">全部题型</option>
                <option v-for="type in questionTypes" :key="type" :value="type">{{ type }}</option>
              </select>
              <button @click="resetFilters" class="btn-reset">重置</button>
            </div>
            <!-- 批量删除和刷新 -->
            <label class="select-all">
              <input type="checkbox" v-model="selectAll" @change="toggleAll"> 全选
            </label>
            <button @click="batchDelete" :disabled="selectedIds.length === 0" class="btn-batch-delete">
              批量删除 ({{ selectedIds.length }})
            </button>
            <button @click="loadQuestionList" class="btn-refresh">刷新</button>
          </div>
        </div>
        <div class="question-list">
          <div v-for="q in questionList" :key="q.id" class="list-item">
            <input type="checkbox" class="item-checkbox" v-model="selectedIds" :value="q.id">
            <div class="item-content">
              <div class="item-header">
                <span class="item-tag">
                  {{ q.year ? q.year + '年 | ' : '' }}{{ q.subject }} | {{ q.type }} | {{ q.question_type || '单选题' }}
                </span>
                <button @click="deleteQuestion(q.id)" class="btn-delete">删除</button>
              </div>
              <div class="item-question" v-html="q.question"></div>
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
          <button @click="loadUserList" class="btn-refresh">刷新</button>
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
const imageInput = ref(null)

// 筛选条件
const filterSubject = ref('')
const filterYear = ref('')
const filterType = ref('')
const subjectOptions = ref([]) // 科目选项

// 题型列表
const questionTypes = ref(['单选题']) // 默认值

// 年份列表
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
  analysis: '',
  questionType: '单选题'
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

// 批量删除相关
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

watch(selectedIds, (newVal) => {
  if (newVal.length === questionList.value.length && questionList.value.length > 0) {
    selectAll.value = true
  } else {
    selectAll.value = false
  }
})

// 批量删除
const batchDelete = async () => {
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

// 图片上传
const triggerUpload = () => {
  if (imageInput.value) {
    imageInput.value.click()
  }
}

const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('image', file)

  try {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''
    const res = await fetch(`${baseUrl}/api/upload-image`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()

    if (data.success) {
      const imgTag = `<br><img src="${data.url}" style="max-width:100%;height:auto;border-radius:8px;margin:1rem 0;" /><br>`
      singleForm.question += imgTag
      if (imageInput.value) {
        imageInput.value.value = ''
      }
      alert('✅ 图片上传成功！已自动插入到题干中～')
    } else {
      alert('❌ 上传失败：' + data.error)
    }
  } catch (err) {
    console.error('上传出错：', err)
    alert('❌ 上传失败！请检查后端服务是否启动～')
  }
}

// 加载科目列表
const loadSubjects = async () => {
  try {
    const res = await fetch('/api/subjects')
    if (res.ok) {
      subjectOptions.value = await res.json()
    }
  } catch (err) {
    console.error('加载科目列表失败', err)
  }
}

// 加载题型列表
const loadQuestionTypes = async () => {
  try {
    const res = await fetch('/api/question-types')
    if (res.ok) {
      const types = await res.json()
      questionTypes.value = types
    }
  } catch (err) {
    console.error('加载题型列表失败', err)
  }
}

// 加载题目列表（支持筛选）
const loadQuestionList = async () => {
  try {
    const params = new URLSearchParams()
    if (filterSubject.value) params.append('subject', filterSubject.value)
    if (filterYear.value) params.append('year', filterYear.value)
    if (filterType.value) params.append('questionType', filterType.value)
    
    const url = `/api/questions?${params.toString()}`
    const res = await fetch(url)
    questionList.value = await res.json()
    // 重置全选状态
    selectedIds.value = []
    selectAll.value = false
  } catch (err) {
    console.error('加载题目失败', err)
  }
}

// 重置筛选条件
const resetFilters = () => {
  filterSubject.value = ''
  filterYear.value = ''
  filterType.value = ''
  loadQuestionList()
}

// 监听筛选条件变化，自动刷新
watch([filterSubject, filterYear, filterType], () => {
  loadQuestionList()
})

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
  loadSubjects()        // 加载科目
  loadQuestionTypes()   // 加载题型
  loadQuestionList()    // 加载题目列表（带筛选）
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
    type: singleForm.type,
    questionType: singleForm.questionType
  }
  
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    })
    
    if (res.ok) {
      alert('✅ 添加成功！')
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
/* 原有样式保持不变，仅添加筛选控件样式 */
.filter-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}
.filter-select:focus {
  border-color: #2b6cb0;
}
.btn-reset {
  padding: 0.5rem 1rem;
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-reset:hover {
  background: #e2e8f0;
}
.admin-dashboard {
  min-height: 100vh;
  /* 统一淡蓝渐变 */
  background: linear-gradient(135deg, #d6f4ff 0%, #a8dfff 100%);
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
  color: #2b6cb0;
  font-size: 1.4rem;
}
.header-right {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.btn-logout {
  padding: 0.5rem 1.2rem;
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-logout:hover {
  background: #e2e8f0;
}
/* 标签页 */
.tab-nav {
  display: flex;
  gap: 0.5rem;
  background: white;
  padding: 0 2rem;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.tab-item {
  padding: 1rem 1.2rem;
  cursor: pointer;
  color: #4a5568;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  white-space: nowrap;
}
.tab-item:hover {
  color: #2b6cb0;
}
.tab-item.active {
  color: #2b6cb0;
  border-bottom-color: #2b6cb0;
}
/* 内容区 */
.tab-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.form-card, .list-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.form-card h3, .list-card h3 {
  margin: 0 0 1.5rem 0;
  color: #2d3748;
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
  color: #2d3748;
  font-weight: 500;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #2b6cb0;
}
.btn-submit {
  width: 100%;
  padding: 1rem;
  background: #2b6cb0;
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
  background: #2c5282;
}
/* 批量导入 */
.tips {
  color: #718096;
  margin-bottom: 1rem;
}
.batch-textarea {
  width: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: 'Consolas', monospace;
  font-size: 0.95rem;
  box-sizing: border-box;
  margin-bottom: 1rem;
}
.import-result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0fff4;
  border: 1px solid #9ae6b4;
  border-radius: 8px;
  color: #38a169;
  font-weight: 500;
}
/* 列表公共样式 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.list-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
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
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
}
.btn-batch-delete:hover:not(:disabled) {
  background: #c53030;
}
.btn-batch-delete:disabled {
  background: #feb2b2;
  cursor: not-allowed;
}
.btn-refresh {
  padding: 0.6rem 1.2rem;
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
}
.btn-refresh:hover {
  background: #e2e8f0;
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
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #2b6cb0;
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
  flex-wrap: wrap;
  gap: 0.5rem;
}
.item-tag {
  background: #ebf8ff;
  color: #2b6cb0;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}
.item-question, .user-name {
  color: #2d3748;
  margin-bottom: 0.5rem;
  line-height: 1.6;
  font-weight: 600;
}
/* 新增：题目列表中的图片样式 */
.item-question img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5rem 0;
}
.item-answer, .user-meta {
  color: #4a5568;
  font-size: 0.95rem;
}
.user-meta span {
  margin-right: 1rem;
}
.user-bio {
  color: #718096;
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
  background: #fff5f5;
  color: #e53e3e;
  border: 1px solid #feb2b2;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-delete:hover {
  background: #e53e3e;
  color: white;
}
.empty-tip {
  text-align: center;
  color: #718096;
  padding: 2rem;
}
/* 手机适配 */
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
  .tab-nav {
    padding: 0 1rem;
  }
  .tab-item {
    padding: 1rem 0.8rem;
  }
}

/* 上传图片按钮样式 */
.btn-upload-img {
  padding: 0.6rem 1.2rem;
  background: #2b6cb0;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}
.btn-upload-img:hover {
  background: #2c5282;
}
</style>