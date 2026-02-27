<template>
  <div class="mock-container">
    <!-- 考试未开始：欢迎页 -->
    <div v-if="!isStarted" class="start-screen">
      <div class="start-card">
        <h1>📚 408选择题专项模拟</h1>
        <p class="desc">考试时长：90分钟 | 满分：80分</p>
        <p class="tips">共40道单选题，每题2分，中途不要刷新页面</p>
        
        <div class="filter-group">
          <label>选择考试年份：</label>
          <select v-model="selectedYear" class="filter-select">
            <option value="">全部年份随机</option>
            <option v-for="year in yearList" :key="year" :value="year">{{ year }}年</option>
          </select>
        </div>

        <button @click="startExam" class="btn-start">开始考试</button>
      </div>
    </div>

    <!-- 考试进行中 -->
    <div v-else-if="isStarted && !isFinished" class="exam-screen">
      <!-- 顶部考试栏 -->
      <header class="mock-header">
        <div class="header-left">
          <span class="exam-title">408选择题专项模拟</span>
          <span class="exam-progress">已答：{{ answeredCount }} / {{ questionList.length }}</span>
        </div>
        <div class="header-right">
          <div class="timer" :class="{ 'warning': timeLeft <= 300 }">
            ⏱️ 剩余时间：{{ formatTime }}
          </div>
          <button @click="submitExam" class="btn-submit">交卷</button>
        </div>
      </header>

      <div class="exam-body">
        <!-- 左侧：题目区 -->
        <main class="question-area">
          <div class="question-card">
            <div class="question-header">
              <span class="question-tag">{{ currentQuestion.year }}年 | {{ currentQuestion.subject }}</span>
              <span class="question-score">分值：2分</span>
            </div>

            <div class="question-content">
              <h2>{{ currentIndex + 1 }}. {{ currentQuestion.question }}</h2>
            </div>

            <div class="options-list">
              <div
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                class="option-item"
                :class="{ 'selected': userAnswers[currentQuestion.id] === option.charAt(0) }"
                @click="selectAnswer(option.charAt(0))"
              >
                {{ option }}
              </div>
            </div>

            <div class="nav-buttons">
              <button @click="prevQuestion" :disabled="currentIndex === 0" class="btn-nav">上一题</button>
              <button @click="nextQuestion" :disabled="currentIndex === questionList.length - 1" class="btn-nav">下一题</button>
            </div>
          </div>
        </main>

        <!-- 右侧：答题卡 -->
        <aside class="answer-card">
          <h3>答题卡</h3>
          <div class="card-grid">
            <div
              v-for="(q, index) in questionList"
              :key="q.id"
              class="card-item"
              :class="{
                'answered': userAnswers[q.id],
                'current': index === currentIndex
              }"
              @click="jumpToQuestion(index)"
            >
              {{ index + 1 }}
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- 考试结束：成绩报告 -->
    <div v-else-if="isFinished" class="result-screen">
      <div class="result-card">
        <h1>🎉 考试完成！</h1>
        <div class="score-box">
          <div class="score-item">
            <span class="score-label">总分</span>
            <span class="score-value">{{ totalScore }} / 80</span>
          </div>
          <div class="score-item">
            <span class="score-label">正确率</span>
            <span class="score-value">{{ accuracy }}%</span>
          </div>
          <div class="score-item">
            <span class="score-label">用时</span>
            <span class="score-value">{{ usedTime }}</span>
          </div>
        </div>

        <div class="result-detail">
          <h3>📋 答题详情</h3>
          <div class="review-list">
            <div
              v-for="(item, index) in reviewList"
              :key="item.id"
              class="review-item"
              :class="{ 'wrong': !item.isCorrect }"
            >
              <div class="review-header">
                <span class="review-num">第 {{ index + 1 }} 题</span>
                <span class="review-tag" :class="item.isCorrect ? 'correct' : 'wrong'">
                  {{ item.isCorrect ? '正确' : '错误' }}
                </span>
              </div>
              <div class="review-question">{{ item.question }}</div>
              <div class="review-answer">
                <p>你的答案：{{ item.userAnswer || '未作答' }}</p>
                <p>正确答案：{{ item.answer }}</p>
              </div>
              <div class="review-analysis" v-if="!item.isCorrect">
                <strong>解析：</strong>{{ item.analysis }}
              </div>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button @click="goToHome" class="btn-home">返回首页</button>
          <button @click="restartExam" class="btn-restart">再考一次</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 考试状态
const isStarted = ref(false)
const isFinished = ref(false)
const selectedYear = ref('')

// 年份列表：2009-2025年
const yearList = computed(() => {
  const list = []
  for (let year = 2025; year >= 2009; year--) {
    list.push(year)
  }
  return list
})

// 题目数据
const questionList = ref([])
const currentIndex = ref(0)
const userAnswers = ref({})

// 计时：90分钟 = 5400秒
const timeLeft = ref(90 * 60)
let timer = null

// 计算属性
const currentQuestion = computed(() => questionList.value[currentIndex.value] || {})
const answeredCount = computed(() => Object.keys(userAnswers.value).length)
const formatTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

// 成绩报告计算
const totalScore = computed(() => {
  let score = 0
  questionList.value.forEach(q => {
    if (userAnswers.value[q.id] === q.answer) score += 2
  })
  return score
})
const accuracy = computed(() => {
  if (questionList.value.length === 0) return 0
  return Math.round((totalScore.value / 80) * 100)
})
const usedTime = computed(() => {
  const total = 90 * 60 - timeLeft.value
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}分${s}秒`
})
const reviewList = computed(() => {
  return questionList.value.map(q => ({
    ...q,
    userAnswer: userAnswers.value[q.id] || '',
    isCorrect: userAnswers.value[q.id] === q.answer
  }))
})

// 加载题目：只加载「真题」，随机抽取40道
const loadQuestions = async () => {
  try {
    let url = '/api/questions?type=真题'
    if (selectedYear.value) {
      url += `&year=${selectedYear.value}`
    }
    const res = await fetch(url)
    let data = await res.json()
    
    // 题库不足40道时用全部题目，超过40道随机抽取40道
    if (data.length > 40) {
      data = data.sort(() => Math.random() - 0.5).slice(0, 40)
    }
    questionList.value = data
  } catch (err) {
    console.error('加载失败：', err)
    alert('题目加载失败，请确保后端已启动')
  }
}

// 开始考试
const startExam = async () => {
  await loadQuestions()
  if (questionList.value.length === 0) {
    alert('暂无对应年份的真题，请先在后台添加')
    return
  }
  isStarted.value = true
  // 启动倒计时
  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      submitExam()
    }
  }, 1000)
}

// 答题
const selectAnswer = (option) => {
  userAnswers.value[currentQuestion.value.id] = option
}

// 跳转题目
const jumpToQuestion = (index) => {
  currentIndex.value = index
}
const prevQuestion = () => {
  if (currentIndex.value > 0) currentIndex.value--
}
const nextQuestion = () => {
  if (currentIndex.value < questionList.value.length - 1) currentIndex.value++
}

// 交卷
const submitExam = () => {
  if (!confirm('确定要交卷吗？交卷后无法修改答案')) return
  if (timer) clearInterval(timer)
  isFinished.value = true
  isStarted.value = false
}

// 重新考试
const restartExam = () => {
  isStarted.value = false
  isFinished.value = false
  currentIndex.value = 0
  userAnswers.value = {}
  timeLeft.value = 90 * 60
  questionList.value = []
}

// 返回首页
const goToHome = () => {
  router.push('/')
}

// 页面销毁时清除计时器
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.mock-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 开始页 */
.start-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.start-card {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}
.start-card h1 {
  color: #333;
  margin-bottom: 1rem;
}
.desc {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}
.tips {
  color: #999;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}
.filter-group {
  margin-bottom: 2rem;
}
.filter-select {
  padding: 0.6rem 1.2rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 1rem;
  margin-left: 0.5rem;
}
.btn-start {
  padding: 1rem 3rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-start:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* 考试进行中 */
.mock-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left {
  display: flex;
  gap: 2rem;
  align-items: center;
}
.exam-title {
  font-weight: 700;
  font-size: 1.2rem;
  color: #333;
}
.exam-progress {
  color: #667eea;
  font-weight: 500;
}
.header-right {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
.timer {
  font-weight: 700;
  font-size: 1.1rem;
  color: #333;
}
.timer.warning {
  color: #ff4d4f;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.btn-submit {
  padding: 0.6rem 1.5rem;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-submit:hover {
  background: #d9363e;
}

.exam-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
  max-width: 1400px;
  margin: 2rem auto;
  padding: 0 2rem;
}

/* 题目区 */
.question-area {
  display: flex;
  flex-direction: column;
}
.question-card {
  background: white;
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
.question-score {
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
.option-item:hover {
  border-color: #667eea;
  background: #667eea08;
}
.option-item.selected {
  border-color: #667eea;
  background: #667eea15;
}
.nav-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.btn-nav {
  padding: 0.8rem 2rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-nav:hover:not(:disabled) {
  background: #e8e8e8;
}
.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 答题卡 */
.answer-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  height: fit-content;
  position: sticky;
  top: 5rem;
}
.answer-card h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.8rem;
}
.card-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}
.card-item:hover {
  border-color: #667eea;
}
.card-item.answered {
  background: #667eea;
  color: white;
  border-color: #667eea;
}
.card-item.current {
  border: 2px solid #667eea;
  transform: scale(1.1);
}

/* 成绩报告 */
.result-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  padding: 2rem;
}
.result-card {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.result-card h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}
.score-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.score-item {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}
.score-label {
  display: block;
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}
.score-value {
  display: block;
  color: #667eea;
  font-size: 1.8rem;
  font-weight: 700;
}
.result-detail {
  margin-bottom: 2rem;
}
.result-detail h3 {
  color: #333;
  margin-bottom: 1rem;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.review-item {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  border-left: 4px solid #52c41a;
}
.review-item.wrong {
  border-left-color: #ff4d4f;
  background: #fff2f0;
}
.review-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}
.review-num {
  font-weight: 600;
  color: #333;
}
.review-tag {
  padding: 0.2rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
.review-tag.correct {
  background: #f6ffed;
  color: #52c41a;
}
.review-tag.wrong {
  background: #fff2f0;
  color: #ff4d4f;
}
.review-question {
  color: #333;
  margin-bottom: 0.8rem;
  line-height: 1.6;
}
.review-answer {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
}
.review-answer p {
  margin: 0.3rem 0;
}
.review-analysis {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  color: #333;
  line-height: 1.6;
  font-size: 0.95rem;
}
.result-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn-home, .btn-restart {
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}
.btn-home {
  background: #f5f5f5;
  color: #666;
}
.btn-home:hover {
  background: #e8e8e8;
}
.btn-restart {
  background: #667eea;
  color: white;
}
.btn-restart:hover {
  background: #5568d3;
}

/* 响应式 */
@media (max-width: 1200px) {
  .exam-body {
    grid-template-columns: 1fr;
  }
  .answer-card {
    position: static;
  }
}
@media (max-width: 768px) {
  .score-box {
    grid-template-columns: 1fr;
  }
}
</style>