import request from "./123Request.js";
import log from '../utils/logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import P123Account from "../models/123PanAccount.js";
import { randomInt } from "crypto"; // 加密模块，用于生成随机数
import { forEach, sample, times } from "lodash-es";
import redis from "../redis.js";

// 固定代理池子
const proxyDB = ["http://47.106.242.254:20209/getapi2?linePoolIndex=-1&packid=2&time=5&qty=1&port=1&format=html&sep=%3Cbr%3E&ct=1&usertype=18&uid=45645&accessName=dinding2&accessPassword=86FBF7EB7B17A101FE7084478487C5AE&skey=autoaddwhiteip"]

  /**
 * 获取代理 agent，避免重复使用同一代理。 
 * 固定代理池和动态代理池子混用。
 * @returns {HttpsProxyAgent}
 */
export const getProxyAgent = async () => {
    // 在proxyDB和redis中随机选择一个代理
    const oldProxy =await redis.get('proxy_ip')
    if(oldProxy){
      const newDb = [...proxyDB];
     forEach(10,()=>{
        newDb.push(oldProxy);
     })
    //  打乱数组
      newDb.sort(() => Math.random() - 0.5);
      // 获取随机一个url
      const randomIndex = randomInt(0, newDb.length - 1);
      return new HttpsProxyAgent(newDb[randomIndex]);
    } else  {
      const proxyUrl = '';
      return new HttpsProxyAgent(proxyUrl);
    }
    
};

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

