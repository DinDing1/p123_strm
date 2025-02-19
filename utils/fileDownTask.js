import File from "../models/File.js";
import request, { genFileHeader } from "./123Request.js";
import { getFilepathNameByFileId } from "./filePath.js";
import { getRandomCookie } from "./proxy.js";
import {existsSync, statSync} from "fs"
import log from "./logger.js"
import path from "path";
import DownLoadTask from "../models/downLoadTask.js";
import fs from "fs";
import axios from "axios";
import { Readable } from "stream";
import { promisify } from "util"; // 从 Node.js 核心模块 util 中引入 promisify
import { pipeline } from "stream"; // 从 Node.js 核心模块 stream 中引入 pipeline
const pipelineAsync = promisify(pipeline);

import fetch from "node-fetch";
import {parse} from "url";
import QueryString from "qs";
/**
 * 
 * @param {*} filePath 判断文件是否已经下载过
 * @returns 
 */
export async function fileIsDownload(fileItem) {
  const filePath = await getFilepathNameByFileId(fileItem.FileId);
  console.log('filePath',filePath);
  if(existsSync(filePath) && statSync(filePath).size > 0) {
    return true;
  }
  return false;
}

export async function getDownloadUrl(fileitem) {
  const url = 'https://www.123pan.com/api/file/download_info';
  const cookie = await getRandomCookie();
  const {Etag,FileId,FileName,S3KeyFlag} = fileitem;
  const info = await axios.post(url, {
    Etag,
    FileId,
    FileName,
    S3KeyFlag,
    Size:0,
    driveId:0,
  },{
    headers: {
      'Authorization': `Bearer ${cookie}`,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
    }
  })
  return await parserDownLoadUrl(info?.data?.data?.DownloadUrl)
}
const parserDownLoadUrl = async (url) => {
  const parserUrl = parse(url);
  const query = QueryString.parse(parserUrl.query);
  const params = query.params;
  const is_s3 = query.is_s3;
  // https://web-pro2.123952.com/download-v2/?params=aHR0cHM6Ly9kb3dubG9hZC1jZG4uY2pqZDE5LmNvbS8xMjMtNTUxL2YyYjY3N2MwLzE4MTg1NjM5OTAtMC9mMmI2NzdjMDA0NjIwNWJlZjg0OWYzYmExNGMxODYyNy9jLW03Mj92PTUmdD0xNzM5ODQ3NjU1JnM9MTczOTg0NzY1NTA0YzFmMzY3Y2ZmZTFjNzI4ZjBhODk5ZTQ1Yjg3Y2VlJnI9WkZWRkczJmJ6Yz0xJmJ6cz0xODE4NTYzOTkwJmZpbGVuYW1lPSVFNSVCRCU5MiVFNiVBMSVBMy56aXAmeC1tZi1iaXotY2lkPTkwNDdjMGQxLTc2MDEtNDc5Ny04ZTc3LTNhZGYzZTRkYWE5ZC1jNDkzN2MmYXV0b19yZWRpcmVjdD0wJmNhY2hlX3R5cGU9MQ==&is_s3=0
     // Base64 解码 params
  let decodedParams = '';
  try {
    decodedParams = Buffer.from(params, 'base64').toString('utf8');
    decodedParams = decodeURI(decodedParams); // URI 解码
  } catch (error) {
    return new Error('解析下载链接失败');
  }
  return decodedParams;
};
async function downloadFile(url, filePath) {
  const response = await fetch(url, { redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36", // 自定义 UA
    },
   }); // 确保跟随重定向

  if (!response.ok) {
    throw new Error(`HTTP 错误：${response.status}`);
  }
  // const nodeStream = Readable.fromWeb(response.body);
  await pipelineAsync(response.body, fs.createWriteStream(filePath));
  // 将响应流写入文件
}
export async function downfileRequest(filePath,downloadUrl) {
  await downloadFile(downloadUrl, filePath);
}

async function downloadByFileId(FileId) {
  const fileItem = await File.findOne({
    FileId
  });
  if (!fileItem) {
    log.error(`文件不存在: ${FileId}`);
    return;
  }
  const downloadUrl = await getDownloadUrl(fileItem);
  console.log('downloadUrl',downloadUrl);
  const filePath = path.join(process.cwd(), 'media', fileItem.FileName);
  await downfileRequest(filePath, downloadUrl);
}

 export async function addDownloadTask(fileId) {
  await DownLoadTask.create({
    FileId: fileId,
    type: 'metadata'
  })
  log.info(`下载元数据任务添加成功: ${fileId}`);
 }

 /**
  * 开始执行元数据下载任务
  */
 export async function processDownloadTasks() {
  while(true) {
    // 从数据库获取3个未完成的任务
    const tasks = await DownLoadTask.findAll({
      limit: 3,
      raw: true,
      where: {
        type: 'metadata'
      }
    });

    if(tasks.length === 0) {
      log.info('所有下载任务已完成');
      break;
    }

    try {
      // 并行下载这3个任务
      await Promise.all(tasks.map(async (task) => {
        try {
          console.log('task FileId',task.FileId);
          await downloadByFileId(task.FileId);
          // 下载完成后删除任务
          await DownLoadTask.destroy({
            where: {
              id: task.id
            }
          });
          log.info(`文件 ${task.FileId} 下载完成并从任务队列中移除`);
        } catch(err) {
          log.error(`文件 ${task.FileId} 下载失败: ${err.message}`);
        }
      }));
    // 休眠1秒后继续执行下一批任务
    await new Promise(resolve => setTimeout(resolve, 1000));
    } catch(err) {
      log.error('批量下载任务执行失败:', err);
    }
  }
}


/**
 * 执行strm任务
 */

function createStream(fileid) {
  const fileItem = File.findOne({
    FileId: fileid
  });
  if (!fileItem) {
    log.error(`文件不存在: ${fileid}`);
    return;
  }
  const filePath = path.join(process.cwd(), 'media', fileItem.FileName);
  // 替换后缀名为strm
  const strmPath = filePath.replace(/\.\w+$/, '.strm');
  
  //  写入文件内容 http://localhost:3000/api/file/stream?fileid=123
  fs.writeFileSync(strmPath, `http://localhost:3000/api/file/stream?fileid=${fileid}`);
  log.info(`创建strm文件成功: ${fileid}`);
}

/**
 * 创建strm任务
 */

export async function createStreamTask(fileId) {
    await DownLoadTask.create({
      FileId: fileId,
      type: 'stream'
    });
    log.info(`创建流任务成功: ${fileId}`);
}

/**
 * 执行strm任务
 */

export async function processStreamTasks() {
  while(true) {
    // 从数据库获取3个未完成的任务
    const tasks = await DownLoadTask.findAll({
      limit: 3,
      raw: true,
      where: {
        type: 'stream'
      }
    });

    if(tasks.length === 0) {
      log.info('所有流任务已完成');
      break;
    }

    try {
      // 并行下载这3个任务
      await Promise.all(tasks.map(async (task) => {
        try {
          await createStream(task.FileId);
          // 下载完成后删除任务
          await DownLoadTask.destroy({
            where: {
              id: task.id
            }
          });
          log.info(`文件 ${task.FileId} 创建strm文件完成并从任务队列中移除`);
        } catch(err) {
          log.error(`文件 ${task.FileId} 创建strm文件失败: ${err.message}`);
        }
      }));
    } catch(err) {
      log.error('批量创建strm任务执行失败:', err);
    }
  }
}
