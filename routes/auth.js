import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import log from '../utils/logger.js';
import { jsonMsg } from '../utils/msg.js';
const router = express.Router();

// 登录接口
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  log.info(`用户尝试登录：${username}`);
  try {
    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return jsonMsg(res, 404, '用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return jsonMsg(res, 401, '密码错误');
    }

    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token 1小时有效
    );
    return jsonMsg(res, 200, '登陆成功',{
      token:token
    });
  } catch (error) {
    return jsonMsg(res, 400, '登陆失败');
  }
});


export default router;
