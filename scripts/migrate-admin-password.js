import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// 获取当前文件目录，便于加载 .env（如果 .env 在项目根目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  let connection;
  try {
    const dbConfig = process.env.DATABASE_URL
      ? { uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
      : {
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: 3306,
          charset: 'utf8mb4'
        };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    const [rows] = await connection.execute('SELECT id, username, password FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      console.log('⚠️ admin 用户不存在，将创建新用户');
      const hashedPwd = await bcrypt.hash('123456', 10);
      await connection.execute(
        'INSERT INTO users (username, password, registerTime) VALUES (?, ?, ?)',
        ['admin', hashedPwd, new Date().toLocaleString()]
      );
      console.log('✅ 已创建 admin 用户并设置哈希密码');
    } else {
      const user = rows[0];
      // 判断密码是否已经是 bcrypt 哈希（以 $2 开头）
      if (user.password.startsWith('$2')) {
        console.log('ℹ️ admin 密码已是 bcrypt 哈希，无需更新');
      } else {
        const hashedPwd = await bcrypt.hash('123456', 10);
        await connection.execute('UPDATE users SET password = ? WHERE username = ?', [hashedPwd, 'admin']);
        console.log('✅ admin 密码已更新为 bcrypt 哈希');
      }
    }
  } catch (err) {
    console.error('❌ 迁移失败:', err.message);
  } finally {
    if (connection) await connection.end();
  }
})();