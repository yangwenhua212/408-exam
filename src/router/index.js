import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import UserHome from '../views/UserHome.vue'
import Exam from '../views/Exam.vue'
import ErrorBook from '../views/ErrorBook.vue'
import Stats from '../views/Stats.vue'
import ExamMock from '../views/ExamMock.vue'
import Admin from '../views/Admin.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/user', name: 'UserHome', component: UserHome },
  { path: '/exam', name: 'Exam', component: Exam },
  { path: '/error-book', name: 'ErrorBook', component: ErrorBook },
  { path: '/stats', name: 'Stats', component: Stats },
  { path: '/exam-mock', name: 'ExamMock', component: ExamMock },
  { path: '/admin', name: 'Admin', component: Admin }
]

const router = createRouter({
  // 关键：传入base参数，和vite.config.js的base保持一致
  history: createWebHashHistory('/408-exam/'), 
  routes
})

export default router