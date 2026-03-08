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
    let url = `/api/user/errors?userId=${userStore.user.id}`;
    if (selectedSubject.value) {
      url += `&subject=${encodeURIComponent(selectedSubject.value)}`;
    }
    const res = await fetch(url);
    const data = await res.json();
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
    await fetch(`/api/user/errors/${id}`, { method: 'DELETE' });
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
/* 添加筛选样式 */
.filter {
  margin-bottom: 20px;
  text-align: right;
}
.filter select {
  padding: 5px 10px;
  margin-left: 10px;
}
.loading {
  text-align: center;
  color: #999;
  padding: 40px 0;
}
.remove-btn {
  margin-top: 10px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

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
.action-bar {
  text-align: right;
  margin-bottom: 20px;
}
.btn-start {
  background: #67c23a;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-start:hover {
  background: #5755e4;
}
</style>
