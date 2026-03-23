import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'

// 创建应用
const app = createApp(App)

// 安装插件
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 在 Pinia 安装后，加载用户信息
import { useUserStore } from './stores/userStore'
const userStore = useUserStore()
userStore.loadUser()

// 挂载应用
app.mount('#app')