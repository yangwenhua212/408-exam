require('dotenv').config();
const bcrypt = require('bcryptjs');
console.log('DB_USER:', process.env.DB_USER); // 临时调试，启动后查看输出
const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const path = require('path')
const fs = require('fs')
const authMiddleware = require('./middleware/auth.cjs');
const adminMiddleware = require('./middleware/admin.cjs');



// 新增：引入multer并配置上传
const multer = require('multer')
// 创建uploads文件夹（存放上传的图片）
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}
// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳+原文件名，避免重复
    const uniqueName = Date.now() + '-' + file.originalname
    cb(null, uniqueName)
  }
})
// 只允许上传图片
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传jpg/png/gif/webp格式的图片！'), false)
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 限制5MB以内
})

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
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
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
  // 题目表：新增question_type字段（题型：单选/多选/判断等），强化分类
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT,
    question_index INT NULL,               -- 新增：真题序号
    subject VARCHAR(255),
    question TEXT,
    options TEXT, -- 存储选择题选项（JSON格式）
    answer VARCHAR(255),
    analysis TEXT,
    difficulty VARCHAR(50),
    type VARCHAR(50) DEFAULT '真题', -- 题目来源：真题/模拟题
    question_type VARCHAR(50) DEFAULT '单选题' -- 新增：题型（单选/多选/判断/填空等）
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

  // 错题表（已修正语法错误，外键级联删除）
  await dbPool.execute(`CREATE TABLE IF NOT EXISTS user_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    user_answer VARCHAR(10) NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE -- 删除题目时自动删除对应错题
  )`);


  // 自动修复字段类型
  try {
    await dbPool.execute(`ALTER TABLE users MODIFY avatar LONGTEXT`);
    console.log('✅ 已确保 users.avatar 字段为 LONGTEXT');
    // 兼容旧数据：新增question_type字段后，给原有数据默认值
    await dbPool.execute(`ALTER TABLE questions MODIFY question_type VARCHAR(50) DEFAULT '单选题'`);
    console.log('✅ 已确保 questions.question_type 字段配置完成');
  } catch (err) {
    console.log('⚠️ 检查字段时出现非致命错误:', err.message);
  }

  // 在 createTables 函数末尾添加
const [adminExists] = await dbPool.execute('SELECT * FROM users WHERE username = ?', ['admin']);
if (adminExists.length === 0) {
  const hashedPwd = await bcrypt.hash('123456', 10);
  await dbPool.execute(
    'INSERT INTO users (username, password, registerTime) VALUES (?, ?, ?)',
    ['admin', hashedPwd, new Date().toLocaleString()]
  );
}
}

// ---------------- 用户接口 ----------------
// 注册
app.post('/api/user/register', async (req, res) => {
  const { username, password, phone, qq } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const registerTime = new Date().toLocaleString();

  try {
    // 对密码进行哈希（10 为盐的复杂度）
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await dbPool.execute(
      `INSERT INTO users (username, password, phone, qq, registerTime, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, phone || null, qq || null, registerTime, '']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.message.includes('Duplicate entry')) {
      return res.status(400).json({ error: '用户名已被注册' });
    }
    res.status(500).json({ error: err.message });
  }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // 先查出用户（使用 bcrypt 比较密码）
    const [rows] = await dbPool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...userInfo } = user; // 移除密码字段
    res.json({ success: true, token, userInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 登录
// app.post('/api/user/login', async (req, res) => {
//   const { username, password } = req.body
//   try {
//     const [rows] = await dbPool.execute(
//       'SELECT * FROM users WHERE username = ? AND password = ?',
//       [username, password]
//     )
//     if (rows.length > 0) {
//       const { password, ...userInfo } = rows[0]
//       res.json({ success: true, userInfo })
//     } else {
//       res.status(401).json({ error: '用户名或密码错误' })
//     }
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// 更新用户信息
app.post('/api/user/update', authMiddleware, async (req, res) => {
  const { username, bio, location, avatar } = req.body;
  // 只能修改自己的信息（通过 token 中的 username 匹配）
  if (username !== req.user.username) {
    return res.status(403).json({ error: '无权修改他人信息' });
  }
  if (!username) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  try {
    let sql = 'UPDATE users SET ';
    const values = [];
    const fields = [];

    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio || null);
    }
    if (location !== undefined) {
      fields.push('location = ?');
      values.push(location || null);
    }
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      fields.push('avatar = ?');
      values.push(avatar);
    }

    if (fields.length === 0) {
      return res.json({ success: true });
    }

    sql += fields.join(', ') + ' WHERE username = ?';
    values.push(username);

    await dbPool.execute(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 错题相关接口 ----------------
// 保存错题
app.post('/api/user/errors', authMiddleware, async (req, res) => {
  const { questionId, subject, userAnswer } = req.body;
  const userId = req.user.id; // 从 token 中获取当前登录用户的 ID

  if (!questionId || !subject || !userAnswer) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

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

// 获取用户错题列表（支持按科目/题型筛选）
app.get('/api/user/errors', authMiddleware, async (req, res) => {
  const userId = req.user.id;   // 从 token 中获取
  const { subject, questionType } = req.query;

  let sql = `
    SELECT e.*, q.question, q.options, q.answer AS correct_answer, q.analysis, q.year, q.difficulty, q.question_type
    FROM user_errors e
    JOIN questions q ON e.question_id = q.id
    WHERE e.user_id = ?
  `;
  const params = [userId];
  if (subject) {
    sql += ' AND e.subject = ?';
    params.push(subject);
  }
  if (questionType) {
    sql += ' AND q.question_type = ?';
    params.push(questionType);
  }
  sql += ' ORDER BY e.create_time DESC';

  try {
    const [rows] = await dbPool.execute(sql, params);
    rows.forEach(row => {
      if (row.options) {
        try {
          row.options = JSON.parse(row.options);
        } catch (e) {
          console.error(`解析 options 失败: question_id=${row.question_id}, options=${row.options}`, e);
          row.options = [];
        }
      } else {
        row.options = [];
      }
    });
    res.json(rows);
  } catch (err) {
    console.error('❌ 获取错题列表失败:', err.stack);
    res.status(500).json({ error: err.message });
  }
});



// 删除错题
app.delete('/api/user/errors/:id', authMiddleware, async (req, res) => {
  const errorId = req.params.id;
  const userId = req.user.id;
  try {
    // 先验证该错题是否属于当前用户
    const [rows] = await dbPool.execute(
      'SELECT user_id FROM user_errors WHERE id = ?',
      [errorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '错题不存在' });
    }
    if (rows[0].user_id !== userId) {
      return res.status(403).json({ error: '无权删除他人的错题' });
    }
    await dbPool.execute('DELETE FROM user_errors WHERE id = ?', [errorId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// 批量导入题目：新增question_type字段支持
app.post('/api/admin/batch-import', authMiddleware, adminMiddleware, async (req, res) => {
  const questions = req.body
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '请提供有效的题目数组' })
  }
  let successCount = 0, failCount = 0
  const promises = questions.map(async (q) => {
    try {
      await dbPool.execute(
        `INSERT INTO questions (year, subject, question, options, answer, analysis, difficulty, type, question_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.year, 
          q.subject, 
          q.question, 
          JSON.stringify(q.options), 
          q.answer, 
          q.analysis, 
          q.difficulty, 
          q.type || '真题',
          q.question_type || '单选题' // 新增题型字段
        ]
      )
      successCount++
    } catch (err) {
      failCount++
      console.error(`导入题目失败:`, err.message)
    }
  })
  await Promise.all(promises)
  res.json({ success: true, successCount, failCount })
})

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      'SELECT id, username, phone, qq, bio, location, avatar, registerTime FROM users ORDER BY id DESC'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------- 题目接口 ----------------
// 查询题目：新增按题型筛选，返回题型字段
app.get('/api/questions', async (req, res) => {
  const { subject, year, type, questionType } = req.query
  let sql = 'SELECT * FROM questions'
  let params = []
  let conditions = []
  if (subject) { conditions.push(' subject = ?'); params.push(subject) }
  if (year) { conditions.push(' year = ?'); params.push(year) }
  if (type) { conditions.push(' type = ?'); params.push(type) }
  // 新增：按题型筛选
  if (questionType) { conditions.push(' question_type = ?'); params.push(questionType) }
  
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND')
  sql += ' ORDER BY id DESC'
  
  try {
    const [rows] = await dbPool.execute(sql, params)
    // 解析options为JSON，保留question_type字段
    res.json(rows.map(row => ({ 
      ...row, 
      options: row.options ? JSON.parse(row.options) : [] 
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 新增题目：支持题型字段
app.post('/api/questions', authMiddleware, adminMiddleware, async (req, res) => {
  const { year, questionIndex, subject, question, options, answer, analysis, difficulty, type, questionType } = req.body;
  try {
    // 如果是真题且提供了 questionIndex，检查同一年是否已存在相同序号
    if (type === '真题' && questionIndex) {
      const [existing] = await dbPool.execute(
        'SELECT id FROM questions WHERE year = ? AND question_index = ?',
        [year, questionIndex]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: `该年份第${questionIndex}题已存在，请使用不同序号` });
      }
    }
    const [result] = await dbPool.execute(
      `INSERT INTO questions (year, question_index, subject, question, options, answer, analysis, difficulty, type, question_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        year,
        type === '真题' ? questionIndex : null,
        subject,
        question,
        JSON.stringify(options),
        answer,
        analysis,
        difficulty,
        type || '真题',
        questionType || '单选题'
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除题目：自动删除关联的错题（外键级联）
app.delete('/api/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await dbPool.execute('DELETE FROM questions WHERE id = ?', [req.params.id])
    // 外键已配置ON DELETE CASCADE，该题的options和关联错题会自动删除
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 批量删除题目（同步删除关联错题）
app.delete('/api/questions/batch', authMiddleware, adminMiddleware, async (req, res) => {
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
    // 外键已配置ON DELETE CASCADE，错题会自动删除
    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (err) {
    console.error('❌ 批量删除错误:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// 获取用户错题详情（支持按科目/题型筛选）
app.get('/api/user/errors/questions', async (req, res) => {
  const { userId, subject, questionType } = req.query;
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
  // 新增：按题型筛选
  if (questionType) {
    sql += ' AND q.question_type = ?';
    params.push(questionType);
  }
  sql += ' ORDER BY e.create_time DESC';

  try {
    const [rows] = await dbPool.execute(sql, params);
    rows.forEach(row => {
      row.options = row.options ? JSON.parse(row.options) : [];
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- 分类接口增强 ----------------
// 获取科目列表
app.get('/api/subjects', async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT DISTINCT subject FROM questions WHERE subject IS NOT NULL AND subject != ""')
    const subjects = rows.map(row => row.subject)
    res.json(subjects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 新增：获取题型列表（单选/多选/判断等），用于前端下拉选择
app.get('/api/question-types', async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT DISTINCT question_type FROM questions WHERE question_type IS NOT NULL AND question_type != ""')
    const types = rows.map(row => row.question_type)
    // 补充默认题型（防止数据库无数据时前端无选项）
    const defaultTypes = ['单选题', '多选题', '判断题', '填空题', '简答题']
    const allTypes = [...new Set([...defaultTypes, ...types])]
    res.json(allTypes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 静态托管上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 上传图片（需登录且管理员）
app.post('/api/upload-image', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  // 返回图片可访问的 URL
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

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
  });
});

module.exports = app