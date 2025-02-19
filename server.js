import 'dotenv/config'; // 加载 .env 文件内容到 process.env
import express from 'express';
import bodyParser from 'body-parser';
import './database.js'; // 路径需要显式地带上 .js
import AuthRoute from "./routes/auth.js"
import Pan123Route from "./routes/123pan.js"
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import redis from './redis.js';
import { getDownloadUrl } from './utils/fileDownTask.js';
import cors from 'cors';


// 自定义 CORS 配置
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // 允许无来源的安全请求（如某些服务器间请求或开发中的 Postman）
      return callback(null, true);
    }

    // 检查是否匹配指定域名及子域名
    const allowedDomain = /\.?38d5\.cn$/; // 匹配 38d5.cn 和所有子域名 xxx.38d5.cn
    if (allowedDomain.test(new URL(origin).hostname)) {
      callback(null, true); // 允许跨域
    } else {
      callback(new Error('跨域请求未被允许')); // 拒绝跨域
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许的方法
  allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
  credentials: true, // 如果需要 Cookies 支持，可以设置为 true
};
const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, 'logs');
// 检查并创建 logs 目录
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Middleware
app.use(bodyParser.json());

// Routes
app.get('/', async (req, res) => {
  const {fileid} = req.query;
  const cache = await redis.get(`link:${fileid}`);
  if(cache){
    console.log('获取缓存成功：',cache);
    return res.redirect(cache);
  } else {
    const item = await redis.get(`file:${fileid}`);
    if(!item){
      return res.status(404).send('文件不存在');
    } else {
      const url = await getDownloadUrl(JSON.parse(item));
      console.log('获取直链成功：',url);
      await redis.set(`link:${fileid}`,url,'EX',60*60*24);
      res.redirect(url)
    }
  }
});

app.use('/api/auth', AuthRoute);
app.use('/api/123pan', Pan123Route);
// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
