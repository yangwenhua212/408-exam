require('dotenv').config();
const bcrypt = require('bcryptjs');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const redis = require('redis');

// 引入中间件
const authMiddleware = require('./middleware/auth.cjs');
const adminMiddleware = require('./middleware/admin.cjs');

// ========== 全局错误捕获 ==========
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ========== Redis 客户端初始化 ==========
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.connect().then(() => console.log('✅ Redis 连接成功')).catch(console.error);
} else {
  console.log('⚠️ 未设置 REDIS_URL，将不使用缓存');
}

// ========== 缓存工具函数 ==========
async function getCache(key) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis get error:', err);
    return null;
  }
}

async function setCache(key, value, expireSeconds = 300) {
  if (!redisClient || !redisClient.isOpen) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: expireSeconds });
  } catch (err) {
    console.error('Redis set error:', err);
  }
}

async function delCache(key) {
  if (!redisClient || !redisClient.isOpen) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis del error:', err);
  }
}

async function clearQuestionsCache() {
  if (!redisClient || !redisClient.isOpen) return;
  try {
    let cursor = 0;
    const pattern = 'questions:*';
    let deletedCount = 0;
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });
      cursor = reply.cursor;
      const keys = reply.keys;
      if (keys.length) {
        await redisClient.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== 0);

    if (deletedCount > 0) {
      console.log(`Cleared ${deletedCount} question cache keys`);
    }

    // 同时清除科目和题型缓存
    await delCache('subjects');
    await delCache('question-types');
  } catch (err) {
    console.error('Clear cache error:', err);
  }
}

// ========== 配置 multer 图片上传 ==========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传jpg/png/gif/webp格式的图片！'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ========== Express 实例 ==========
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== 数据库连接池 ==========
let dbPool;

async function initDBPool() {
  try {
    let poolConfig;
    if (process.env.DATABASE_URL) {
      poolConfig = {
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000
      };
      dbPool = await mysql.createPool(poolConfig.uri, {
        ssl: poolConfig.ssl,
        connectionLimit: poolConfig.connectionLimit,
        queueLimit: poolConfig.queueLimit,
        enableKeepAlive: poolConfig.enableKeepAlive,
        keepAliveInitialDelay: poolConfig.keepAliveInitialDelay
      });
    } else {
      poolConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: 3306,
        charset: 'utf8mb4',
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000
      };
      dbPool = await mysql.createPool(poolConfig);
    }
    console.log('✅ MySQL数据库连接池初始化成功');
    await createTables();
  } catch (err) {
    console.error('❌ MySQL数据库连接池初始化失败:', err.message);
    process.exit(1);
  }
}

// ========== 创建数据表 ==========
async function createTables() {
  // 题目表
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    question_index INT NULL,
    subject VARCHAR(255),
    question TEXT,
    options TEXT,
    answer VARCHAR(255),
    analysis TEXT,
    difficulty VARCHAR(50),
    type VARCHAR(50) DEFAULT '真题',
    question_type VARCHAR(50) DEFAULT '单选题'
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

  // 错题表
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

  // 修复字段类型
  try {
    await dbPool.execute(`ALTER TABLE users MODIFY avatar LONGTEXT`);
    console.log('✅ 已确保 users.avatar 字段为 LONGTEXT');
    await dbPool.execute(`ALTER TABLE questions MODIFY question_type VARCHAR(50) DEFAULT '单选题'`);
    console.log('✅ 已确保 questions.question_type 字段配置完成');
  } catch (err) {
    console.log('⚠️ 检查字段时出现非致命错误:', err.message);
  }

  // 创建默认管理员用户（如果不存在）
  const [adminExists] = await dbPool.execute('SELECT * FROM users WHERE username = ?', ['admin']);
  if (adminExists.length === 0) {
    const hashedPwd = await bcrypt.hash('123456', 10);
    await dbPool.execute(
      'INSERT INTO users (username, password, registerTime) VALUES (?, ?, ?)',
      ['admin', hashedPwd, new Date().toLocaleString()]
    );
  }
}

// ========== 用户相关接口 ==========
app.post('/api/user/register', async (req, res) => {
  const { username, password, phone, qq } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  const registerTime = new Date().toLocaleString();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await dbPool.execute(
      `INSERT INTO users (username, password, phone, qq, registerTime, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, phone || null, qq || null, registerTime, '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.message.includes('Duplicate entry')) return res.status(400).json({ error: '用户名已被注册' });
    res.status(500).json({ error: err.message });
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await dbPool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: '用户名或密码错误' });
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userInfo } = user;
    res.json({ success: true, token, userInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/update', authMiddleware, async (req, res) => {
  const { username, bio, location, avatar } = req.body;
  if (username !== req.user.username) return res.status(403).json({ error: '无权修改他人信息' });
  if (!username) return res.status(400).json({ error: '用户名不能为空' });
  try {
    const fields = [];
    const values = [];
    if (bio !== undefined) { fields.push('bio = ?'); values.push(bio || null); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location || null); }
    if (avatar !== undefined && avatar !== null && avatar !== '') { fields.push('avatar = ?'); values.push(avatar); }
    if (fields.length === 0) return res.json({ success: true });
    const sql = 'UPDATE users SET ' + fields.join(', ') + ' WHERE username = ?';
    values.push(username);
    await dbPool.execute(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 错题相关接口 ==========
app.post('/api/user/errors', authMiddleware, async (req, res) => {
  const { questionId, subject, userAnswer } = req.body;
  const userId = req.user.id;
  if (!questionId || !subject || !userAnswer) return res.status(400).json({ error: '缺少必要参数' });
  try {
    await dbPool.execute(
      `INSERT IGNORE INTO user_errors (user_id, question_id, subject, user_answer) VALUES (?, ?, ?, ?)`,
      [userId, questionId, subject, userAnswer]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/errors', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { subject, questionType } = req.query;
  let sql = `
    SELECT e.*, q.question, q.options, q.answer AS correct_answer, q.analysis, q.year, q.difficulty, q.question_type
    FROM user_errors e
    JOIN questions q ON e.question_id = q.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  if (subject) { sql += ' AND e.subject = ?'; params.push(subject); }
  if (questionType) { sql += ' AND q.question_type = ?'; params.push(questionType); }
  sql += ' ORDER BY e.create_time DESC';
  try {
    const [rows] = await dbPool.execute(sql, params);
    rows.forEach(row => {
      if (row.options) {
        try { row.options = JSON.parse(row.options); } catch (e) { row.options = []; }
      } else { row.options = []; }
    });
    res.json(rows);
  } catch (err) {
    console.error('❌ 获取错题列表失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/errors/:id', authMiddleware, async (req, res) => {
  const errorId = req.params.id;
  const userId = req.user.id;
  try {
    const [rows] = await dbPool.execute('SELECT user_id FROM user_errors WHERE id = ?', [errorId]);
    if (rows.length === 0) return res.status(404).json({ error: '错题不存在' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: '无权删除他人的错题' });
    await dbPool.execute('DELETE FROM user_errors WHERE id = ?', [errorId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 管理员接口 ==========
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await dbPool.execute('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) res.json({ success: true, username: rows[0].username });
    else res.status(401).json({ error: '账号或密码错误' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/batch-import', authMiddleware, adminMiddleware, async (req, res) => {
  const questions = req.body;
  if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: '请提供有效的题目数组' });
  let successCount = 0, failCount = 0;
  const promises = questions.map(async (q) => {
    try {
      await dbPool.execute(
        `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type, question_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.year, q.subject, q.question, JSON.stringify(q.options), q.answer, q.analysis, q.difficulty, q.type || '真题', q.question_type || '单选题']
      );
      successCount++;
    } catch (err) {
      failCount++;
      console.error(`导入题目失败:`, err.message);
    }
  });
  await Promise.all(promises);
  // 批量导入后清除缓存
  await clearQuestionsCache();
  res.json({ success: true, successCount, failCount });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 题目接口 ==========
app.get('/api/questions', async (req, res) => {
  const { subject, year, type, questionType } = req.query;
  const cacheKey = `questions:${subject || 'all'}:${year || 'all'}:${type || 'all'}:${questionType || 'all'}`;
  try {
    let data = await getCache(cacheKey);
    if (data) {
      console.log(`Cache hit: ${cacheKey}`);
      return res.json(data);
    }

    let sql = 'SELECT * FROM questions';
    let params = [];
    const conditions = [];
    if (subject) { conditions.push(' subject = ?'); params.push(subject); }
    if (year) { conditions.push(' year = ?'); params.push(year); }
    if (type) { conditions.push(' type = ?'); params.push(type); }
    if (questionType) { conditions.push(' question_type = ?'); params.push(questionType); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND');
    sql += ' ORDER BY id DESC';

    const [rows] = await dbPool.execute(sql, params);
    data = rows.map(row => ({ ...row, options: row.options ? JSON.parse(row.options) : [] }));
    await setCache(cacheKey, data, 300);
    res.json(data);
  } catch (err) {
    console.error('❌ 查询题目失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', authMiddleware, adminMiddleware, async (req, res) => {
  const { year, questionIndex, subject, question, options, answer, analysis, difficulty, type, questionType } = req.body;
  try {
    if (type === '真题' && questionIndex) {
      const [existing] = await dbPool.execute(
        'SELECT id FROM questions WHERE year = ? AND question_index = ?',
        [year, questionIndex]
      );
      if (existing.length > 0) return res.status(400).json({ error: `该年份第${questionIndex}题已存在，请使用不同序号` });
    }
    const [result] = await dbPool.execute(
      `INSERT INTO questions (year, question_index, subject, question, options, answer, analysis, difficulty, type, question_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [year, type === '真题' ? questionIndex : null, subject, question, JSON.stringify(options), answer, analysis, difficulty, type || '真题', questionType || '单选题']
    );
    // 插入成功后清除缓存
    await clearQuestionsCache();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('❌ 添加题目失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM questions WHERE id = ?', [req.params.id]);
    await clearQuestionsCache();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 删除题目失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/questions/batch', authMiddleware, adminMiddleware, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: '请提供要删除的题目ID数组' });
  try {
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await dbPool.execute(`DELETE FROM questions WHERE id IN (${placeholders})`, ids);
    await clearQuestionsCache();
    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (err) {
    console.error('❌ 批量删除错误:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/errors/questions', async (req, res) => {
  const { userId, subject, questionType } = req.query;
  if (!userId) return res.status(400).json({ error: '缺少 userId' });
  let sql = `
    SELECT q.* FROM user_errors e
    JOIN questions q ON e.question_id = q.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  if (subject) { sql += ' AND e.subject = ?'; params.push(subject); }
  if (questionType) { sql += ' AND q.question_type = ?'; params.push(questionType); }
  sql += ' ORDER BY e.create_time DESC';
  try {
    const [rows] = await dbPool.execute(sql, params);
    rows.forEach(row => { row.options = row.options ? JSON.parse(row.options) : []; });
    res.json(rows);
  } catch (err) {
    console.error('❌ 获取错题详情失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ========== 辅助接口（带缓存） ==========
app.get('/api/subjects', async (req, res) => {
  const cacheKey = 'subjects';
  try {
    let subjects = await getCache(cacheKey);
    if (subjects) return res.json(subjects);

    const [rows] = await dbPool.execute('SELECT DISTINCT subject FROM questions WHERE subject IS NOT NULL AND subject != ""');
    subjects = rows.map(row => row.subject);
    await setCache(cacheKey, subjects, 600); // 10分钟过期
    res.json(subjects);
  } catch (err) {
    console.error('❌ 获取科目列表失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/question-types', async (req, res) => {
  const cacheKey = 'question-types';
  try {
    let types = await getCache(cacheKey);
    if (types) return res.json(types);

    const [rows] = await dbPool.execute('SELECT DISTINCT question_type FROM questions WHERE question_type IS NOT NULL AND question_type != ""');
    types = rows.map(row => row.question_type);
    const defaultTypes = ['单选题', '多选题', '判断题', '填空题', '简答题'];
    const allTypes = [...new Set([...defaultTypes, ...types])];
    await setCache(cacheKey, allTypes, 600);
    res.json(allTypes);
  } catch (err) {
    console.error('❌ 获取题型列表失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/upload-image', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

// ========== 静态文件托管 ==========
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ 前端dist文件夹加载成功');
}

// SPA 回退路由（放在最后）
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('请先执行 npm run build 打包前端');
});

// ========== 启动服务 ==========
const PORT = process.env.PORT || 3000;
initDBPool().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 后端服务已成功启动！`);
    console.log(`📚 刷题系统主站：http://localhost:${PORT}`);
    console.log(`🔐 管理员后台：http://localhost:${PORT}/admin`);
    console.log(`👤 默认管理员账号：admin / 密码：123456\n`);
    console.log(`🔍 新增功能：`);
    console.log(`   - 题目支持题型分类（单选/多选/判断等）`);
    console.log(`   - 删除题目自动删除关联错题`);
    console.log(`   - 新增/api/question-types接口获取题型列表`);
    console.log(`   - Redis 缓存已启用，提升查询性能`);
  });
});

module.exports = app;