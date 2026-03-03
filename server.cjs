const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise') 
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

// 🔴 关键修改1：将单个连接改为连接池（全局变量）
let dbPool;

// 1. 初始化数据库连接池（适配本地+Railway双环境）
async function initDBPool() {
  try {
    // 区分环境：Railway用DATABASE_URL，本地用手动配置
    const dbConfig = process.env.DATABASE_URL 
      ? {
          uri: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }, // Railway MySQL必须开启SSL
          enableKeepAlive: true, // 启用心跳保活（防止连接被断开）
          keepAliveInitialDelay: 30000, // 30秒发送一次心跳包
          connectionLimit: 10, // 最大连接数
          queueLimit: 0 // 排队请求无限制
        }
      : {
          host: 'localhost',     
          user: 'root',          
          password: 'Yang123!',   
          database: 'exam_db',   
          port: 3306,
          charset: 'utf8mb4',
          enableKeepAlive: true, // 本地也启用心跳保活
          keepAliveInitialDelay: 30000,
          connectionLimit: 10,
          queueLimit: 0
        };

    // 🔴 关键修改2：创建连接池而非单个连接
    dbPool = process.env.DATABASE_URL 
      ? await mysql.createPool(dbConfig.uri, {
          ssl: dbConfig.ssl,
          enableKeepAlive: dbConfig.enableKeepAlive,
          keepAliveInitialDelay: dbConfig.keepAliveInitialDelay,
          connectionLimit: dbConfig.connectionLimit,
          queueLimit: dbConfig.queueLimit
        })
      : await mysql.createPool(dbConfig);

    console.log('✅ MySQL数据库连接池初始化成功');
    await createTables(); // 自动创建表
  } catch (err) {
    console.error('❌ MySQL数据库连接池初始化失败:', err.message);
    process.exit(1);
  }
}

// 2. 自动创建所有表（适配连接池）
async function createTables() {
  // 🔴 关键修改3：从连接池获取连接执行SQL
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

  // 管理员表（默认账号：admin / 123456）
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
    avatar VARCHAR(255),
    registerTime VARCHAR(255)
  )`);
}

// ---------------- 核心：用户注册/登录接口（适配连接池） ----------------
// 用户注册接口
app.post('/api/user/register', async (req, res) => {
  const { username, password, phone, qq } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  
  const registerTime = new Date().toLocaleString()
  try {
    // 🔴 所有db.execute改为dbPool.execute
    const [result] = await dbPool.execute(
      `INSERT INTO users (username, password, phone, qq, registerTime) VALUES (?, ?, ?, ?, ?)`,
      [username, password, phone || null, qq || null, registerTime]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.message.includes('Duplicate entry') && err.message.includes('username')) {
      return res.status(400).json({ error: '用户名已被注册' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 用户登录接口
app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length > 0) {
      const { password, ...userInfo } = rows[0];
      res.json({ success: true, userInfo });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 管理员接口（适配连接池） ----------------
// 管理员登录
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM admins WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length > 0) {
      res.json({ success: true, username: rows[0].username });
    } else {
      res.status(401).json({ error: '账号或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 批量导入题目
app.post('/api/admin/batch-import', async (req, res) => {
  const questions = req.body
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '请提供有效的题目数组' })
  }

  let successCount = 0
  let failCount = 0
  const promises = questions.map(async (q) => {
    try {
      await dbPool.execute(
        `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.year, q.subject, q.question, 
          JSON.stringify(q.options), q.answer, q.analysis, q.difficulty,
          q.type || '真题'
        ]
      );
      successCount++
    } catch (err) {
      failCount++
    }
  })

  await Promise.all(promises)
  res.json({ success: true, successCount, failCount })
})

// 获取所有用户列表（管理员用）
app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      'SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除用户（管理员用）
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 题目接口（适配连接池） ----------------
// 获取题目（支持按科目/年份/类型筛选）
app.get('/api/questions', async (req, res) => {
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
  
  try {
    const [rows] = await dbPool.execute(sql, params);
    res.json(rows.map(row => ({ ...row, options: JSON.parse(row.options) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加单题
app.post('/api/questions', async (req, res) => {
  const { year, subject, question, options, answer, analysis, difficulty, type } = req.body
  try {
    const [result] = await dbPool.execute(
      `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        year, subject, question, JSON.stringify(options), answer, analysis, difficulty,
        type || '真题'
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除题目
app.delete('/api/questions/:id', async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ---------------- 启动服务 ----------------
const PORT = process.env.PORT || 3000
// 🔴 启动时初始化连接池而非单个连接
initDBPool().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 后端服务已成功启动！`)
    console.log(`📚 刷题系统主站：http://localhost:${PORT}`)
    console.log(`🔐 管理员后台：http://localhost:${PORT}/admin`)
    console.log(`👤 默认管理员账号：admin / 密码：123456\n`)
  });
});

module.exports = app