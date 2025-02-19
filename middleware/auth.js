import jwt from 'jsonwebtoken';
import log from '../utils/logger.js';
import { jsonMsg } from '../utils/msg.js';

export const authMiddleware = (roles = []) => {
  // 确保 roles 是数组
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // 从 Authorization Header 获取 Bearer Token
    
    if (!token) {
      log.error(`用户token认证失败`);
      return jsonMsg(res, 401, 'token认证失败!');
    }

    try {
      // 验证 Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 检查角色是否符合要求
      // if (roles.length && !roles.includes(decoded.role)) {
      //   return res.status(403).json({ error: 'You do not have permission to access this resource' });
      // }

      req.user = decoded; // 将解析的用户信息附加到 request 对象上
      next();
    } catch (error) {
      log.error(`用户token认证失败`);
      return jsonMsg(res, 401, 'token认证失败!');
    }
  };
};
