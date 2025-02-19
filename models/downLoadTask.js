import { DataTypes } from 'sequelize';
import sequelize from '../database.js'; // 显式带上 .js 后缀
import log from '../utils/logger.js';

const DownLoadTask = sequelize.define('DownLoadTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'taskid',
  },
  FileId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '文件ID',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '任务类型',
  },
});

(async () => {
  await DownLoadTask.sync(); // 如果表不存在，则创建表
  log.info('DownLoadTask表同步成功');
})();

export default DownLoadTask;
