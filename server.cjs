const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

let dbPool

// 初始化数据库连接池
async function initDBPool() {
  try {
    const dbConfig = process.env.DATABASE_URL 
      ? {
          uri: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          enableKeepAlive: true,
          keepAliveInitialDelay: 30000,
          connectionLimit: 10,
          queueLimit: 0
        }
      : {
          host: 'localhost',
          user: 'root',
          password: 'Yang123!',
          database: 'exam_db',
          port: 3306,
          charset: 'utf8mb4',
          enableKeepAlive: true,
          keepAliveInitialDelay: 30000,
          connectionLimit: 10,
          queueLimit: 0
        }

    dbPool = process.env.DATABASE_URL
      ? await mysql.createPool(dbConfig.uri, {
          ssl: dbConfig.ssl,
          enableKeepAlive: dbConfig.enableKeepAlive,
          keepAliveInitialDelay: dbConfig.keepAliveInitialDelay,
          connectionLimit: dbConfig.connectionLimit,
          queueLimit: dbConfig.queueLimit
        })
      : await mysql.createPool(dbConfig)

    console.log('✅ MySQL数据库连接池初始化成功')
    await createTables()
  } catch (err) {
    console.error('❌ MySQL数据库连接池初始化失败:', err.message)
    process.exit(1)
  }
}

async function createTables() {
  // 题目表
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    subject VARCHAR(255),
    question TEXT,
    options TEXT,
    answer VARCHAR(255),
    analysis TEXT,
    difficulty VARCHAR(50),
    type VARCHAR(50) DEFAULT '真题'
  )`);

  // 管理员表
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255)
  )`);
  await dbPool.execute(`INSERT IGNORE INTO admins (username, password) VALUES (?, ?)`, ['admin', '123456']);

  // 用户表
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    qq VARCHAR(20),
    bio TEXT,
    location VARCHAR(255),
    avatar LONGTEXT,
    registerTime VARCHAR(255)
  )`);

  // 错题表（已修正语法错误）
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS user_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    user_answer VARCHAR(10) NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  )`);

  // 自动修复 avatar 字段类型（解决 Data too long 问题）
  try {
    await dbPool.execute(`ALTER TABLE users MODIFY avatar LONGTEXT`);
    console.log('✅ 已确保 users.avatar 字段为 LONGTEXT');
  } catch (err) {
    // 如果表不存在或其他错误，忽略
    console.log('⚠️ 检查 avatar 字段时出现非致命错误:', err.message);
  }
}

// ---------------- 用户接口 ----------------
// 注册
app.post('/api/user/register', async (req, res) => {
  const { username, password, phone, qq } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  const registerTime = new Date().toLocaleString()
  try {
    const [result] = await dbPool.execute(
      `INSERT INTO users (username, password, phone, qq, registerTime, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, password, phone || null, qq || null, registerTime, '']
    )
    res.json({ success: true, id: result.insertId })
  } catch (err) {
    if (err.message.includes('Duplicate entry')) {
      return res.status(400).json({ error: '用户名已被注册' })
    }
    res.status(500).json({ error: err.message })
  }
})

// 登录
app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    )
    if (rows.length > 0) {
      const { password, ...userInfo } = rows[0]
      res.json({ success: true, userInfo })
    } else {
      res.status(401).json({ error: '用户名或密码错误' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新用户信息
app.post('/api/user/update', async (req, res) => {
  const { username, bio, location, avatar } = req.body
  if (!username) {
    return res.status(400).json({ error: '用户名不能为空' })
  }
  try {
    let sql = 'UPDATE users SET '
    const values = []
    const fields = []

    if (bio !== undefined) {
      fields.push('bio = ?')
      values.push(bio || null)
    }
    if (location !== undefined) {
      fields.push('location = ?')
      values.push(location || null)
    }
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      fields.push('avatar = ?')
      values.push(avatar)
    }

    if (fields.length === 0) {
      return res.json({ success: true })
    }

    sql += fields.join(', ') + ' WHERE username = ?'
    values.push(username)

    await dbPool.execute(sql, values)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------- 错题相关接口 ----------------
// 保存错题
app.post('/api/user/errors', async (req, res) => {
  const { userId, questionId, subject, userAnswer } = req.body
  if (!userId || !questionId || !subject || !userAnswer) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  try {
    await dbPool.execute(
      `INSERT IGNORE INTO user_errors (user_id, question_id, subject, user_answer) VALUES (?, ?, ?, ?)`,
      [userId, questionId, subject, userAnswer]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取用户错题列表（支持按科目筛选）
app.get('/api/user/errors', async (req, res) => {
  const { userId, subject } = req.query
  if (!userId) return res.status(400).json({ error: '缺少 userId' })

  let sql = `
    SELECT e.*, q.question, q.options, q.answer AS correct_answer, q.analysis, q.year, q.difficulty
    FROM user_errors e
    JOIN questions q ON e.question_id = q.id
    WHERE e.user_id = ?
  `
  const params = [userId]
  if (subject) {
    sql += ' AND e.subject = ?'
    params.push(subject)
  }
  sql += ' ORDER BY e.create_time DESC'

  try {
    const [rows] = await dbPool.execute(sql, params)
    rows.forEach(row => {
      row.options = JSON.parse(row.options)
    })
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 批量删除题目
app.delete('/api/questions/batch', async (req, res) => {
  const { ids } = req.body; // 前端发送 { ids: [1,2,3] }
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供要删除的题目ID数组' });
  }
  try {
    // 使用占位符生成 IN (?,?,?)
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await dbPool.execute(
      `DELETE FROM questions WHERE id IN (${placeholders})`,
      ids
    );
    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (err) {
    console.error('❌ 单个删除错误堆栈:', err.stack);  // 必须打印 stack
    res.status(500).json({ error: err.message });
  }
});

// 删除错题
app.delete('/api/user/errors/:id', async (req, res) => {
  const { id } = req.params
  try {
    await dbPool.execute('DELETE FROM user_errors WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------- 管理员接口 ----------------
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM admins WHERE username = ? AND password = ?',
      [username, password]
    )
    if (rows.length > 0) {
      res.json({ success: true, username: rows[0].username })
    } else {
      res.status(401).json({ error: '账号或密码错误' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/batch-import', async (req, res) => {
  const questions = req.body
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '请提供有效的题目数组' })
  }
  let successCount = 0, failCount = 0
  const promises = questions.map(async (q) => {
    try {
      await dbPool.execute(
        `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.year, q.subject, q.question, JSON.stringify(q.options), q.answer, q.analysis, q.difficulty, q.type || '真题']
      )
      successCount++
    } catch (err) {
      failCount++
    }
  })
  await Promise.all(promises)
  res.json({ success: true, successCount, failCount })
})

app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      'SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------- 题目接口 ----------------
app.get('/api/questions', async (req, res) => {
  const { subject, year, type } = req.query
  let sql = 'SELECT * FROM questions'
  let params = []
  let conditions = []
  if (subject) { conditions.push(' subject = ?'); params.push(subject) }
  if (year) { conditions.push(' year = ?'); params.push(year) }
  if (type) { conditions.push(' type = ?'); params.push(type) }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND')
  sql += ' ORDER BY id DESC'
  try {
    const [rows] = await dbPool.execute(sql, params)
    res.json(rows.map(row => ({ ...row, options: JSON.parse(row.options) })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/questions', async (req, res) => {
  const { year, subject, question, options, answer, analysis, difficulty, type } = req.body
  try {
    const [result] = await dbPool.execute(
      `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [year, subject, question, JSON.stringify(options), answer, analysis, difficulty, type || '真题']
    )
    res.json({ success: true, id: result.insertId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/questions/:id', async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM questions WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})



// 获取用户错题详情（用于刷题），支持按科目筛选
app.get('/api/user/errors/questions', async (req, res) => {
  const { userId, subject } = req.query;
  if (!userId) return res.status(400).json({ error: '缺少 userId' });

  let sql = `
    SELECT q.* FROM user_errors e
    JOIN questions q ON e.question_id = q.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  if (subject) {
    sql += ' AND e.subject = ?';
    params.push(subject);
  }
  sql += ' ORDER BY e.create_time DESC';

  try {
    const [rows] = await dbPool.execute(sql, params);
    rows.forEach(row => {
      row.options = JSON.parse(row.options);
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 科目列表接口（用于前端动态加载科目） ----------------
app.get('/api/subjects', async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT DISTINCT subject FROM questions WHERE subject IS NOT NULL AND subject != ""')
    const subjects = rows.map(row => row.subject)
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------- 托管前端 ----------------
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  console.log('✅ 前端dist文件夹加载成功')
}

app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('请先执行 npm run build 打包前端')
  }
})

// ---------------- 启动服务 ----------------
const PORT = process.env.PORT || 3000
initDBPool().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 后端服务已成功启动！`)
    console.log(`📚 刷题系统主站：http://localhost:${PORT}`)
    console.log(`🔐 管理员后台：http://localhost:${PORT}/admin`)
    console.log(`👤 默认管理员账号：admin / 密码：123456\n`)
  })
})

module.exports = app