import axios from 'axios';
import { getProxyAgent } from './proxy.js';
import log from '../utils/logger.js';

const request = new axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'App-Version': '3',
    'platform': 'web',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Referer': `https://www.123pan.com/`,
  },
})

// 请求拦截器
request.interceptors.request.use((config) => {
  // 添加代理
  config.httpsAgent = getProxyAgent();
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 响应拦截器
request.interceptors.response.use((response) => {
  if (response.status === 200) {
    const {
      code,data,message
    } = response.data;
    if(code === 401) {
      // token 失效
      log.error('token 失效');
      return Promise.reject(response);
    } else if(code === 403) {
      // 无权限
      log.error('当前ip被封禁');
      return Promise.reject(response);
    } else if(code === 0) {
      return data
    } else {
      log.error(message);
      return Promise.reject(response);
    }
  }
  return Promise.reject(response);
}, (error) => {
  return Promise.reject(error);
});

export default request;




export function genFileHeader(cookie,parentFileId) {
  return {
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'App-Version': '3',
      'Authorization': `Bearer ${cookie}`,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'LoginUuid': 'f5cec74112e20c98d0cb459cd3151a7cb4f2a12c108679c328cadf181ef712ed',
      'Pragma': 'no-cache',
      'Referer': `https://www.123pan.com/?homeFilePath=${parentFileId}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/',
  }
}
