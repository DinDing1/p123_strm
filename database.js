import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载数据库路径
const databasePath = process.env.DATABASE_PATH || './database.sqlite';

// 初始化 Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, databasePath), // SQLite 文件路径
  logging: false, // 关闭 Sequelize 的日志
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to SQLite has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the SQLite database:', error);
  }
})();

export default sequelize;
