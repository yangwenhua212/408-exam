<template>
  <div class="error-book">
    <h2>错题本</h2>

    <!-- 科目筛选 -->
    <div class="filter" v-if="errorList.length">
      <label for="subject">筛选科目：</label>
      <select id="subject" v-model="selectedSubject" @change="loadErrors">
        <option value="">全部科目</option>
        <option v-for="sub in subjects" :key="sub" :value="sub">{{ sub }}</option>
      </select>
    </div>
    <div class="action-bar">
  <button @click="startErrorExam" class="btn-start">开始刷错题</button>
</div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="displayList.length === 0" class="empty">
      暂无错题，继续加油！
    </div>
    <div v-else class="list">
      <div v-for="item in displayList" :key="item.id" class="item">
        <h4>{{ item.question }}</h4>
        <p><strong>你的答案：</strong>{{ item.user_answer }}</p>
        <p><strong>正确答案：</strong>{{ item.correct_answer }}</p>
        <p><strong>解析：</strong>{{ item.analysis }}</p>
        <button @click="removeError(item.id)" class="remove-btn">移除</button>
      </div>
    </div>

    <button @click="goBack" class="back-btn">返回首页</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import request from '@/utils/request';

const router = useRouter();
const userStore = useUserStore();

const errorList = ref([]);      // 原始错题列表
const loading = ref(false);
const selectedSubject = ref(''); // 当前选中的科目
const startErrorExam = () => {
  router.push('/error-exam?mode=error')
}

// 从后端加载错题
const loadErrors = async () => {
  if (!userStore.user) {
    router.push('/login');
    return;
  }
  loading.value = true;
  try {
    let params = {};
    if (selectedSubject.value) params.subject = selectedSubject.value;
    // 如果有题型筛选，也可以加
    const data = await request.get('/user/errors', { params });
    errorList.value = data;
  } catch (err) {
    console.error('加载错题失败', err);
  } finally {
    loading.value = false;
  }
};

// 根据筛选后的列表（实际后端已筛选，这里可以直接用 errorList）
const displayList = computed(() => errorList.value);

// 获取所有科目用于下拉框（可从 errorList 动态提取）
const subjects = computed(() => {
  const set = new Set();
  errorList.value.forEach(item => set.add(item.subject));
  return Array.from(set);
});

// 移除错题
const removeError = async (id) => {
  try {
    await request.delete(`/user/errors/${id}`);
    // 重新加载列表
    loadErrors();
  } catch (err) {
    console.error('移除错题失败', err);
  }
};

const goBack = () => {
  router.push('/');
};

onMounted(() => {
  loadErrors();
});
</script>

<style scoped>
.error-book {
  min-height: 100vh;
  background: linear-gradient(135deg, #d6f4ff 0%, #a8dfff 100%);
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #2b6cb0;
}
.filter {
  margin-bottom: 1rem;
  text-align: right;
}
.filter select {
  padding: 0.5rem 1rem;
  margin-left: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
}
.action-bar {
  text-align: right;
  margin-bottom: 1rem;
}
.btn-start {
  background: #2b6cb0;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-start:hover {
  background: #2c5282;
}
.loading {
  text-align: center;
  color: #718096;
  padding: 2rem 0;
}
.empty {
  text-align: center;
  color: #718096;
  padding: 3rem 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.list {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.item {
  background: white;
  border: 1px solid #bee3f8;
  border-radius: 12px;
  padding: 1.2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.item h4 {
  margin-bottom: 0.8rem;
  color: #2d3748;
  line-height: 1.5;
}
.item p {
  color: #4a5568;
  margin: 0.4rem 0;
  font-size: 0.9rem;
}
.remove-btn {
  margin-top: 0.8rem;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.back-btn {
  display: block;
  margin: 0 auto;
  padding: 0.6rem 1.5rem;
  background: #2b6cb0;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}
.back-btn:hover {
  background: #2c5282;
}
</style>
