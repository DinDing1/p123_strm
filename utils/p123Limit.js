import pLimit from "p-limit";
import { genFileHeader } from "./123Request.js";
import { random } from 'lodash-es';
import axios from "axios";
import { getProxyAgent } from "./proxy.js";
import log from '../utils/logger.js';
import { downfileRequest, getDownloadUrl } from "./fileDownTask.js";
import fs from "fs";
import path from 'path';
import EventEmitter from "events"
import {existsSync,mkdirSync} from "fs"
import { taskQueen } from "./task.js";
import redis, { syncDb } from "../redis.js";

export const requestFileInfo = async (cookie,parentFileId,Page) => {
  return new Promise(async (resolve,reject)=>{
    const q = {
      driveId:0,
      limit:999,
      next:0,
      orderDirection:"desc",
      orderBy:'update_time',
      parentFileId:parentFileId,
      SearchData:'',
      trashed:false,
      Page:Page,
      OnlyLookAbnormalFile:0,
      inDirectSpace:false,
      event:'homeListFile',
      operateType: random(0,1) === 0 ? 1 : 4,
    };
    axios({
      url:'https://www.123pan.com/b/api/file/list/new',
      method:'get',
      params:q,
      headers: genFileHeader(cookie,parentFileId),
      httpAgent:await getProxyAgent(),
      httpsAgent:await getProxyAgent(),
    }).then((r)=>{
      resolve(r?.data?.data);
    }).catch((e)=>{
      reject(e);
    });
  });
};

const root_dir = path.join(process.cwd(),'media');

const createLocalDir = (filePath) => {
  const fullPath = path.join(root_dir,filePath);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath);
  }
}
// 配置
const QPS_LIMIT = 100; // 限制每秒 3 个请求
const SQLITE_WRITE_LIMIT = 2; // 限制 SQLite 每次只允许 1 个并发写入

// 初始化限速器
const requestLimit = pLimit(QPS_LIMIT); // 用于限制接口调用频率
const sqliteLimit = pLimit(SQLITE_WRITE_LIMIT); // 用于限制数据库写入并发

const taskEvents = new EventEmitter(); // 创建事件处理器
let remainingTasks = 0;
taskEvents.on('taskCompleted', () => {
  remainingTasks--;
  log.info(`任务完成，剩余任务数: ${remainingTasks}`);
  if (remainingTasks === 0) {
    log.info('所有任务已完成！');
  }
});
// 遍历 JSON 节点，并且递归处理其子节点
taskQueen.onComplete(()=>{
  syncDb();

  setTimeout(()=>{
    taskQueen.done = false; // 队列是否已经完成（任务全部完成）
    taskQueen.onCompleteCallback = null; // 完成队列后的回调
  },1000);
})
export async function traverseNode(level=0,page,cookie,parent_dir='') {
  taskQueen.addTask(async ()=>{
     // 读取节点数据
  const node = await requestFileInfo(cookie, level, page);
  const pipe = redis.pipeline();
  if(!node?.InfoList) {
    throw new Error(`节点${parent_dir}获取失败！！！`);
  }
  const {InfoList,Next} = node;
  // 处理节点数据
  for (const file of InfoList) {
    const {Type,Hidden,FileId,FileName} = file;
    // 如果是隐藏文件直接跳过
    if(Hidden || ['@Recycle','@eaDir'].includes(FileName)) {
      log.info(`跳过隐藏文件: ${FileName}`);
      continue;
    }
    if(Type === 1) {
      // 这是目录需要创建本地目录，并写入数据库
      const localPath = path.join(root_dir,parent_dir,FileName);
      log.info(`创建目录: ${FileName}`);
      createLocalDir(`${parent_dir}/${FileName}`);
      traverseNode(FileId,1,cookie,`${parent_dir}/${FileName}`);
      pipe.set(`file:${FileId}`,JSON.stringify({
        ...file,
        localPath,
      }));
    } else {
      // 处理文件
      //  如果是图片、字幕、nfo等元数据文件，addDownloadTask，并写入数据库
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(FileName);
      const isSubtitle = /\.(srt|ass|ssa|vtt)$/i.test(FileName);
      const isNfo = /\.nfo$/i.test(FileName); 
      const isVideo = /\.(mp4|mkv|avi|mov|flv|wmv|rmvb|webm|iso|ts|m2ts)$/i.test(FileName);
      if(isVideo) {
        const filePath = path.join(root_dir,parent_dir,FileName);
        const fullPath = filePath.replace(/\.\w+$/, '.strm');
        pipe.set(`file:${FileId}`,JSON.stringify({
          ...file,
          localPath:fullPath,
        }));
        if(!existsSync(fullPath)) {
          log.info(`创建strm文件: ${fullPath}`);
          fs.writeFileSync(fullPath, `${process.env.BASE_STRM_URL?process.env.BASE_STRM_URL:'http://localhost:3000'}?fileid=${FileId}&fileName=${FileName}`);
        }
      } else if(isImage||isSubtitle||isNfo) {
        const filePath = path.join(root_dir,parent_dir,FileName);
        pipe.set(`file:${FileId}`,JSON.stringify({
          ...file,
          localPath:filePath,
        }));
        if(!existsSync(filePath)) {
          // 下载文件
          const dUrl = await getDownloadUrl(file);
          log.info(`下载文件: ${FileName} url: ${dUrl}`);
          await downfileRequest(filePath,dUrl);
        }
      }
      await pipe.exec();
      // if(isImage || isSubtitle || isNfo || isVideo) {
      //   await sqliteLimit(() => File.findOrCreate({
      //     where: {
      //       FileId: FileId,
      //     },
      //     defaults: {
      //       ...file,
      //     },
      //   }));
      //   const filePath = path.join(root_dir,parent_dir,FileName);
      //   if (isImage || isSubtitle || isNfo) {
      //     // @TODO 元数据下载 

      //     // if(!existsSync(filePath)) {
      //     //   // 下载文件
      //     //   const dUrl = await requestLimit(() => getDownloadUrl(file));
      //     //   log.info(`下载文件: ${FileName} url: ${dUrl}`);
      //     //   // await requestLimit(()=>downfileRequest(filePath,dUrl));
      //     // }
      //   } else if(isVideo) {
      //     const fullPath = filePath.replace(/\.\w+$/, '.strm');
      //     if(!existsSync(fullPath)) {
      //       log.info(`创建strm文件: ${fullPath}`);
      //       fs.writeFileSync(fullPath, `http://localhost:3000/api/file/stream?fileid=${FileId}`);
      //     }
      //   }
      // } else {
      //   continue;
      // }
    }
  }
  if(Next !== '-1') {
   await traverseNode(level,page+1,cookie,parent_dir);
  }
  taskQueen.isDone();
  });
}
