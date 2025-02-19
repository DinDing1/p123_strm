import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import log from '../utils/logger.js';

const File = sequelize.define(
  'File',
  {
    FileId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      comment: '文件ID',
    },
    FileName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '文件名',
    },
    Type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '文件类型 (0: 文件; 1: 目录)',
    },
    Size: {
      type: DataTypes.BIGINT, // 使用 BIGINT 存储文件大小
      allowNull: true, // 允许为空
      comment: '文件大小 (字节)',
      /**
       * 自定义 getter 和 setter，解决数据可能为空字符串的问题
       */
      set(value) {
        // 如果值为空字符串或 null，则存储为 null
        this.setDataValue('Size', value === "" ? null : value);
      },
      get() {
        // 统一返回整数值或 null
        const rawValue = this.getDataValue('Size');
        return rawValue !== null ? parseInt(rawValue, 10) : 0;
      },
    },
    ContentType: {
      type: DataTypes.STRING,
      comment: '文件的内容类型',
    },
    S3KeyFlag: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'S3 文件标识',
    },
    CreateAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '文件的创建时间',
    },
    UpdateAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '文件的更新时间',
    },
    Hidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否隐藏',
    },
    Etag: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '文件的 MD5 哈希值',
    },
    Status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '文件状态',
    },
    ParentFileId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: '父目录的文件 ID',
    },
    Category: {
      type: DataTypes.INTEGER,
      comment: '分类类型 (例如 3 表示视频)',
    },
    PunishFlag: {
      type: DataTypes.INTEGER,
      comment: '惩罚标志',
    },
    ParentName: {
      type: DataTypes.STRING,
      comment: '父文件夹名称',
    },
    DownloadUrl: {
      type: DataTypes.TEXT,
      comment: '文件下载 URL',
    },
    AbnormalAlert: {
      type: DataTypes.INTEGER,
      comment: '异常警告标志',
    },
    Trashed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否已被移到回收站',
    },
    TrashedExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '回收站过期时间',
    },
    TrashedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '回收站中的时间',
    },
    StorageNode: {
      type: DataTypes.STRING,
      comment: '存储节点',
    },
    DirectLink: {
      type: DataTypes.INTEGER,
      comment: '直接链接标志',
    },
    AbsPath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '文件的绝对路径',
    },
    PinYin: {
      type: DataTypes.STRING,
      comment: '文件名的拼音',
    },
    BusinessType: {
      type: DataTypes.INTEGER,
      comment: '业务类型',
    },
    Thumbnail: {
      type: DataTypes.STRING,
      comment: '缩略图 URL',
    },
    Operable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否可操作',
    },
    StarredStatus: {
      type: DataTypes.INTEGER,
      comment: '标建议星状态',
    },
    HighLight: {
      type: DataTypes.STRING,
      comment: '高亮部分（仅搜索时有用）',
    },
    EnableAppeal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否可以申诉',
    },
    ToolTip: {
      type: DataTypes.STRING,
      comment: '工具提示信息',
    },
    RefuseReason: {
      type: DataTypes.INTEGER,
      comment: '拒绝原因标志',
    },
    DirectTranscodeStatus: {
      type: DataTypes.INTEGER,
      comment: '直接转码状态',
    },
    PreviewType: {
      type: DataTypes.INTEGER,
      comment: '预览文件的类型',
    },
    IsLock: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否被锁定',
    },
  },
  {
    tableName: 'Files',
    timestamps: false,
  }
);

(async () => {
  // 同步表结构
  try {
    await File.sync();
    log.info('File表同步成功');
  } catch (err) {
    log.error('File表同步失败: ', err.message);
  }
})();

export default File;
