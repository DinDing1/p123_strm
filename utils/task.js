import logger from "./logger.js";
import redis from "../redis.js";
export class TaskQueen {
  constructor({ qpsLimit = 1 } = {}) {
    this.tasks = []; // 任务列表
    this.qpsLimit = qpsLimit; // 最大同时运行任务数
    this.runTimeIndex = 0; // 当前正在执行任务数
    this.pause = false; // 是否暂停任务队列
    this.done = false; // 队列是否已经完成（任务全部完成）
    this.onCompleteCallback = null; // 完成队列后的回调
  }

  /**
   * 添加任务到队列
   * @param {Function} taskFn - 异步任务函数 (需返回一个 Promise)
   * @param {Object} [options] - 可选任务参数
   * @param {Number} [options.retryCount=3] - 最大重试次数
   * @param {Number} [options.retryDelay=1000] - 每次重试的延迟时间 (毫秒)
   */
  addTask(taskFn, { retryCount = 3, retryDelay = 1000 } = {}) {
    if (this.done) {
      throw new Error("队列已经被标记为完成，无法再添加新任务！");
    }

    const wrappedTask = this.createRetriableTask(taskFn, retryCount, retryDelay); // 封装任务为可重试
    this.tasks.push(wrappedTask);
    this.exec();
  }

  /**
   * 创建一个支持重试的任务
   * @param {Function} taskFn - 异步任务函数
   * @param {Number} retryCount - 最大重试次数
   * @param {Number} retryDelay - 重试延迟时间 (毫秒)
   * @returns {Function} 包装后的任务函数
   */
  createRetriableTask(taskFn, retryCount, retryDelay) {
    return () => {
      return new Promise((resolve, reject) => {
        const attempt = (retries) => {
          taskFn()
            .then(resolve) // 如果成功，直接 resolve
            .catch(async (err) => {
              if (retries > 0) {
                console.warn(`任务执行出错，将重试 ${retries} 次后再试 (延迟 ${retryDelay}ms):`, err);
                logger.error(`任务执行出错，将重试 ${retries} 次后再试 (延迟 ${retryDelay}ms):`, err);
                await redis.del('proxy_ip');
                return setTimeout(() => attempt(retries - 1), retryDelay); // 递归重试
              }
              console.error("任务重试达到上限，失败:", err);
              reject(err); // 如果重试次数用完，最终 reject
            });
        };

        attempt(retryCount); // 开始第一次尝试
      });
    };
  }

  /**
   * 执行队列中的任务
   */
  exec() {
    if (this.runTimeIndex >= this.qpsLimit || this.pause || !this.tasks.length) {
      // 当没有正在运行的任务，并且任务队列为空时，认为队列已完成。
      if (this.runTimeIndex === 0 && this.tasks.length === 0) {
        this.done = true; // 标记任务队列已完成
        if (this.onCompleteCallback) {
          this.onCompleteCallback(); // 触发完成回调
        }
        console.log("任务队列已完成！");
      }
      return;
    }

    const taskFn = this.tasks.shift(); // 从任务列表中取出一个任务
    this.runTimeIndex += 1;

    taskFn()
      .catch((err) => logger.error('任务彻底失败 ======>', err)) // 任务超出重试次数依然失败时
      .finally(() => {
        this.runTimeIndex -= 1; // 任务完成后，减少并发计数
        this.exec(); // 执行下一个任务
      });

    // 保证多个任务并发
    if (this.runTimeIndex < this.qpsLimit) {
      this.exec();
    }
  }

  /**
   * 暂停任务队列
   */
  pauseQueue() {
    this.pause = true;
    console.log("队列已暂停");
  }

  /**
   * 恢复任务队列
   */
  resumeQueue() {
    if (!this.pause) return;
    this.pause = false;
    console.log("队列已恢复");
    this.exec();
  }

  /**
   * 设置一个回调函数，当任务全部完成时触发
   * @param {Function} callback - 完成回调函数
   */
  onComplete(callback) {
    if (typeof callback !== 'function') {
      throw new Error("onComplete 的参数必须是一个函数！");
    }
    this.onCompleteCallback = callback;
  }

  /**
   * 判断任务队列是否已经完成
   * @returns {Boolean} 是否已完成
   */
  isDone() {
    return this.done;
  }
}

// 示例使用这个类
export const taskQueen = new TaskQueen({
  qpsLimit: 1,
});
