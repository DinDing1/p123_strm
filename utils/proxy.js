import request from "./123Request.js";
import log from '../utils/logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import P123Account from "../models/123PanAccount.js";
import { randomInt } from "crypto";
import { times, shuffle } from "lodash-es";
import redis from "../redis.js";

// 代理API列表（返回IP:Port的接口）
const proxyAPIs = [
  "http://47.106.242.254:20209/getapi2?linePoolIndex=-1&packid=2&time=5&qty=1&port=1&format=html&sep=%3Cbr%3E&ct=1&usertype=18&uid=45645&accessName=dinding2&accessPassword=86FBF7EB7B17A101FE7084478487C5AE&skey=autoaddwhiteip"
];

/**
 * 从代理API获取IP地址
 * @param {string} apiUrl - 代理API地址
 * @returns {Promise<string|null>} 返回IP:Port格式字符串
 */
const fetchProxyFromAPI = async (apiUrl) => {
  try {
    const response = await request.get(apiUrl, { timeout: 5000 });
    const proxyData = response.data?.trim();
    
    // 处理不同API响应格式
    if (!proxyData) {
      log.error(`Empty response from proxy API: ${apiUrl}`);
      return null;
    }

    // 尝试分割有效代理地址（假设使用<br>分隔）
    const proxies = proxyData.split('<br>').filter(Boolean);
    if (proxies.length === 0) {
      log.error(`No valid proxies found in API response: ${proxyData}`);
      return null;
    }

    // 验证第一个代理格式
    const firstProxy = proxies[0];
    if (/^(\d{1,3}\.){3}\d{1,3}:\d+$/.test(firstProxy)) {
      return firstProxy;
    }
    
    log.error(`Invalid proxy format: ${firstProxy}`);
    return null;
  } catch (error) {
    log.error(`Proxy API request failed [${apiUrl}]: ${error.message}`);
    return null;
  }
};

/**
 * 获取代理Agent
 * @returns {Promise<HttpsProxyAgent>} 代理Agent实例
 */
export const getProxyAgent = async () => {
  // 合并代理源：固定API + Redis缓存API（10倍权重）
  let apiSources = [...proxyAPIs];
  const redisAPI = await redis.get('proxy_ip');
  
  if (redisAPI) {
    apiSources.push(...times(10, () => redisAPI));
  }

  // 打乱顺序避免单点故障
  shuffle(apiSources);

  // 遍历所有API源尝试获取代理
  for (const apiUrl of apiSources) {
    try {
      const proxyLine = await fetchProxyFromAPI(apiUrl);
      if (proxyLine) {
        const proxyUrl = `http://${proxyLine}`;
        log.debug(`Selected proxy: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
      }
    } catch (error) {
      log.warn(`Proxy source failed [${apiUrl}]: ${error.message}`);
    }
  }

  // 所有源失败时降级直连
  log.warn('All proxy sources failed, using direct connection');
  return new HttpsProxyAgent('');
};

/**
 * 获取用户信息（保持原样）
 */
export const getUserInfo = async (cookie) => {
  try {
    const info = await request.get('https://www.123pan.com/api/user/info', {
      headers: { 'Authorization': `Bearer ${cookie}` }
    });
    return info;
  } catch (e) {
    log.error(e);
    return e;
  }
};

/**
 * 验证Cookie有效性（保持原样）
 */
export const validateCookie = async (cookie) => {
  try {
    const res = await getUserInfo(cookie);
    return res.code !== 401;
  } catch (e) {
    log.error(`Cookie validation failed: ${e.message}`);
    return false;
  }
};

/**
 * 获取随机账户Cookie（保持原样）
 */
export const getRandomCookie = async () => {
  const account = await P123Account.findOne({
    order: P123Account.sequelize.random(),
  });
  return account?.cookie || null;
};
