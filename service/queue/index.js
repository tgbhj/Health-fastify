/*
* zadd 有序队列
* ZADD KEY_NAME SCORE1 VALUE1.. SCOREN VALUEN
* zadd 集合名 score value
* zrem 集合名 value
* */
// /home/dcj/20180201/project/vue-webpack-config/server/model/redis.js
const {log} = console;
const path = require('path');
const redisPayPath = path.resolve(process.cwd(), '/redis');
const {clientPay} = require(redisPayPath);

// setInterval(callback, delay[, ...args])
/*
* redis定时消息队列
* */
async function timeMsgQueue() {
    const startTime = new Date().getTime();
    setInterval(function () {
        const endTime = new Date().getTime();
        log('[time]', endTime - startTime);
        const p = new Promise((resolve, reject) => {
            clientPay.send_command('zrangebyscore', ['seta', '0', (endTime - startTime)], function (_err, value) {
                // log(value)
                if (_err) reject(_err);
                resolve(value)
            })
        });

        p.then(res => {
            log('[p]', res)
        }).catch(err => {
            log(err)
        })
    }, 1000)

    /*
    * 查看seta集合中的所有内容
    * */
    // clientPay.send_command('zrange', ['seta', '0', '-1', 'withscores'], function (err, value) {
    //   log(err)
    //   log(value)
    // })

    /*
    * 查看0~200毫秒内的数据
    * */
    // clientPay.send_command('zrangebyscore', ['seta', '0', '200', 'withscores', 'limit', '0', '1'], function (err, value) {
    //   log(err)
    //   log(value)
    // })
}

timeMsgQueue();