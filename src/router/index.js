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
  { path: '/user', name: 'UserHome', component: UserHome, meta: { requiresAuth: true } },
  { path: '/exam', name: 'Exam', component: Exam, meta: { requiresAuth: true } },
  { path: '/error-book', name: 'ErrorBook', component: ErrorBook, meta: { requiresAuth: true } },
  { path: '/stats', name: 'Stats', component: Stats, meta: { requiresAuth: true } },
  { path: '/exam-mock', name: 'ExamMock', component: ExamMock, meta: { requiresAuth: true } },
  { path: '/admin', name: 'Admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/error-exam', name: 'ErrorExam', component: Exam, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory('/408-exam/'),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}')

  if (to.meta.requiresAuth && !token) {
    // 未登录，跳转登录页
    next('/login')
  } else if (to.meta.requiresAdmin && user.username !== 'admin') {
    // 不是管理员，跳转首页
    next('/')
  } else {
    next()
  }
})

export default router