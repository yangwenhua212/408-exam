// server.cjs - 408刷题系统后端（完整可运行版）
const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs') // 无编译依赖，新手友好
const jwt = require('jsonwebtoken')

// 初始化Express应用
const app = express()

// 核心配置（生产环境请修改secretKey为随机复杂字符串）
const secretKey = '408-exam-2026-secret-key-987654'
const saltRounds = 10 // 密码加密强度

// 跨域配置（仅允许前端地址，提升安全性）
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))
// 解析JSON请求体
app.use(express.json())

// 1. 连接SQLite数据库（自动创建exam.db文件）
const db = new sqlite3.Database('./exam.db', (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message)
  } else {
    console.log('✅ 数据库连接成功（自动创建exam.db文件）')
  }
})

// 2. 自动创建所需数据表（不存在则创建）
db.serialize(() => {
  // 题目表：支持真题/自定义题区分
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER,
    subject TEXT,
    question TEXT,
    options TEXT,
    answer TEXT,
    analysis TEXT,
    difficulty TEXT,
    type TEXT DEFAULT '真题'
  )`, (err) => {
    if (err) console.error('❌ 题目表创建失败:', err.message)
  })

  // 管理员表：默认账号admin/123456（加密存储）
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (!err) {
      // 加密默认密码并插入（避免重复插入）
      const defaultPwd = bcrypt.hashSync('123456', saltRounds)
      db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
        ['admin', defaultPwd], 
        (err) => {
          if (err) console.error('❌ 管理员默认账号初始化失败:', err.message)
        }
      )
    } else {
      console.error('❌ 管理员表创建失败:', err.message)
    }
  })

  // 用户表：支持注册、手机号/QQ号
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    qq TEXT,
    bio TEXT,
    location TEXT,
    avatar TEXT,
    registerTime TEXT
  )`, (err) => {
    if (err) console.error('❌ 用户表创建失败:', err.message)
  })
})

// ---------------- 核心中间件：管理员鉴权 ----------------
const authAdmin = (req, res, next) => {
  // 从请求头获取Token（格式：Bearer <token>）
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: '请先登录管理员账号' 
    })
  }

  const token = authHeader.split(' ')[1]
  try {
    // 验证Token有效性
    jwt.verify(token, secretKey)
    next() // 鉴权通过，执行后续接口逻辑
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token过期或无效，请重新登录' 
    })
  }
}

// ---------------- 1. 用户模块接口 ----------------
// 1.1 用户注册
app.post('/api/user/register', (req, res) => {
  const { username, password, phone, qq } = req.body

  // 基础参数校验
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    })
  }

  // 加密密码
  const hashPwd = bcrypt.hashSync(password, saltRounds)
  const registerTime = new Date().toLocaleString()

  // 插入用户数据
  db.run(`INSERT INTO users (username, password, phone, qq, registerTime) VALUES (?, ?, ?, ?, ?)`,
    [username, hashPwd, phone || null, qq || null, registerTime],
    function (err) {
      if (err) {
        // 用户名重复
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({
            success: false,
            error: '用户名已被注册'
          })
        }
        // 其他数据库错误
        return res.status(500).json({
          success: false,
          error: '注册失败：' + err.message
        })
      }

      // 注册成功
      res.json({
        success: true,
        message: '注册成功',
        userId: this.lastID
      })
    }
  )
})

// ---------------- 1. 用户模块接口 ----------------
// 1.1 用户注册
app.post('/api/user/register', (req, res) => {
  const { username, password, phone, qq } = req.body

  // 基础参数校验
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    })
  }

  // 加密密码
  const hashPwd = bcrypt.hashSync(password, saltRounds)
  const registerTime = new Date().toLocaleString()

  // 插入用户数据
  db.run(`INSERT INTO users (username, password, phone, qq, registerTime) VALUES (?, ?, ?, ?, ?)`,
    [username, hashPwd, phone || null, qq || null, registerTime],
    function (err) {
      if (err) {
        // 用户名重复
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({
            success: false,
            error: '用户名已被注册'
          })
        }
        // 其他数据库错误
        return res.status(500).json({
          success: false,
          error: '注册失败：' + err.message
        })
      }

      // 注册成功
      res.json({
        success: true,
        message: '注册成功',
        userId: this.lastID
      })
    }
  )
})

// 1.2 用户登录（修复后，唯一的登录接口）
app.post('/api/user/login', (req, res) => {
  const { username, password } = req.body

  // 查询用户
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '登录失败：' + err.message
      })
    }

    // 用户名不存在或密码错误
    if (!row || !bcrypt.compareSync(password, row.password)) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      })
    }

    // 登录成功（隐藏密码返回）
    const { password: _, ...userInfo } = row
    res.json({
      success: true,
      message: '登录成功',
      userInfo
    })
  })
})

// ---------------- 2. 管理员模块接口 ----------------
// 2.1 管理员登录（返回Token）
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body

  // 查询管理员
  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '登录失败：' + err.message
      })
    }

    // 账号或密码错误
    if (!row || !bcrypt.compareSync(password, row.password)) {
      return res.status(401).json({
        success: false,
        error: '管理员账号或密码错误'
      })
    }

    // 生成Token（有效期2小时）
    const token = jwt.sign({ username: row.username }, secretKey, { expiresIn: '2h' })
    res.json({
      success: true,
      message: '管理员登录成功',
      username: row.username,
      token
    })
  })
})

// 2.2 批量导入题目（需要管理员鉴权）
app.post('/api/admin/batch-import', authAdmin, (req, res) => {
  const questions = req.body

  // 校验题目数组
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({
      success: false,
      error: '请提供有效的题目数组'
    })
  }

  // 批量插入（Promise封装，确保计数准确）
  const insertPromises = questions.map(q => {
    return new Promise((resolve) => {
      const sql = `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      db.run(sql, [
        q.year, q.subject, q.question,
        JSON.stringify(q.options), q.answer, q.analysis, q.difficulty,
        q.type || '真题'
      ], (err) => {
        if (err) {
          console.error('❌ 题目导入失败:', q.question, err.message)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  })

  // 统计导入结果
  Promise.all(insertPromises).then(results => {
    const successCount = results.filter(r => r).length
    const failCount = results.filter(r => !r).length
    res.json({
      success: true,
      message: `批量导入完成：成功${successCount}题，失败${failCount}题`,
      successCount,
      failCount
    })
  })
})

// 2.3 获取所有用户列表（管理员）
app.get('/api/admin/users', authAdmin, (req, res) => {
  db.all(`SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '获取用户列表失败：' + err.message
      })
    }
    res.json({
      success: true,
      data: rows
    })
  })
})

// 2.4 删除用户（管理员）
app.delete('/api/admin/users/:id', authAdmin, (req, res) => {
  const userId = req.params.id

  db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '删除用户失败：' + err.message
      })
    }
    res.json({
      success: true,
      message: '用户删除成功'
    })
  })
})

// ---------------- 3. 题目模块接口 ----------------
// 3.1 获取题目（支持多条件筛选）
app.get('/api/questions', (req, res) => {
  const { subject, year, type } = req.query
  let sql = `SELECT * FROM questions`
  let params = []
  let conditions = []

  // 构建筛选条件
  if (subject) {
    conditions.push('subject = ?')
    params.push(subject)
  }
  if (year) {
    conditions.push('year = ?')
    params.push(year)
  }
  if (type) {
    conditions.push('type = ?')
    params.push(type)
  }

  // 拼接WHERE条件
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  // 按ID倒序
  sql += ' ORDER BY id DESC'

  // 查询并返回（解析options为数组）
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '获取题目失败：' + err.message
      })
    }

    // 解析options（存储时是JSON字符串，返回时转数组）
    const formattedRows = rows.map(row => ({
      ...row,
      options: JSON.parse(row.options)
    }))

    res.json({
      success: true,
      data: formattedRows
    })
  })
})

// 3.2 新增单题
app.post('/api/questions', (req, res) => {
  const { year, subject, question, options, answer, analysis, difficulty, type } = req.body

  // 必填项校验
  if (!year || !subject || !question || !options || !answer) {
    return res.status(400).json({
      success: false,
      error: '题目信息不完整：年份、科目、题干、选项、答案为必填项'
    })
  }

  // 插入题目
  const sql = `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  db.run(sql, [
    year, subject, question,
    JSON.stringify(options), answer, analysis, difficulty,
    type || '真题'
  ], function (err) {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '新增题目失败：' + err.message
      })
    }

    res.json({
      success: true,
      message: '题目新增成功',
      questionId: this.lastID
    })
  })
})

// 3.3 删除题目
app.delete('/api/questions/:id', (req, res) => {
  const questionId = req.params.id

  db.run(`DELETE FROM questions WHERE id = ?`, [questionId], (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '删除题目失败：' + err.message
      })
    }

    res.json({
      success: true,
      message: '题目删除成功'
    })
  })
})

// ---------------- 4. 前端静态资源托管 ----------------
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  console.log('✅ 前端dist文件夹已加载（若未打包前端可忽略）')
}

// 前端路由兼容：所有非/api请求返回index.html
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send(`
      <h1>408刷题系统后端已启动</h1>
      <p>前端页面未打包，请先运行：npm run build（前端项目中）</p>
      <p>接口测试地址：<a href="/api/questions">/api/questions</a></p>
      <p>管理员登录接口：POST /api/admin/login</p>
    `)
  }
})

// ---------------- 启动服务 ----------------
const PORT = 3000
app.listen(PORT, () => {
  console.log('\n=====================================')
  console.log('🚀 408刷题系统后端已成功启动！')
  console.log('=====================================')
  console.log(`📡 服务地址：http://localhost:${PORT}`)
  console.log(`🔌 接口测试：http://localhost:${PORT}/api/questions`)
  console.log(`🔐 管理员登录：POST http://localhost:${PORT}/api/admin/login`)
  console.log(`👤 默认管理员：账号=admin | 密码=123456`)
  console.log('=====================================\n')
})