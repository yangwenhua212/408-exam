import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores' // 这里导入的是 src/stores/index.js

const app = createApp(App)
app.use(router)
app.use(pinia)
app.mount('#app')
