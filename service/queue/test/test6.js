/**
 *  队列任务
 * */

// const fxqueue = require('fxqueue')
// const queue = fxqueue.createQueue({
//   options: {
//     prefix: 'q',
//     name: 'xqueue'
//   },
//   redis: {
//     port: 6379,
//     host: 'localhost',
//     auth: '',
//     db: 3,
//     options: {}
//   }
// })
//
// let job1 = queue.createJob('email1', {name: 'zhangsan'}).delay(10).save()
// console.log(job1)
// job1.on('enqueue').then(data => {
//   console.log(data)
// })

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

// let job1 = queue.createJob('email1', {name: 'zhangsan'}).delay(100).save()
// console.log(job1)
// console.log(job1 instanceof Job)
// console.log(job1 instanceof Xqueue)
// job1.then(res => {
//   console.log('[res]', res)
//   res.on('delay', function (msg) {
//     console.log('[...]', msg)
//   })
// })
// job1.on('delay')
//   .then(res => {
//     console.log('[res]', res)
//   })

async function t6() {
    let job1 = await queue.createJob('email1', {name: 'zhangsan'}).delay(100).save();
    // console.log(job1)
    let promise = job1.on('delay');
    console.log('[t6_promise]', promise);
    promise.then(res => {
        console.log('[t6_promise.then]', res) // [t6_promise.then] [job.on()] 可行
    })
}

// t6()

/*
* 测试this._ttl的默认值
* */
class TestClass {
    constructor() {
        this._ttl = 0 || 5000
    }
}

// let testcls = new TestClass()
// console.log('[testCls._ttl]', testcls._ttl)

/*
* 测试if-else if
* 当满足if的时候，将不在执行else if语句
* */
function t6_if_else(p) {
    if (p > 2) {
        console.log('qob-1')
    } else if (p > 2) {
        console.log('qob-all-keys')
    }
}

// t6_if_else(3)

/*
* 测试if...if...return
* */
function t6_if_if_return(qJob) {
    console.log('[qJob]', qJob);
    if (qJob['qob-all-keys']) {
        if (qJob.is_observedAllKeys === true) {
            console.log('[*]');
            return
        }
        console.log('[event]')
    }
}

const qJob = {
    ['qob-all-keys']: true,
    is_observedAllKeys: true
};
// t6_if_if_return(qJob)

/*
* 测试同时监听2个任务时，接收promise时，会接收到什么?
* */
const EventEmitter = require('events');
const obList = new Map();

class Queue extends EventEmitter {
    constructor() {
        super()
    }

    observed(...obmsg) {
        obmsg.map(x => {
            obList.set(`qob-${x}`, this)
        });

        return this
    }

    on(event) {
        return new Promise((resolve, reject) => {
            super.on(event, function (obmsg) {
                resolve(obmsg)
            })
        })
    }
}

// const queueOn = new Queue()
// const ob = queueOn.observed(1, 2)
// ob.on('*')
//   .then(data => {
//     console.log('[data]', data)
//   })

// setInterval(function () { // 这么写，会造成EventEmitter的监听器数量超过
//   ob.on('*')
//     .then(data => {
//       console.log('[data]', data)
//     })
// }, 1000)

// obList.get(`qob-${1}`).emit('*', 11111)
//
// ob.on('*')
//   .then(data => {
//     console.log('[data2]', data)
//   })
//
// setTimeout(function () {
//   obList.get(`qob-${2}`).emit('*', 22222)
// }, 5000)

/*
* 测试，当throw new Error('...')后，后面代码还会执行吗?
* 不会执行
* */

// function testError(p) {
//   if (p > 1) {
//     throw new Error('123')
//   }
//   console.log('456')
// }
//
// testError(2)

/*
* 测试
* event.emit.bind(this)(this.id,'complete',this.type)
* */

class EventTest {
    constructor() {
        // ...
    }

    emit(id, event, type) {
        console.log('[id,event,type]', id, event, type);
        console.log('[this]', this) // [this] JobTest { id: 1, type: 'email1', name: 'dcj123', age: 12 }
    }

    getKey() {
        console.log('[getKey this]', this); // { path: 'localhost', host: 1234 }
        console.log('[getKey this.redis]', this.redis) // undefined
    }
}

let eventTest = new EventTest();

class JobTest {
    constructor() {
        this.id = 1;
        this.type = 'email1';
        this.name = 'dcj123';
        this.age = 12;
        this.redis = {
            path: 'localhost',
            host: 1234
        }
    }

    _toComplete() {
        eventTest.emit.bind(this)(this.id, 'complete', this.type)
        // eventTest.emit()方法中用的是当前的JobTest的对象
    }

    _getKey() {
        eventTest.getKey.bind(this.redis)(this.id, 'complete', this.type)
    }
}

// let jobTest = new JobTest()
// jobTest._toComplete()
// jobTest._getKey()

/*
* 测试if中嵌套if+return
* //当执行return时，[4]不再执行
* //当throw new Error('hhh'),[4]不再执行
* */

function ifTest(n) {
    console.log(typeof n === 'number');
    if (typeof n === 'number') {
        if (n === 1) {
            console.log('[1]')
        } else if (n === 2) {
            console.log('[2]')
        } else {
            if (n === 3) {
                return
            } else {
                console.log('[3.1]')
            }
            console.log('[3]');
            return
            // throw new Error('hhh')
        }
        console.log('[4]')
    }
    console.log('[5]')
}

function invokeIfTest() {
    ifTest(4);
    console.log('[6]')
}

// ifTest(1) // [1] [4]
// ifTest(2) // [2] [4]
// ifTest(3) // [3] [4]
// ifTest(4) // [3] [4]

// invokeIfTest()

async function save() {
    let id = await new Promise((resolve, reject) => {
        reject('错误')
    }).catch(err => {
        console.log('[捕捉到错误]', err);
        // return '123456'
        return err
    })
    // .then(res => {
    // console.log('[res]', res)
    // })
        .catch(err2 => {
            console.log('[捕捉到错误2]', err2)
        });
    console.log('[1]')
}

// save()

async function save2(num) {
    let job = queue.createJob('email1', {name: 'zhangsan'});
    let object = await new Promise((resolve, reject) => {
        let multi = job.redis.client.multi();
        multi
            .hset('q:job:1234567890', 'state', 'delay')
            .hset('q:job:1234567890', 'updated_at', Date.now())
            .exec(err => {
                if (err) {
                    console.log('[err]', err);
                    return '[promise error]'
                }
                // 手动错误
                // throw new Error('[手动错误]') // 这个不好还是改掉吧
                return resolve('[promise success]')
            });
        console.log('[1]');
        if (num > 2) {
            console.log('[1.5]');
            return
        }
        console.log('[2]')
    });
    console.log('[3]', object);
    return 100
}

// save2(3).then(res => {
//   console.log('[save2]', res) // 100
// })

/*
* 测试结果:

在function + if + return，如果有if判断，那么不论是嵌套了几层的if，只要return，就立即结束整个函数

在promise + return ，调用了return关键字，只表示抛出结果，给后面的then来捕获

在promise + await + return resolve(...) + 左侧变量，组合起来使用，拿到返回值
* */

/*
* 测试args()方法
* */

class JobTest2 {
    constructor() {
        // ...
        this.args = null
    }

    _inactiveState(job) {
        console.log('[this.args]', this.args)
    }

    args(...args) {
        this.args = Array.from(args);
        return this
    }
}

// let jobTest2 = new JobTest2()
// jobTest2._inactiveState()

/*
* 测试在node_redis中进行if+return
* redis + if + return
* */
async function redisIfRedis() {
    let job1 = queue.createJob('email2', {name: 'zhangsan'});
    let object = await new Promise((resolve, reject) => {
        // let multi = job1.redis.client.multi()
        job1.redis.client.hgetall('q:job:10', (err, hash) => {
            console.log('[err, hash]', err, hash);

            let _ttl = parseInt(hash.ttl);

            if (_ttl === 1000) {
                console.log('[_ttl === 1000]');
                return resolve(job1)
            }

            if (_ttl === 5000) {
                console.log('[_ttl === 5000]');
                return resolve(job1)
            }

            if (_ttl === 10000) {
                console.log('[_ttl === 10000]');
                return resolve(job1)
            }

            console.log('[_ttl === 15000]')
        });

        console.log('[_ttl === 20000]')
    });
    console.log('[_ttl === 25000]')
}

// redisIfRedis()

/*
* 测试return返回
* */

function _toRetry(n) {
    // let multi = this.redis.client.multi();
    // let getKey = this.redis.getKey.bind(this.redis);
    console.log('[n]', n);
    let job1 = queue.createJob('email2', {name: 'zhangsan'});
    if (n > 0) {
        if (n === 1) {
            console.log('[1]')
        } else if (n === 2) {
            console.log('[2]')
        } else {
            console.log('[5]');
            return job1.redis.client.multi()
                .zrem('q:jobs:failed', '01|1')
                .exec(() => {
                    console.log('[执行完成]')
                })
        }
        // 后续redis代码
        console.log('[3]')
    }
    console.log('[4]')
}

// _toRetry(3)

/*
* 测试结果： 当ids.length>0===true时>>>打印[setInterval()]
*           当ids.length>0===false时>>>打印[setInterval()]+[ids.map()后续代码]
*
* 结论: 说明return只是跳过job1.redis.client.zrangebyscore(...,function(err,ids){...})
*       return>>>一般普通，最近的一个function()
*       return>>>promise(await promise)
*
* return在各个场景下的区别
* */
function checkPromotion() {
    let job1 = queue.createJob('email2', {name: 'zhangsan'});
    // console.log(job1)

    setInterval(function () {
        job1.redis.client.zrangebyscore('q:jobs:delayed', 0, Date.now(), 'LIMIT', 0, 500, function (err, ids) {
            // console.log('[checkPromotion]', err, ids)
            if (ids.length > 0) {
                return
            }
            console.log('[ids.map()后续代码]')
        });
        console.log('[setInterval()]')
    }, 2000);
    console.log('[最外部的代码]')
}

// checkPromotion()

/*
* 静态属性
* 非直接含义
* xqueue.getJob.call(this,id)
* getJob()>>>来自job.js
* 所以getJob()中的this相当于xqueue实例
* */

class JobTest3 {
    constructor(type, data, queue) {
        this.type = type;
        this.data = data || {};
        this.redis = 'redis实例'
    }

    static getJob(id) {
        let worker = this;
        // let redis = worker.redis
        console.log('[worker]', worker)
        // console.log('[redis]', redis)
    }
}

// let job3 = new JobTest3('email1', {name: 'zhangsan'})
// JobTest3.getJob(123)

/*
* 测试blpop()函数的功能
* */
// function blpop() {
//   let redis = queue.redis
//   let client = redis.createClient()
//   console.log('[client]', queue)
//   return new Promise((resolve, reject) => {
//     // ...
//   })
// }
//
// blpop()