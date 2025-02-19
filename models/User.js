import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import bcrypt from 'bcrypt';
import log from '../utils/logger.js';

// 定义 User 模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Primary key: unique identifier for the user',
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique username for the user',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Hashed password for the user',
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'), // 固定的角色选项
    allowNull: false,
    defaultValue: 'user',
    comment: 'User role: can be admin, user, or company',
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      // Hash the password before saving user
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      // Hash the password if it's being updated
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// 创建系统默认管理员账户
(async () => {
  // 同步表结构: 如果表不存在则创建
  await User.sync({ alter: true }); // `alter: true` 只更新模型差异，不摧毁数据
  
  log.info('用户表同步成功');

  // 检查并创建默认管理员账户
  const [admin, created] = await User.findOrCreate({
    where: { username: 'admin' },
    defaults: {
      password: 'a123456', // 默认密码
      role: 'admin',
    },
  });

  if (created) {
    log.info('默认账户创建成功: admin/a123456');
  }
})();

export default User;
