const Promise = require("underscore");
const fxqueue = require('./index');
const Job = require('./job');
const Xqueue = require('./xqueue');
const queue = fxqueue.createQueue({
    options: {
        name: 'xqueue',
        prefix: 'q'
    },
    redisConfig: {
        port: 6379,
        host: 'localhost',
        auth: 'foobared',
        db: 4
    }
});

// let job = new Job()

/*
* 修改job.js.constructor()
* 其中this.redis = queue.redis不合理
* 因为在job.js.getJob()中有let job = new Job()，
* queue=null,queue.redis>>>会报错
* */
// class JobTest2 {
//   constructor(queue) {
//     this.redis = queue ? queue.redis : null
//   }
// }
//
// let job2_1 = new JobTest2()
// let job2_2 = new JobTest2({redis: 'redis123123123'})
// console.log(job2_1)
// console.log(job2_2)

/*
* 测试redis.blpop，移除并获取列表的第一个元素
* 结果: [member] [ 'q:email1:jobs', '1' ]
* */
function blpopTest() {
    let job = queue.createJob('email1', {name: 'zhangsan'});
    let client = job.redis.client;

    return new Promise((resolve, reject) => {
        client.blpop('q:email1:jobs', 0, (err, member) => {
            console.log('[err]', err);
            console.log('[member]', member); // [member] [ 'q:email1:jobs', '1' ]
            if (member) {
                resolve(member)
            }
        })
    })
}

// blpopTest()
//   .then(res => {
//     console.log('[blpopTest]', res)
//   })

function zpopTest() {
    let job = queue.createJob('email1', {name: 'zhangsan'});

    return new Promise((resolve, reject) => {
        let multi = job.redis.client.multi();
        multi
            .zrange('q:jobs:delayed', 0, 0)
            .zremrangebyrank('q:jobs:delayed', 0, 0)
            .exec((err, data) => {
                console.log('[data]', data); // [data] [ [ '01|1' ], 1 ]
                // (err) ? reject(err) : resolve(data[0][0])
                if (err) {
                    reject(err)
                }
                resolve(data[0][0])
            })
    })
}

// zpopTest()
//   .then(res => {
//     console.log('[zpopTest]', res) // 01|1
//   })

/*
* 测试Promise.resolve(new Error('fxqueue will shutdown'))
* */
async function start() {
    let job = null;
    // case1
    // job = Promise.resolve(123)
    // case2clear
    // job = Promise.resolve(new Error('fxqueue will shutdown'))
    // case3
    job = Promise.reject(new Error('fxqueue will shutdown'));
    return job
    // case2和case3的区别是?
    // 1.case2: 表示将错误信息+错误位置，封装在Promise中，Promise以成功的形式出现
    // 2.case3: 表示将错误信息+错误位置，以失败的形式出现，表示需要catch()来捕获错误
}

// console.log('[start()]', start()) // Promise{错误信息+错误位置}
// start()
//   .then(res => {
//     console.log('[start() res]', res) // 错误信息+错误位置
//   })

class RedisFactoryTest {
    constructor(options = {}, redisConfig) {
        console.log('[options]', options.prefix, options.separator);
        console.log('[redisConfig]', redisConfig);
        this.redisConfig = {
            socket: redisConfig.socket || null,
            port: redisConfig.port || 6379,
            host: redisConfig.host || 'localhost',
            auth: redisConfig.auth || null,
            password: redisConfig.password || {},
            db: (+redisConfig.db | 0 || 0) || 4, // 当传入db === '123x'时，会启用默认值4
            options: {
                password: redisConfig.auth,
            } || {},
            prefix: options.prefix || 'q', // 当options={}时，options.prefix === undefined
            separator: options.separator || ':',
            testPassword: {
                password1: options.prefix,
            }
        };

        this.shutDown = false // xqueue.js.shutdown()>>>true>>>表示正在停止任务队列
        // this._client = this.createClient()
    }
}

let redisF = new RedisFactoryTest({
    // prefix: 'q',
    name: 'xqueue'
}, {
    port: 6379,
    host: 'localhost',
    auth: 'foobared',
    db: 4
});

// console.log('[redisF]', redisF)

function getKeyTest(key, separatorEnd) {
    console.log('[getKeyTest]', arguments.length, arguments, key, separatorEnd)
}

getKeyTest();
getKeyTest(1);
getKeyTest(1, 2);
getKeyTest(1, 2, 3);