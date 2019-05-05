const Job = require('./job.js');
const map = require('./map');
const event = require('./queueEvent');

class Handle {
    constructor(that) {
        this.redis = that.redis; // that===worker实例 that.redis===worker.redis===queue.redis===RedisClient
        this.type = that.type // that.type===worker.type===constructor(queue,type)传参==='email1'任务分组
    }

    /*
    * 功能: 移除并返回列表q:email1:jobs的第一个元素
    * 1.blpop作用
    *   列表 & blpop移除并获取列表的第一个元素
    *   如果列表没有元素>>>阻塞，直到超时或发现可弹出元素位置
    * 2.q:email1:jobs的lpush位置
    *   在job.js中的_toInactive() & _inactiveState()
    *   有lpush(getKey(this.type,'email1'),1)>>>相当于lpush q:email1:jobs 1
    * 3.blpopJob()作用
    *   blpop每次从q:email1:jobs列表返回第一个元素1
    *   然后，列表长度-1
    * */
    blpopJob() {
        // 1个type对应RedisClient
        let client = exports.clients[this.type] || (exports.clients[this.type] = this.redis.createClient());
        let self = this; // 2个属性redis和type

        return new Promise((resolve, reject) => {
            client.blpop(self.redis.getKey(this.type, 'jobs'), 0, (err, member) => { // q:email1:jobs
                console.log('[worker.js.blpopJob()]', err, member);
                if (err) {
                    throw new Error(err)
                }

                if (member) {
                    resolve(member) // [member] [ 'q:email1:jobs', '1' ]
                }
            })
        })
    }

    /*
    * 功能:
    *   返回有序集合q:jobs:email1:inactive中，优先级最高的zid(分数值最低的成员)
    * 1.在q:jobs:email1:inactive添加(priority,zid)的位置
    *   在_toInactive()中zadd q:jobs:email1:inactive priority zid
    * 2.将zid转成id
    * 3.Job.getJob.call(...)，返回job信息 & 执行this.state('active')
    *   ??? 具体观察有什么功能
    *   ??? 为什么一定要添加到worker，基于什么样的标准才能添加到worker
    * */
    getJob() {
        let self = this;
        return new Promise((resolve) => {
            self.zpop(self.redis.getKey('jobs', self.type, 'inactive'))
                .then((zid) => {
                    // ... 返回在q:jobs:email1:inactive中的zid(在当前分组中优先级最高的)
                    let id = RedisFactory.getIdFromZid(zid);
                    // 添加到worker
                    let workJob = Job.getJob.call(self, id); // 此时当前id的状态是this._state='inactive'
                    workJob.then((data) => {
                        resolve(data)
                    })
                })
        })
    }

    /*
    * 集合原子出栈方法(模仿blpop的作用，使用有序集合的方式来实现)
    * 功能: 移除并返回有序集合q:jobs:email1:inactive中优先级最高的成员
    * 1.移除和返回代码
    *   zrange(key,0,0)>>>返回有序集合中值score最小的元素
    *   zremrangebyrank(key,0,0)>>>删除有序集合中值score最小的元素
    * 2.结果
    *   data>>> [ [ '01|1' ], 1 ]
    *   data[0][0]>>>'01|1'(zid)
    *   key>>>集合名称q:jobs:email1:inactive
    * 3.描述
    *   因为q:jobs:email1:inactive是有序集合，所以，其中的成员都是按照分数来排列的
    *   在job.js._toInactive()方法中，
    *   zadd q:jobs:email1:inactive priority zid & priority(优先级越高，值越小'critical'-15~10'low')
    *   可以看到，排在前面的一定是优先级高的(符合优先级的思路)
    * */
    zpop(key) {
        return new Promise((resolve, reject) => {
            let multi = this.redis.client.multi();
            multi
                .zrange(key, 0, 0)
                .zremrangebyrank(key, 0, 0)
                .exec(function (err, data) {
                    // 打印err, data
                    // console.log('[err]', err)
                    // console.log('[data]', data[0][0])
                    // (err) ? reject(err) : resolve(data[0][0])
                    if (err) {
                        reject(err)
                    }
                    resolve(data[0][0]) // 01|1
                })
        })
    }
}

class Worker {
    constructor(queue, type) {
        // queue: xqueue实例, type: 分组
        this.queue = queue;
        this.type = type;
        this.redis = queue.redis; // RedisClient(RedisFactory实例，非node_redis操作对象)
        this.running = true; // 没有地方用到，不清除其具体功能
        this.handle = new Handle(this) // 每次创建Worker实例的时候，都会在构造函数中自动创建Handle实例
    }

    /*
    * 功能: 如果列表q:email1:jobs中，有可弹出元素
    * 1.查阅重复往同一个有序集合中添加相同(priority,zid)会不会覆盖? 答: 会覆盖
    * 2.查阅重复往同一个列表中添加1，会不会覆盖? 答: 不会覆盖
    * 3.问题: 当member=0时，jobMsg=null，await jobMsg.state('active')这句代码会报错
    * 4.q:email1:jobs列表和q:jobs:email1:inactive有序集合间的关系?
    *   假设列表q:email1:jobs和有序集合q:jobs:emil1:inactive中的数据是一对一的关系，
    *   ，即列表元素数===有序集合成员数
    *   列表blpop():
    *   有序集合zpop():
    *   blpop()能获取到元素>>>表示有序集合中，应该有对应的成员
    * */
    async getJob(id) {
        let jobMsg = null;
        let member = null;
        member = await this.handle.blpopJob(); // 移除&取出列表q:email1:jobs中第一个元素
        if (member) {
            jobMsg = await this.handle.getJob() // 有序集合q:jobs:email1:inactive
        }
        // await jobMsg.state('active') // this.handle.getJob()+有序集合q:jobs:email1:inactive(此时状态一定是inactive)
        // Job.getJob()>>>会自动更新job.state('active')
        return jobMsg
    }

    /*
    * 功能:
    * 1.shuttingDown出现位置: xqueue.js & worker.js & job.js
    *   其中，xqueue.js.shutDown(ms)修改了shuttingDown的值
    * 2.shutDown(ms):
    *   (1) this.shuttingDown=true表示正在停止队列服务
    *   (2) shutDown(ms): 这个方法可以传入参数ms(最长等待时间)
    *       当超过该时间，队列中的任务都将被标记为失败
    * 3.两种情况
    * (1)如果正在停止队列服务，以正确形式返回Promise{错误信息+错误位置}
    * (2)如果没有停止队列服务，
    *    最后，返回一个在有序集合q:jobs:type:inactive中，优先级最高的任务
    * */
    async start() {
        let job = null;
        if (this.queue.shuttingDown === true) { // 如果正在停止队列服务
            job = Promise.resolve(new Error('fxqueue will shutDown'))
        } else {
            job = await this.getJob()
        }
        return job
    }

    clear() {
        // 销毁ob与work对象map
        map.jobsList.map((job) => {
            job.shutDown = true // 给每一个job实例设置shutDown属性
        });

        map.clearWorkMap();
        map.clearObMap();
        map.clearSubMap();
        // 销毁pub/sub client
        event.subClient.map((client) => {
            client.quit()
        });

        event.pubClient.map((client) => {
            client.quit()
        });

        // 销毁lock-client
        this.queue.lockClient.quit();
        // 销毁共用redis链接
        this.queue.redis.client.quit();
        this.queue._shutDown = true // 队列服务已经关闭(xqueue)
    }
}

module.exports = Worker;
exports.clients = {};

/*
* zpop是什么?和它引申处的问题?
* 1.理解redis的事务概念
* 2.原子操作: 事务中的命令要么全部被执行，要么全部都不执行
* 3.常见事务:MULTI、EXEC、DISCARD、WATCH
* */

/*
* xqueue.process(type): 获得任务
* 1.queue.process('test')>>>表示获得任务成功
* 2.queue.process('email1')>>>表示获得任务失败
*
* 3.process(type)>>>worker.start()>>>如果正在停止队列服务>>>以正确形式返回Promise{错误信息+错误位置}
*                                                     >>>worker.getJob()
*
* 4.参数type传入Worker.constructor()>>>Handle.constructor()>>> 作用1: 1个分组对应1个exports.client
*                                                         >>> 作用2: blpopJob(): q:type:jobs
* 5.worker.start() & 也就是queue.process(type)实际用处不大???
* */