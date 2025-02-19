import qs from 'qs';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { random } from 'lodash-es';
import log from '../utils/logger.js';
import File from '../models/File.js';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { fileURLToPath } from 'url';

export const get123UserToken = async (username, password) => {
  const response = await fetch('https://login.123pan.com/api/user/sign_in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Version': '3',
      'platform': 'web',
    },
    body: JSON.stringify({"passport":username,"password":password,"remember":true}),
  });
  const data = await response.json();
  return data;
};



export const requestFileInfo = async (cookie,parentFileId,Page) => {
  const q = {
    driveId:0,
    limit:100,
    next:0,
    orderBy:"file_id",
    orderDirection:"desc",
    parentFileId:parentFileId,
    trashed:false,
    Page:Page,
    OnlyLookAbnormalFile:0,
    inDirectSpace:false,
    event:'homeListFile',
    // 随机获取1或者4
    operateType: random(0,1) === 0 ? 1 : 4,
  };
  const response = await axios.get('https://www.123pan.com/b/api/file/list/new?'+qs.stringify(q), {
    httpAgent: proxyAgent(),
    httpsAgent: proxyAgent(),
    headers: {
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
    },
  })
  return response.data;
};



