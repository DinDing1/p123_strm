import request from "./123Request.js";
import log from '../utils/logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import P123Account from "../models/123PanAccount.js";
import { randomInt } from "crypto"; // 加密模块，用于生成随机数
import { forEach, sample, times } from "lodash-es";
import redis from "../redis.js";

// 固定代理池子
const proxyDB = []

  /**
 * 获取代理 agent，避免重复使用同一代理。 
 * 固定代理池和动态代理池子混用。
 * @returns {HttpsProxyAgent}
 */
      const res = await axios.get('xxx')(
      const proxy_ip = res.data;
      return new HttpsProxyAgent(proxy_ip);

export const getUserInfo = async (cookie) => {
  try {
    const info =  await request.get('https://www.123pan.com/api/user/info',{
      headers: {
        'Authorization': `Bearer ${cookie}`
      }
    })
    return info
  } catch (e) {
    log.error(e);
    return e;
  }
}

/**
 * 验证token是否有效
 */
export const validateCookie = async (cookie) => {
  return new Promise((resolve, reject) => {
    getUserInfo(cookie).then((res) => {
      if (res.code === 401) {
        resolve(false);
      } else {
        resolve(true);
      }
    }).catch((e) => {
      reject(e);
    });
  });
}


/**
 * 获取随机一个account的token
 */
export const getRandomCookie = async () => {
  const account = await P123Account.findOne({
    order: P123Account.sequelize.random(),
  });
  return account ? account.cookie : null;
}

