<template>
  <div class="exam-container">
    <!-- 顶部导航栏 -->
    <header class="exam-header">
      <router-link to="/" class="back-btn">← 返回首页</router-link>
      <div class="exam-info">
        <span>408考研真题刷题</span>
        <!-- 科目筛选器 -->
        <div class="filter-group">
          <select v-model="selectedSubject" @change="loadQuestions" class="filter-select">
            <option value="">全部科目</option>
            <option value="数据结构">数据结构</option>
            <option value="计算机组成原理">计算机组成原理</option>
            <option value="操作系统">操作系统</option>
            <option value="计算机网络">计算机网络</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 题目主体区域 -->
    <main class="exam-main" v-if="questionList.length > 0">
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
      <h3>该科目下暂无自定义题，请先在后台添加</h3>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 核心数据
const questionList = ref([]) // 所有自定义题列表
const currentIndex = ref(0) // 当前题目索引
const userAnswer = ref('') // 用户选中的答案
const isSubmitted = ref(false) // 是否提交答案
const selectedSubject = ref('') // 选中的科目

// 计算当前题目
const currentQuestion = computed(() => {
  return questionList.value[currentIndex.value] || {}
})

// 从后端获取题目（只加载自定义题，支持科目筛选）
const loadQuestions = async () => {
  try {
    // 核心修改：默认只加载「自定义题」
    let url = '/api/questions?type=自定义题'
    // 如果选了科目，拼接查询参数（注意用 & 而不是 ?）
    if (selectedSubject.value) {
      url += `&subject=${encodeURIComponent(selectedSubject.value)}`
    }
    
    const res = await fetch(url)
    questionList.value = await res.json()
    
    // 切换科目后，重置答题状态
    currentIndex.value = 0
    userAnswer.value = ''
    isSubmitted.value = false
  } catch (err) {
    console.error('题目数据加载失败：', err)
    alert('题目数据加载失败，请确保后端已启动')
  }
}

// 页面加载时获取题目数据
onMounted(async () => {
  await loadQuestions()
})

// 选择选项
const selectOption = (optionKey) => {
  if (isSubmitted.value) return // 提交后不能再选
  userAnswer.value = optionKey
}

// 提交答案
const submitAnswer = () => {
  isSubmitted.value = true

  // 答错的题，自动加入错题本
  if (userAnswer.value !== currentQuestion.value.answer) {
    addToErrorBook()
  }
}

// 上一题
const prevQuestion = () => {
  if (currentIndex.value === 0) return
  currentIndex.value--
  // 重置答题状态
  resetQuestionState()
}

// 下一题
const nextQuestion = () => {
  if (currentIndex.value === questionList.value.length - 1) {
    alert('已经是最后一题啦！')
    return
  }
  currentIndex.value++
  // 重置答题状态
  resetQuestionState()
}

// 重置单题状态
const resetQuestionState = () => {
  userAnswer.value = ''
  isSubmitted.value = false
}

// 加入错题本（和你现有错题本功能联动）
const addToErrorBook = () => {
  // 获取当前登录用户
  const currentUser = localStorage.getItem('currentUser')
  if (!currentUser) return

  const username = JSON.parse(currentUser).username
  // 错题本key：按用户名区分，多用户隔离
  const errorBookKey = `errorBook_${username}`
  
  // 获取已有的错题
  const oldErrorList = JSON.parse(localStorage.getItem(errorBookKey) || '[]')
  
  // 去重：已经在错题本的题，不重复添加
  const isExist = oldErrorList.some(item => item.id === currentQuestion.value.id)
  if (!isExist) {
    // 新增错题，记录答错时间
    const newErrorItem = {
      ...currentQuestion.value,
      wrongTime: new Date().toLocaleString(),
      userWrongAnswer: userAnswer.value
    }
    oldErrorList.push(newErrorItem)
    // 保存到localStorage
    localStorage.setItem(errorBookKey, JSON.stringify(oldErrorList))
  }
}
</script>

<style scoped>
.exam-container {
  min-height: 100vh;
  background-color: #f5f7fa;
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
  color: #667eea;
  font-weight: 500;
  transition: color 0.3s ease;
}
.back-btn:hover {
  color: #5568d3;
}
.exam-info {
  display: flex;
  gap: 2rem;
  align-items: center;
  font-weight: 500;
  color: #333;
}
/* 筛选器样式 */
.filter-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.3s ease;
}
.filter-select:focus {
  border-color: #667eea;
}

/* 题目主体 */
.exam-main {
  flex: 1;
  max-width: 900px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 2rem;
}
.question-card {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.question-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.question-tag {
  background: #667eea15;
  color: #667eea;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}
.question-difficulty {
  color: #999;
  font-size: 0.9rem;
}
.question-content h2 {
  font-size: 1.2rem;
  color: #333;
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
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  line-height: 1.5;
}
.option-item:hover:not(:disabled) {
  border-color: #667eea;
  background: #667eea08;
}
.option-item.selected {
  border-color: #667eea;
  background: #667eea15;
}
.option-item.correct {
  border-color: #52c41a;
  background: #f6ffed;
}
.option-item.wrong {
  border-color: #ff4d4f;
  background: #fff2f0;
}
.option-item:disabled {
  cursor: not-allowed;
}

/* 解析框 */
.analysis-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 2rem;
}
.analysis-header h3 {
  color: #52c41a;
  margin: 0 0 0.8rem 0;
  font-size: 1.1rem;
}
.analysis-content {
  color: #333;
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
  background: #667eea;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}
.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e8e8e8;
}
.btn-secondary:hover:not(:disabled) {
  background: #e8e8e8;
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 空数据 */
.empty-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

/* 响应式 */
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