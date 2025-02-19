import { DataTypes } from 'sequelize';
import sequelize from '../database.js'; // 显式带上 .js 后缀
import log from '../utils/logger.js';

const Accounts = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '账户ID',
  },
  account: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '账户',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '密码',
  },
  cookie: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'cookie',
  },
  expire_time: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'cookie过期时间',
  },
  isVip: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    comment: '是否是vip',
  },
  HeadImage: {
    type: DataTypes.STRING,
    comment: '头像',
  },
});

(async () => {
  await Accounts.sync(); // 如果表不存在，则创建表
  log.info('123账户表同步成功');
})();

export default Accounts;
