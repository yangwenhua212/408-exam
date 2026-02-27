const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

// 1. 连接数据库
const db = new sqlite3.Database('./exam.db', (err) => {
  if (err) console.error('❌ 数据库连接失败:', err)
  else console.log('✅ 数据库连接成功')
})

// 2. 自动创建所有表
db.serialize(() => {
  // 题目表（新增type字段：区分真题/自定义题）
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
  )`)
  
  // 管理员表（默认账号：admin / 密码：123456）
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (!err) {
      db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, ['admin', '123456'])
    }
  })

  // 用户表（带手机号、QQ号字段，注册用）
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
  )`)
})

// ---------------- 核心：用户注册/登录接口 ----------------
// 用户注册接口
app.post('/api/user/register', (req, res) => {
  const { username, password, phone, qq } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  
  const registerTime = new Date().toLocaleString()
  db.run(`INSERT INTO users (username, password, phone, qq, registerTime) VALUES (?, ?, ?, ?, ?)`, 
    [username, password, phone || null, qq || null, registerTime], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE') && err.message.includes('username')) {
          return res.status(400).json({ error: '用户名已被注册' })
        }
        res.status(500).json({ error: err.message })
      } else {
        res.json({ success: true, id: this.lastID })
      }
    }
  )
})

// 用户登录接口
app.post('/api/user/login', (req, res) => {
  const { username, password } = req.body
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message })
    } else if (row) {
      const { password, ...userInfo } = row
      res.json({ success: true, userInfo })
    } else {
      res.status(401).json({ error: '用户名或密码错误' })
    }
  })
})

// ---------------- 管理员接口 ----------------
// 管理员登录
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body
  db.get('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) res.status(500).json({ error: err.message })
    else if (row) res.json({ success: true, username: row.username })
    else res.status(401).json({ error: '账号或密码错误' })
  })
})

// 批量导入题目
app.post('/api/admin/batch-import', (req, res) => {
  const questions = req.body
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '请提供有效的题目数组' })
  }

  let successCount = 0
  let failCount = 0
  
  questions.forEach(q => {
    const sql = `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    db.run(sql, [
      q.year, q.subject, q.question, 
      JSON.stringify(q.options), q.answer, q.analysis, q.difficulty,
      q.type || '真题'
    ], function(err) {
      if (err) failCount++
      else successCount++
      
      if (successCount + failCount === questions.length) {
        res.json({ success: true, successCount, failCount })
      }
    })
  })
})

// 获取所有用户列表（管理员用）
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC', (err, rows) => {
    if (err) res.status(500).json({ error: err.message })
    else res.json(rows)
  })
})

// 删除用户（管理员用）
app.delete('/api/admin/users/:id', (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', req.params.id, (err) => {
    if (err) res.status(500).json({ error: err.message })
    else res.json({ success: true })
  })
})

// ---------------- 题目接口（核心修改：支持按类型筛选） ----------------
// 获取题目（支持按科目/年份/类型筛选）
app.get('/api/questions', (req, res) => {
  const { subject, year, type } = req.query
  let sql = 'SELECT * FROM questions'
  let params = []
  let conditions = []
  
  if (subject) { conditions.push(' subject = ?'); params.push(subject) }
  if (year) { conditions.push(' year = ?'); params.push(year) }
  if (type) { conditions.push(' type = ?'); params.push(type) }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND')
  }
  sql += ' ORDER BY id DESC'
  
  db.all(sql, params, (err, rows) => {
    if (err) res.status(500).json({ error: err.message })
    else res.json(rows.map(row => ({ ...row, options: JSON.parse(row.options) })))
  })
})

// 添加单题
app.post('/api/questions', (req, res) => {
  const { year, subject, question, options, answer, analysis, difficulty, type } = req.body
  const sql = `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  db.run(sql, [
    year, subject, question, JSON.stringify(options), answer, analysis, difficulty,
    type || '真题'
  ], function(err) {
    if (err) res.status(500).json({ error: err.message })
    else res.json({ success: true, id: this.lastID })
  })
})

// 删除题目
app.delete('/api/questions/:id', (req, res) => {
  db.run('DELETE FROM questions WHERE id = ?', req.params.id, (err) => {
    if (err) res.status(500).json({ error: err.message })
    else res.json({ success: true })
  })
})

// ---------------- 托管前端 ----------------
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  console.log('✅ 前端dist文件夹加载成功')
}

// 匹配所有非API请求，返回前端页面
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('请先执行 npm run build 打包前端')
  }
})

// 启动服务
const PORT = 3000
app.listen(PORT, () => {
  console.log(`\n🚀 后端服务已成功启动！`)
  console.log(`📚 刷题系统主站：http://localhost:${PORT}`)
  console.log(`🔐 管理员后台：http://localhost:${PORT}/admin`)
  console.log(`🔌 接口测试地址：http://localhost:${PORT}/api/questions\n`)
  console.log(`👤 默认管理员账号：admin / 密码：123456\n`)
})