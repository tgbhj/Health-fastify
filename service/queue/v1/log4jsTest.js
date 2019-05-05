/*
* log4js 日志功能测试
* level为记录日志的等级
* debug > info > warn > error > fatal
* level = debug记录:
*   logger.debug(...)
*   logger.info(...)
*   logger.warn(...)
*   logger.error(...)
*   logger.fatal(...)
*
* level = info:
*   logger.info(...)
*   logger.warn(...)
*   logger.error(...)
*   logger.fatal(...)
*
* level = warn记录:
*   logger.warn(...)
*   logger.error(...)
*   logger.fatal(...)
*
* level = error:
*   logger.error(...)
*   logger.fatal(...)
*
* level = fatal记录:
*   logger.fatal(...)
*
* 对log4js进行了大概的了解
* */

const log4js = require('log4js');
const logger = log4js.getLogger('自定义内容');
logger.level = 'debug';
logger.debug('Some debug message');

// 成功
// log4js.configure({
//   appenders: {cheese: {type: 'file', filename: 'cheese.log'}},
//   categories: {default: {appenders: ['cheese'], level: 'error'}}
// });
//
// const logger = log4js.getLogger('cheese');
// logger.trace('Entering cheese testing');
// logger.debug('Got cheese.');
// logger.info('Cheese is Gouda.');
// logger.warn('Cheese is quite smelly.');
// logger.error('Cheese is too ripe!');
// logger.fatal('Cheese was breeding ground for listeria.');

// log4js.configure({
//   appenders: {
//     out: {type: 'stdout'},
//     app: {type: 'file', filename: 'application.log'}
//   },
//   categories: {
//     default: {appenders: ['out', 'app'], level: 'debug'}
//   }
// })
// const logger = log4js.getLogger()
// logger.trace('Entering cheese testing');
// logger.debug('Got cheese.');
// logger.info('Cheese is Gouda.');
// logger.warn('Cheese is quite smelly.');
// logger.error('Cheese is too ripe!');
// logger.fatal('Cheese was breeding ground for listeria.');

// 失败 >>> 没看到效果
// log4js.configure({
//   appenders: {console: {type: 'console'}},
//   categories: {default: {appenders: ['console'], level: 'info'}}
// })
//
// const logger = log4js.getLogger()
// logger.info('123')
// console.error.log('123')
// logger.info('456')
// logger.info('789')

// 成功 >>> 记录在日志中
// log4js.configure({
//   appenders: {
//     everything: {type: 'fileSync', filename: 'all-the-logs.log'}
//   },
//   categories: {
//     default: {appenders: ['everything'], level: 'debug'}
//   }
// })
//
// const logger = log4js.getLogger();
// logger.debug('I will be logged in all-the-logs.log123')
// logger.warn('warn message')

// 成功 >>> 记录在日志中
// log4js.configure({
//   appenders: {
//     everything: {type: 'file', filename: 'all-the-logs.log', maxLogSize: 10458760, backups: 3}
//   },
//   categories: {
//     default: {appenders: ['everything'], level: 'debug'}
//   }
// })
//
// const logger = log4js.getLogger()
// logger.trace('Enter cheesev testing')
// logger.debug('Got cheese.')
// logger.info('Cheese is Gouda.')
// logger.warn('Cheese is quite smelly.')
// logger.error('Cheese is too ripe!')
// logger.fatal('Cheese was breeding ground for listeria')