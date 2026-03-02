// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './', // 关键配置：将静态资源路径改为相对路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})