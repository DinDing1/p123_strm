import P123Account from "../models/123PanAccount.js";
import fs from "fs";
import readline from "readline";
import express from 'express';
import log from '../utils/logger.js';
import { jsonMsg } from '../utils/msg.js';
import Joi from 'joi'; // 用于数据校验
import { get123UserToken } from "../utils/get123panInfo.js";
import { forEach, map,get } from "lodash-es";
import { TaskQueen } from "../utils/task.js"
import { getUserInfo } from "../utils/proxy.js";
import path from "path";
import { traverseNode } from "../utils/p123Limit.js";
const router = express.Router();

// 定义 schema 进行数据校验
const schema = Joi.object({
  accountList: Joi.array()
    .items(
      Joi.object({
        account: Joi.string().required(),            
        password: Joi.string().required(), 
      })
    )
    .required()
    .min(1),
});

// 路由逻辑：批量创建账户
router.post('/addAccounts', async (req, res) => {
  try {
    // 校验请求体数据
    const { error } = schema.validate(req.body);
    if (error) {
      log.warn(`Invalid request: ${error.message}`);
      return jsonMsg(res, 400, `数据校验失败: ${error.message}`);
    }

    const { accountList } = req.body;
    log.info(`开始批量处理账户: ${accountList.map(acc => acc.account).join(', ')}`);

    // 1. 批量请求 Token
    const tokenResults = await Promise.all(
      accountList.map(async (account) => {
        try {
          const tokenResult = await get123UserToken(account.account, account.password);
          // 成功返回 token 数据
          return {
            ...tokenResult,
            success: tokenResult.code === 200,
            ...account,
          };
        } catch (err) {
          log.error(`获取Token失败: ${account.account}`, err);
          return { ...account, success: false, error: err.message };
        }
      })
    );

    // 2. 分类结果：成功和失败
    const successTokens = tokenResults.filter(item => item.success);  // 成功获取 token 的账户
    const failedTokens = tokenResults.filter(item => !item.success); // 获取 token 失败的账户

    // 3. 获取成功账户的用户信息 (并发处理)
    const userInfoResults = await Promise.all(
      successTokens.map(async (item) => {
        try {
          const userInfo = await getUserInfo(item.data.token); // 基于 token 获取用户信息
          return {
            ...item,
            userInfo,
          };
        } catch (err) {
          log.error(`获取用户信息失败: ${item.account}`, err);
          return {
            ...item,
            userInfo: null,
            error: `用户信息获取失败: ${err.message}`,
          };
        }
      })
    );

    // 4. 使用 findOrCreate 来存储账户数据
    const successAccounts = [];
    const failedAccounts = [...failedTokens]; // 初始化为 token 失败的账户

    await Promise.all(
      userInfoResults.map(async (item) => {
        try {
          // 使用 findOrCreate
          const [accountRecord, isNewRecord] = await P123Account.findOrCreate({
            where: { account: item.account },
            defaults: {
              password: item.password,
              cookie: item.data.token,
              expire_time: item.data.expire,
              user_info: item.userInfo ? JSON.stringify(item.userInfo) : null,
              isVip: get(item.userInfo, 'Vip', false),
              HeadImage: get(item.userInfo, 'HeadImage', null),
            },
          });

          if (!isNewRecord) {
            // 如果是旧记录，手动更新需要覆盖的字段
            await accountRecord.update({
              password: item.password,
              cookie: item.data.token,
              expire_time: item.data.expire,
              user_info: item.userInfo ? JSON.stringify(item.userInfo) : null,
            });
          }

          successAccounts.push(item.account); // 记录操作成功的账户
        } catch (err) {
          log.error(`账户存储失败: ${item.account}`, err);

          // 捕获存储失败的账户
          failedAccounts.push({
            ...item,
            error: '数据库操作失败',
          });
        }
      })
    );

    // 5. 返回结果
    if (failedAccounts.length > 0) {
      return jsonMsg(res, 400, '部分账户添加失败', {
        errors: map(failedAccounts, 'account'), // 提取失败账户列表
        successes: successAccounts, // 成功的账户
      });
    }

    return jsonMsg(res, 200, '所有账户添加成功', { successes: successAccounts });
  } catch (err) {
    log.error('批量账户操作失败:', err);
    return jsonMsg(res, 500, '服务器内部错误');
  }
});


router.get('/update', async (req, res) => {
  const { account, password } = req.query;
  const _r = await get123UserToken(account, password);
  return jsonMsg(res, 200, '账户添加成功', _r);
});

// 删除账户

router.post('/delete', async (req, res) => {
  const { accountList, user } = req.body;
  // 记录尝试操作的日志
  log.info(`用户 ${user || 'unknown'} 尝试删除账户，数量: ${accountList.length}`);
  try {
    // 批量删除账户
    await P123Account.destroy({ where: { account: accountList.map((item) => item.account) } });

    // 记录成功的日志
    log.info(`用户 ${user.username} 成功删除 ${accountList.length} 个账户`);
    return jsonMsg(res, 200, '账户删除成功');
  } catch (error) {
    // 记录错误日志（包括错误原因）
    log.error(`用户 ${user.username} 删除账户失败: ${error.stack}`);
    // 返回更加详细的错误信息
    return jsonMsg(res, 500, '服务器内部错误，账户删除失败');
  }
});


router.get('/list', async (req, res) => {
  const accounts = await P123Account.findAll();
  return jsonMsg(res, 200, '账户列表获取成功', accounts);
});

router.get('/gen_file', async (req, res) => {
  const accounts = await P123Account.findAll();
  const queen = new TaskQueen({
    qpsLimit:3,
    tasks: [],
  });
  forEach(accounts, async (item) => {
    traverseNode('0',1,item.cookie);
    // processDownloadTasks();
  });
  return jsonMsg(res, 200, '任务添加成功');
});

router.get('/logs',async (req,res)=>{
 // SSE输出../logs/combined.log日志
 res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
 res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const logFilePath = path.join(process.cwd(), 'logs', 'combined.log');
  const initialFileSize = fs.statSync(logFilePath).size;
  const logStream = fs.createReadStream(logFilePath, { encoding: 'utf8' }); 
  // 监听日志文件变化
  logStream.on('data', (chunk) => {
    res.write(`data: ${chunk.toString()}\n\n`);
  });
    // 监听文件的变更
  const watcher = fs.watch(logFilePath, (eventType) => {
    if (eventType === 'change') {
      // 当文件发生变更时读取新增的内容
      const readNewLogs = readline.createInterface({
        input: fs.createReadStream(logFilePath, { encoding: 'utf8', start: fs.statSync(logFilePath).size }),
      });

      readNewLogs.on('line', (line) => {
        res.write(`data: ${line}\n\n`); // 将新增的每一行日志发送
      });

      readNewLogs.on('close', () => {
        readNewLogs.close();
      });
    }
  });
  req.on('close', () => {
    console.log('Client disconnected, stopping log stream...');
    logStream.close(); // 停止文件读取流
    watcher.close();   // 停止文件监听
    res.end();         // 终止 SSE 响应
  });
})
export default router;
