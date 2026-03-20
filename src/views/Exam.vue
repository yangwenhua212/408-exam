<template>
  <div class="exam-container">
    <!-- 顶部导航栏 -->
    <header class="exam-header">
      <router-link to="/" class="back-btn">← 返回首页</router-link>
      <div class="exam-info">
        <span>刷题</span>
        <!-- 科目筛选器（动态加载） -->
        <div class="filter-group" v-if="showSubjectFilter">
          <select v-model="selectedSubject" class="filter-select">
            <option value="">全部科目</option>
            <option v-for="sub in subjects" :key="sub" :value="sub">{{ sub }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 加载中提示 -->
    <main class="exam-main" v-if="loading">
      <div class="loading-box">加载题目中，请稍候...</div>
    </main>

    <!-- 题目主体区域 -->
    <main class="exam-main" v-else-if="questionList.length > 0">
      <div class="question-card">
        <!-- 题目信息 -->
        <div class="question-header">
          <span class="question-tag">{{ currentQuestion.year }}年 | {{ currentQuestion.subject }}</span>
          <span class="question-difficulty">难度：{{ currentQuestion.difficulty }}</span>
        </div>

        <!-- 题干 -->
        <div class="question-content">
          <h2>{{ currentIndex + 1 }}. {{ currentQuestion.question }}</h2>
        </div>

        <!-- 选项列表 -->
        <div class="options-list">
          <div
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            class="option-item"
            :class="{
              'selected': userAnswer === option.charAt(0),
              'correct': isSubmitted && option.charAt(0) === currentQuestion.answer,
              'wrong': isSubmitted && userAnswer === option.charAt(0) && option.charAt(0) !== currentQuestion.answer
            }"
            @click="selectOption(option.charAt(0))"
            :disabled="isSubmitted"
          >
            {{ option }}
          </div>
        </div>

        <!-- 答案解析（提交后显示） -->
        <div class="analysis-box" v-if="isSubmitted">
          <div class="analysis-header">
            <h3>正确答案：{{ currentQuestion.answer }}</h3>
          </div>
          <div class="analysis-content">
            <strong>解析：</strong>{{ currentQuestion.analysis }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button @click="prevQuestion" :disabled="currentIndex === 0" class="btn-secondary">上一题</button>
          <button
            v-if="!isSubmitted"
            @click="submitAnswer"
            :disabled="!userAnswer"
            class="btn-primary"
          >
            提交答案
          </button>
          <button
            v-else
            @click="nextQuestion"
            :disabled="currentIndex === questionList.length - 1"
            class="btn-primary"
          >
            下一题
          </button>
        </div>
      </div>
    </main>

    <!-- 空数据提示 -->
    <div class="empty-box" v-else>
      <h3>该科目下暂无题目，请先在后台添加或切换科目</h3>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 判断当前模式：normal 普通刷题，error 错题刷题
const mode = ref(route.query.mode || 'normal')

// 是否显示科目筛选器（普通模式显示，错题模式隐藏）
const showSubjectFilter = computed(() => mode.value !== 'error')

// 核心数据
const questionList = ref([])
const currentIndex = ref(0)
const userAnswer = ref('')
const isSubmitted = ref(false)
const selectedSubject = ref('')
const subjects = ref([])
const loading = ref(false)

// 计算当前题目
const currentQuestion = computed(() => {
  return questionList.value[currentIndex.value] || {}
})

// ---------- 数据加载 ----------
// 加载科目列表（仅普通模式需要，但为了简单始终加载，不影响错题模式）
const loadSubjects = async () => {
  try {
    const res = await fetch('/api/subjects')
    if (!res.ok) throw new Error('加载科目列表失败')
    subjects.value = await res.json()
  } catch (err) {
    console.error(err)
    // 降级为默认科目
    subjects.value = ['数据结构', '计算机组成原理', '操作系统', '计算机网络']
  }
}

// 加载题目
const loadQuestions = async () => {
  loading.value = true
  try {
    let url
    if (mode.value === 'error') {
      // 错题模式：需要用户ID
      if (!userStore.user?.id) {
        alert('请先登录')
        router.push('/login')
        return
      }
      url = `/api/user/errors/questions?userId=${userStore.user.id}`
    } else {
      // 普通模式
      url = '/api/questions?type=自定义题'
      if (selectedSubject.value) {
        url += `&subject=${encodeURIComponent(selectedSubject.value)}`
      }
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error('加载题目失败')
    questionList.value = await res.json()
    // 重置状态
    currentIndex.value = 0
    userAnswer.value = ''
    isSubmitted.value = false
  } catch (err) {
    console.error(err)
    alert('题目加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// ---------- 路由同步 ----------
// 从 URL 初始化科目（仅普通模式有效，错题模式不监听）
watch(
  () => route.query.subject,
  (newSubject) => {
    if (mode.value !== 'error' && newSubject !== undefined && newSubject !== selectedSubject.value) {
      selectedSubject.value = newSubject || ''
    }
  },
  { immediate: true }
)

// 科目变化时重新加载题目（仅普通模式）
watch(selectedSubject, (newVal) => {
  if (mode.value !== 'error') {
    router.replace({ query: { subject: newVal || undefined } })
    loadQuestions()
  }
})

// 监听 mode 变化（例如从错题本跳转时），重新加载题目
watch(mode, () => {
  loadQuestions()
})

// ---------- 答题逻辑 ----------
const selectOption = (optionKey) => {
  if (isSubmitted.value) return
  userAnswer.value = optionKey
}

const submitAnswer = () => {
  isSubmitted.value = true
  if (userAnswer.value !== currentQuestion.value.answer) {
    addToErrorBook()
  }
}

const prevQuestion = () => {
  if (currentIndex.value === 0) return
  currentIndex.value--
  resetQuestionState()
}

const nextQuestion = () => {
  if (currentIndex.value === questionList.value.length - 1) {
    alert('已经是最后一题啦！')
    return
  }
  currentIndex.value++
  resetQuestionState()
}

const resetQuestionState = () => {
  userAnswer.value = ''
  isSubmitted.value = false
}

// ---------- 错题本（对接后端）----------
const addToErrorBook = async () => {
  // 错题模式下不再重复添加错题
  if (mode.value === 'error') return
  if (!userStore.user?.id) return
  try {
    await fetch('/api/user/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userStore.user.id,
        questionId: currentQuestion.value.id,
        subject: currentQuestion.value.subject,
        userAnswer: userAnswer.value
      })
    })
  } catch (err) {
    console.error('保存错题失败', err)
  }
}

// ---------- 初始化 ----------
onMounted(async () => {
  await loadSubjects()
  await loadQuestions() // 根据当前 mode 加载题目
})
</script>

<style scoped>
.exam-container {
  min-height: 100vh;
  /* 统一淡蓝渐变 */
  background: linear-gradient(135deg, #d6f4ff 0%, #a8dfff 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
}
/* 顶部导航 */
.exam-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.back-btn {
  text-decoration: none;
  color: #2b6cb0;
  font-weight: 500;
  transition: color 0.3s ease;
}
.back-btn:hover {
  color: #2c5282;
}
.exam-info {
  display: flex;
  gap: 2rem;
  align-items: center;
  font-weight: 500;
  color: #2d3748;
}
/* 筛选器样式 */
.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.3s ease;
}
.filter-select:focus {
  border-color: #2b6cb0;
}
/* 题目主体 */
.exam-main {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 1rem;
}
.question-card {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.question-tag {
  background: #ebf8ff;
  color: #2b6cb0;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}
.question-difficulty {
  color: #718096;
  font-size: 0.9rem;
}
.question-content h2 {
  font-size: 1.2rem;
  color: #2d3748;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-weight: 600;
}
/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}
.option-item {
  padding: 1rem 1.2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  line-height: 1.5;
  background: #fff;
}
.option-item:hover:not(:disabled) {
  border-color: #2b6cb0;
  background: #ebf8ff;
}
.option-item.selected {
  border-color: #2b6cb0;
  background: #ebf8ff;
}
.option-item.correct {
  border-color: #38a169;
  background: #f0fff4;
}
.option-item.wrong {
  border-color: #e53e3e;
  background: #fff5f5;
}
.option-item:disabled {
  cursor: not-allowed;
}
/* 解析框 */
.analysis-box {
  background: #f7fafc;
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 2rem;
}
.analysis-header h3 {
  color: #38a169;
  margin: 0 0 0.8rem 0;
  font-size: 1.1rem;
}
.analysis-content {
  color: #2d3748;
  line-height: 1.6;
  font-size: 0.95rem;
}
/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.btn-primary, .btn-secondary {
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}
.btn-primary {
  background: #2b6cb0;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #2c5282;
}
.btn-primary:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}
.btn-secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}
.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* 加载提示 */
.loading-box {
  text-align: center;
  padding: 4rem;
  color: #718096;
  font-size: 1.1rem;
}
/* 空数据 */
.empty-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #718096;
}
/* 手机适配 */
@media (max-width: 768px) {
  .exam-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .exam-info {
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .exam-main {
    padding: 0 1rem;
    margin: 1rem auto;
  }
  .question-card {
    padding: 1.5rem 1rem;
  }
}
</style>