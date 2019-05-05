/**
 * 版本一
 * https://github.com/zsea/redisq
 *
 * 介绍:
 * 用Redis实现的支持事物的消息队列
 *
 * 背景:
 * 在用Redis的list做队列的时候，存在消息丢失的问题，该项目解决消息的稳定性
 * */
const {log} = console;
const redis = require('redis'); // 没有从/model/redis.js下获取，后续改进
const log4js = require('log4js');
const idCreate = require('./id');
const path = require('path');
const ecDoPath = path.resolve(process.cwd(), '../../', 'ec-do/src/', 'ec-do-2.0.0');
const ecDo = require(ecDoPath);
const clientPayPath = path.resolve(process.cwd(), '/redis');
const {clientPay} = require(clientPayPath);

/**
 * 核心
 * @param connection 已连接的redis对象
 * @param queue 队列名称
 * @param delay 是否是延迟队列，延迟队列的消息会开启一个延迟消息扫描线程，默认开启
 * @returns
 * @constructor
 */
function RedisQ({connection, queue, isDelay = true}) {
    // if (isDelay !== false) isDelay = true
    let redis = connection;
    if (ecDo.istype(connection, 'undefined')) {
        throw new ReferenceError('缺少参数connection')
    }

    if (ecDo.istype(queue, 'undefined')) {
        throw new ReferenceError('缺少参数queue')
    }

    const author = idCreate();
    const isMaster = false; // ???
    const online = false; // ???

    const logger = log4js.getLogger('RedisQ:' + queue);
    // logger.level = 'error'
    logger.level = 'debug';
    this.setLog = function (level) { // ??? 单独写一个方法
        logger.level = level
    };

    logger.debug('实例id', author);
    const commands = null; // ???
    /*
    * 启动错误扫描线程
    * */
    (async function () {
        // ...
    })()

    /*
    * 启动延迟消息扫描
    * */
    (async function () {
        if (!isDelay) return;
        while (true) {
            if (isMaster) { // isMaster到底是干什么的???
                logger.trace('开始扫描延迟消息');
                await delay_start(redis, queue, logger);
                await sleep(1000)
            } else {
                await sleep(10000)
            }
        }
    })();

    /**
     * 写入消息
     * @param msg 消息内容，可以是JS对象
     * @param _queue 加入的队列/若为空，取实例的queue
     * @param delay 消息延迟多长时间才执行(s)
     */
    this.push = function (msg, _queue, delay) {
        // 以下代码是在出现下面情况时用到
        // 调用者只传了2个参数(msg,delay)
        // 所以，要对queue做一些处理
        // 其实可以使用解构赋值来解决就好啦
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

/**
 * 扫描到延迟消息
 * @param redis
 * @param queue
 * @param logger
 * @returns {Promise<void>}
 */
async function delay_start(redis, queue, logger) {

}

new RedisQ({
    connection: clientPay,
    queue: 'test',
    isDelay: true
});

module.exports = RedisQ;