import log from './logger.js';
export const jsonMsg = (res, code, msg='',data=null) => {
  res.status(200).json({
    code: code,
    msg: msg,
    data: data
  })
  if(code != 200){
    log.error(`code: ${code}, msg: ${msg}`);
  } else {
    log.info(`code: ${code}, msg: ${msg}`);
  }
};
