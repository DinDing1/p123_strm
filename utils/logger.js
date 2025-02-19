import winston from 'winston';
import path from 'path';

// 配置日志格式和存储位置
const logger = winston.createLogger({
  level: 'info', // 默认日志级别 (e.g., 'info', 'warn', 'error', etc.)
  format: winston.format.combine(
    winston.format.timestamp(), // 添加时间戳到日志
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`; // 日志格式
    })
  ),
  transports: [
    new winston.transports.Console({ level: 'debug' }), // 将日志输出到控制台
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error', // 只将错误日志保存到文件
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
    }),
  ],
});

// // 如果是开发环境，启用更多详细日志
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.simple(),
//     })
//   );
// }

export default logger;
