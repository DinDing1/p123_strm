import { forEach, map } from "lodash-es";
import File from "../models/File.js";

/**
 * 
 * @param {string} fileId  文件id
 * @returns 获取文件路径 id反查文件路径 0|1|3 => a/b/c
 */
export async function getFilepathNameByFileId(fileId) {
  const item = await File.findOne({where: {FileId: fileId}});
  const AbsPathHasEmpty = item.AbsPath.split('/');
  const AbsPath = AbsPathHasEmpty.filter(item => item !== '')
  const res = [];
  forEach(AbsPath,async (item) => {
    const categoryItem = await File.findOne({where: {FileId: item}});
    res.push(categoryItem);
  });
  return res.join('/');
}
