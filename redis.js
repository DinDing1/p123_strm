import Redis from 'ioredis';
import log from './utils/logger.js';
import { existsSync, unlink, unlinkSync } from 'fs';
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('error', (err) => {
  log.error('Redis 连接错误:', err);
});

redis.on('connect', () => {
  log.info('Redis 连接成功');
});


async function scanDbKeys() {
  let keys = [];
  let cursor = '0';
  do {
    const res =  await redis.scan(cursor, 'MATCH', 'file:*', 'COUNT', '1000');
    cursor = res[0];
    keys = keys.concat(res[1]); // 添加本批次扫描的键
  } while (cursor !== '0');
  return keys;
}
export async function syncDb() {
  redis.select(0);
  const db0Keys = await scanDbKeys();
  redis.select(1);
  const db1Keys = await scanDbKeys();
  if(db1Keys.length === 0) {
    // 将 db0 复制到 db1
    for (const key of db0Keys) {
      await redis.select(0);
      const item = await redis.get(key);
      await redis.select(1);
      await redis.set(key, item);
    }
    return;
  }
  // 找出老数据库中多余的键（db1Keys 在 db0Keys 中不存在）
  const keysToDelete = db1Keys.filter(key => !db0Keys.includes(key));

  // 找出新数据库中新增的键（db0Keys 在 db1Keys 中不存在）
  const keysToAdd = db0Keys.filter(key => !db1Keys.includes(key));

  log.info('开始同步数据库...');
  log.info('需要删除的键:', keysToDelete);
  log.info('需要新增的键:', keysToAdd);
      // 删除老数据库中多余的键
  for (const key of keysToDelete) {
    await redis.select(1);
    const item = await redis.get(key);
    const localPath = JSON.parse(item).localPath;
    if(existsSync(localPath)) {
      unlinkSync(localPath);
    }
    await redis.del(key);
  }
  // 添加新数据库中新增的键
  for (const key of keysToAdd) {
    await redis.select(0);
    const item = await redis.get(key);
    await redis.select(1);
    await redis.set(key, item);
  }
}

export default redis;
