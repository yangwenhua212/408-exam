<template>
  <div class="error-book">
    <h2>错题本</h2>
    <div v-if="errorList.length === 0" class="empty">
      暂无错题，继续加油！
    </div>
    <div v-else class="list">
      <div
        v-for="item in errorList"
        :key="item.id"
        class="item"
      >
        <h4>{{ item.title }}</h4>
        <p>你的答案：{{ String.fromCharCode(65 + item.userAnswer) }}</p>
        <p>正确答案：{{ String.fromCharCode(65 + item.answer) }}</p>
      </div>
    </div>
    <button @click="goBack" class="back-btn">返回首页</button>
  </div>
</template>

<script setup>
// 1. 确保导入了 computed
import { computed } from 'vue'
import { useExamStore } from '../stores/examStore'
import { useRouter } from 'vue-router'

const store = useExamStore()
const router = useRouter()

// 从 store 中筛选出答错的题目
const errorList = computed(() => {
  return store.questions.filter((q, i) => {
    return store.userAnswers[i] !== undefined && store.userAnswers[i] !== q.answer
  }).map((q, i) => ({
    ...q,
    userAnswer: store.userAnswers[store.questions.findIndex(qq => qq.id === q.id)]
  }))
})

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.error-book {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
}
h2 {
  text-align: center;
  margin-bottom: 30px;
}
.empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.list {
  margin-bottom: 30px;
}
.item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}
.item h4 {
  margin-bottom: 10px;
}
.item p {
  color: #666;
  margin: 5px 0;
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
