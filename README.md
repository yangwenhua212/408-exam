# 408 计算机专业刷题系统

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16-brightgreen)](https://nodejs.org/)
[![Vue 3](https://img.shields.io/badge/vue-3.x-blue)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/vite-7.x-646CFF)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/mysql-8.0-4479A1)](https://mysql.com/)

> 一个功能完整的在线刷题平台，支持单选题、多选题、简答题，包含真题管理、错题本、模拟考试、个人学习统计等功能。适合计算机专业学生备考408统考或日常练习。

## 在线体验

- **线上地址**：[https://408-exam-production.up.railway.app](https://408-exam-production.up.railway.app)
- **体验账号**：注册即可体验 / 测试账号 `test` / `123456`
- **管理员账号**：`admin` / `123456`

## 项目亮点

- **多题型支持**：单选题、多选题、简答题，前端动态渲染，后端智能判分。
- **真题序号管理**：每一道真题独立存储年份和题号，删除后不影响同一年其他题号顺序。
- **智能错题本**：自动收录错题，支持按科目筛选，一键进入错题练习模式。
- **全真模拟考试**：从真题库随机抽取40道单选题，限时90分钟，交卷自动评分并展示详细解析。
- **题库管理后台**：管理员可增删改查题目，支持图片上传、批量导入（JSON格式），按科目/年份/题型筛选，批量删除。
- **个人学习中心**：编辑资料、上传头像，可视化统计总题数、正确率、各科目掌握情况。
- **响应式设计**：移动端适配良好，无论电脑、平板、手机都能流畅使用。

## 技术栈

### 前端

- **Vue 3** (Composition API) + **Vue Router** – 单页应用开发
- **Vite** – 极速构建与热更新
- **Axios** – HTTP 请求封装，自动携带 JWT
- **ECharts** – 数据可视化（正确率饼图、科目柱状图）
- **Element Plus** – 部分 UI 组件（消息提示等）

### 后端

- **Node.js** + **Express** – RESTful API 服务
- **MySQL** (mysql2/promise) – 数据持久化，支持外键级联删除
- **JWT** (jsonwebtoken) – 用户认证与授权
- **bcryptjs** – 密码哈希存储
- **multer** – 图片上传处理
- **dotenv** – 环境变量管理

### 部署

- **Railway** – 全自动部署，支持 MySQL 插件，前后端同域托管

## 系统架构图

```mermaid
graph TB
    subgraph 用户端
        A[浏览器]
    end

    subgraph Railway 部署
        B[Express 后端服务]
        C[静态资源 (dist)]
        D[MySQL 数据库]
    end

    A -->|访问域名| B
    B -->|提供 API| A
    B -->|托管静态文件| C
    B -->|数据库操作| D

    style B fill:#f9f,stroke:#333
    style D fill:#ccf,stroke:#333
```

快速开始
环境要求
Node.js 18+

MySQL 8.0+（本地开发可使用 Docker 或 XAMPP）

安装步骤
克隆仓库

bash
git clone https://github.com/yangwenhua212/408-exam.git
cd 408-exam
安装依赖

bash
npm install
配置环境变量
复制 .env.example 为 .env，并填入本地数据库信息：

ini
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=exam_db
JWT_SECRET=your_jwt_secret
创建数据库
在 MySQL 中创建数据库 exam_db（名称与 .env 一致），运行 node server.cjs 后会自动建表。

启动开发服务

bash
npm run dev
前端 Vite 开发服务器将运行在 http://localhost:5173，后端 API 运行在 http://localhost:3000。
（前后端分离模式，需配置 Vite 代理解决跨域，具体见 vite.config.js）

生产构建与启动

bash
npm run build # 构建前端到 dist 目录
node server.js # 启动后端，同时托管前端
访问 http://localhost:3000 即可体验完整功能。

API 文档（部分）
用户相关
POST /api/user/register – 注册

POST /api/user/login – 登录，返回 JWT token 和用户信息

POST /api/user/update – 更新用户资料（需认证）

题目相关
GET /api/questions – 获取题目列表（支持筛选：subject, year, type, questionType）

POST /api/questions – 新增题目（需管理员权限）

DELETE /api/questions/:id – 删除题目（需管理员权限）

DELETE /api/questions/batch – 批量删除（需管理员权限）

错题相关
GET /api/user/errors – 获取当前用户的错题列表（需认证）

POST /api/user/errors – 保存错题（需认证）

DELETE /api/user/errors/:id – 删除错题（需认证）

更多接口请查看 server.js 或使用 Postman 测试。

项目结构
text
408-exam/
├── src/ # 前端源码
│ ├── views/ # 页面组件
│ │ ├── Home.vue
│ │ ├── Exam.vue
│ │ ├── ExamMock.vue
│ │ ├── ErrorBook.vue
│ │ ├── Admin.vue
│ │ ├── UserHome.vue
│ │ └── ...
│ ├── utils/ # 工具函数
│ │ └── request.js # Axios 封装
│ ├── stores/ # Pinia 状态管理
│ │ └── userStore.js
│ └── main.js # 入口文件
├── server.js # 后端主程序
├── middleware/ # 中间件（认证、管理员）
├── uploads/ # 上传图片存放目录
├── .env.example # 环境变量示例
├── package.json
├── vite.config.js
└── README.md # 本文件
部署到 Railway
在 Railway 创建项目，连接 GitHub 仓库。

添加 MySQL 插件（Railway 会自动注入 DATABASE_URL 变量）。

设置环境变量 JWT_SECRET（任意字符串）。

在 Settings → Build 中确保 Build Command 为 npm run build，Start Command 为 node server.js。

触发部署，等待完成即可访问。

贡献指南
欢迎提交 Issue 和 Pull Request。请确保代码通过 ESLint 检查，并遵循 Commit Message 规范。

项目反思与未来规划
这个项目从零开始，经历了需求分析、数据库设计、前后端编码、部署上线的全过程。作为个人全栈练习项目，它已经具备了完整的刷题闭环，并在以下方面积累了经验：

多题型动态渲染与判分逻辑

JWT 认证与权限中间件设计

外键级联删除保证数据一致性

图片上传与富文本题干嵌入

响应式布局与移动端适配

未来计划进一步优化：

引入 Redis 缓存热门题目

使用消息队列处理批量导入

增加智能推荐（基于错题标签）

支持第三方登录（微信/QQ）

如果你也对刷题系统感兴趣，欢迎一起交流学习！

text
