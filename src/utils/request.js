import axios from 'axios'
import { ElMessage } from 'element-plus'

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器：自动携带 token
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器：统一处理错误和返回数据
instance.interceptors.response.use(
  response => response.data,  // 直接返回 data
  error => {
    // 网络错误（断网、超时等）
    if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络')
      return Promise.reject(error)
    }

    const { status, data } = error.response

    // 根据状态码统一提示
    switch (status) {
      case 400:
        ElMessage.error(data?.error || '请求参数错误')
        break
      case 401:
        ElMessage.error('登录已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
        window.location.href = '/login'
        break
      case 403:
        ElMessage.error(data?.error || '没有权限执行此操作')
        break
      case 404:
        ElMessage.error(data?.error || '请求的资源不存在')
        break
      case 500:
        ElMessage.error(data?.error || '服务器内部错误')
        break
      default:
        ElMessage.error(data?.error || '请求失败')
    }

    return Promise.reject(error)
  }
)

export default instance