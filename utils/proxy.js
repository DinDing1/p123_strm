import request from "./123Request.js";
import log from '../utils/logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import P123Account from "../models/123PanAccount.js";
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
    
    // 增强响应处理
    if (!response.data) {
      log.error(`Empty response from ${apiUrl}`);
      return null;
    }

    const rawData = response.data.toString().trim();
    log.debug(`Proxy API raw response: ${rawData}`);

    // 支持多种分隔符
    const proxyCandidates = rawData.split(/<br>|\n|,/).filter(Boolean);
    
    // 验证代理格式
    const validProxy = proxyCandidates.find(proxy => 
      /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(proxy)
    );

    return validProxy || null;
  } catch (error) {
    log.error(`Proxy API request failed [${apiUrl}]:`, error.message);
    return null;
  }
};

/**
 * 获取代理Agent
 * @returns {Promise<HttpsProxyAgent|undefined>} 代理Agent实例
 */
export const getProxyAgent = async () => {
  try {
    // 合并代理源：固定API + Redis缓存API（带权重）
    const apiSources = [
      ...proxyAPIs,
      ...(await redis.get('proxy_ip')) ? times(10, () => redis.get('proxy_ip')) : []
    ].filter(Boolean);

    if (apiSources.length === 0) {
      log.warn('No proxy sources available');
      return undefined;
    }

    // 打乱顺序并去重
    const shuffledAPIs = shuffle([...new Set(apiSources)]);

    // 尝试所有API源
    for (const apiUrl of shuffledAPIs) {
      const proxyLine = await fetchProxyFromAPI(apiUrl);
      if (proxyLine) {
        const proxyUrl = `http://${proxyLine}`;
        log.info(`Using proxy: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
      }
    }
  } catch (error) {
    log.error('Proxy selection failed:', error.message);
  }

  log.warn('All proxy sources failed, using direct connection');
  return undefined;  // 重要修改：返回undefined而不是空Agent
};

/**
 * 获取用户信息
 * @param {string} cookie - 用户认证cookie
 * @returns {Promise<Object>} 用户信息
 */
export const getUserInfo = async (cookie) => {
  try {
    const agent = await getProxyAgent();
    const requestOptions = {
      headers: { 'Authorization': `Bearer ${cookie}` }
    };
    
    if (agent) {
      requestOptions.httpsAgent = agent;
    }

    const info = await request.get('https://www.123pan.com/api/user/info', requestOptions);
    return info;
  } catch (e) {
    log.error('Failed to get user info:', e.message);
    throw e;
  }
};

/**
 * 验证Cookie有效性
 * @param {string} cookie - 用户认证cookie
 * @returns {Promise<boolean>} 是否有效
 */
export const validateCookie = async (cookie) => {
  try {
    const res = await getUserInfo(cookie);
    return res.code !== 401;
  } catch (e) {
    log.error('Cookie validation failed:', e.message);
    return false;
  }
};

/**
 * 获取随机账户Cookie
 * @returns {Promise<string|null>} 随机账户的cookie
 */
export const getRandomCookie = async () => {
  try {
    const account = await P123Account.findOne({
      order: P123Account.sequelize.random(),
    });
    return account?.cookie || null;
  } catch (error) {
    log.error('Failed to get random cookie:', error.message);
    return null;
  }
};

// 导出所有功能
export default {
  getProxyAgent,
  getUserInfo,
  validateCookie,
  getRandomCookie
};
