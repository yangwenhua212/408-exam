<template>
  <div class="stats">
    <h2>刷题统计</h2>
    <div class="cards">
      <div class="card">
        <h3>总题数</h3>
        <p>{{ statsData.totalCount }}</p>
      </div>
      <div class="card">
        <h3>已答</h3>
        <p>{{ statsData.answeredCount }}</p>
      </div>
      <div class="card">
        <h3>正确</h3>
        <p>{{ statsData.correctCount }}</p>
      </div>
      <div class="card">
        <h3>正确率</h3>
        <p>{{ accuracyRate }}%</p>
      </div>
    </div>

    <!-- 可视化图表 -->
    <div class="charts">
      <div ref="pieRef" class="chart-container"></div>
      <div ref="barRef" class="chart-container"></div>
    </div>

    <!-- 最近刷题记录 -->
    <div class="history" v-if="historyList.length > 0">
      <h3>最近刷题记录</h3>
      <div class="history-list">
        <div class="history-item" v-for="(item, idx) in historyList.slice(0, 5)" :key="idx">
          <span>{{ item.date }}</span>
          <span>总题数: {{ item.total }}</span>
          <span>正确率: {{ item.accuracy }}%</span>
        </div>
      </div>
    </div>

    <button @click="goBack" class="back-btn">返回首页</button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const pieRef = ref(null)
const barRef = ref(null)
let pieChart = null
let barChart = null

// 当前用户
const currentUser = ref(null)
// 统计数据
const statsData = ref({
  totalCount: 0,
  answeredCount: 0,
  correctCount: 0,
  subjectStats: {} // 科目统计：{ '数据结构': { total: 0, correct: 0 }, ... }
})
// 历史记录
const historyList = ref([])

onMounted(() => {
  // 1. 检查登录状态
  const user = JSON.parse(localStorage.getItem('currentUser'))
  if (!user) {
    alert('请先登录')
    router.push('/login')
    return
  }
  currentUser.value = user

  // 2. 加载统计数据
  loadStatsData()
  // 3. 加载历史记录
  loadHistoryList()
  // 4. 初始化图表
  initCharts()
})

// 从 localStorage 加载统计数据
function loadStatsData() {
  const key = `stats_${currentUser.value.username}`
  const savedStats = JSON.parse(localStorage.getItem(key) || '{}')
  
  if (savedStats.totalCount !== undefined) {
    statsData.value = savedStats
  } else {
    // 首次加载时，从错题本和题目数据计算
    const questions = JSON.parse(localStorage.getItem('questions') || '[]')
    const errorList = JSON.parse(localStorage.getItem(`errorList_${currentUser.value.username}`) || '[]')
    const total = questions.length
    const errorCount = errorList.length
    const correct = total - errorCount
    
    statsData.value = {
      totalCount: total,
      answeredCount: total,
      correctCount: correct,
      subjectStats: calculateSubjectStats(questions, errorList)
    }
  }
}

// 计算各科目正确率
function calculateSubjectStats(questions, errorList) {
  const subjectStats = {}
  questions.forEach(q => {
    if (!subjectStats[q.subject]) {
      subjectStats[q.subject] = { total: 0, correct: 0 }
    }
    subjectStats[q.subject].total++
    // 不在错题本里即为正确
    const isError = errorList.some(e => e.id === q.id)
    if (!isError) subjectStats[q.subject].correct++
  })
  return subjectStats
}

// 加载历史刷题记录
function loadHistoryList() {
  const key = `history_${currentUser.value.username}`
  historyList.value = JSON.parse(localStorage.getItem(key) || '[]')
}

// 初始化 ECharts 图表
function initCharts() {
  // 正确率饼图
  pieChart = echarts.init(pieRef.value)
  const pieOption = {
    title: { text: '答题正确率', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      name: '答题情况',
      type: 'pie',
      radius: '50%',
      data: [
        { value: statsData.value.correctCount, name: '正确' },
        { value: statsData.value.answeredCount - statsData.value.correctCount, name: '错误' }
      ],
      emphasis: { itemStyle: { shadowBlur: 10 } }
    }]
  }
  pieChart.setOption(pieOption)

  // 科目正确率柱状图
  barChart = echarts.init(barRef.value)
  const subjects = Object.keys(statsData.value.subjectStats)
  const correctRates = subjects.map(s => {
    const stat = statsData.value.subjectStats[s]
    return ((stat.correct / stat.total) * 100).toFixed(1)
  })
  const barOption = {
    title: { text: '各科目正确率', left: 'center' },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '正确率(%)' },
    series: [{
      name: '正确率',
      type: 'bar',
      data: correctRates,
      itemStyle: { color: '#409eff' }
    }]
  }
  barChart.setOption(barOption)
}

// 计算总正确率
 const accuracyRate = computed(() => {
   if (statsData.value.answeredCount === 0) return 0
   return ((statsData.value.correctCount / statsData.value.answeredCount) * 100).toFixed(1)
 })
 const goBack = () => {
   router.push('/')
 }
 </script>
 <style scoped>
 .stats {
   max-width: 1200px;
   margin: 40px auto;
   padding: 0 20px;
 }
 h2 {
   text-align: center;
   margin-bottom: 30px;
 }
 .cards {
   display: grid;
   grid-template-columns: repeat(2, 1fr);
   gap: 20px;
   margin-bottom: 30px;
 }
 .card {
   border: 1px solid #eee;
   border-radius: 8px;
   padding: 20px;
   text-align: center;
 }
 .card h3 {
   color: #666;
   margin-bottom: 10px;
 }
 .card p {
   font-size: 24px;
   font-weight: bold;
   color: #409eff;
 }
 .charts {
   display: flex;
   justify-content: space-around;
   flex-wrap: wrap;
   gap: 20px;
   margin-bottom: 30px;
 }
 .chart-container {
   width: 400px;
   height: 300px;
   border: 1px solid #eee;
   border-radius: 8px;
   padding: 10px;
 }
 .history {
   margin-bottom: 30px;
 }
 .history h3 {
   text-align: center;
   margin-bottom: 15px;
 }
 .history-list {
   max-width: 600px;
   margin: 0 auto;
 }
 .history-item {
   display: flex;
   justify-content: space-between;
   padding: 10px;
   border-bottom: 1px solid #eee;
 }
 .back-btn {
   display: block;
   margin: 0 auto;
   padding: 10px 20px;
   background: #409eff;
   color: white;
   border: none;
   border-radius: 6px;
   cursor: pointer;
 }
 </style>