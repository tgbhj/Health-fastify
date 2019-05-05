const Job = require('./job.js');
const map = require('./map');
const event = require('./queueEvent');
const RedisFactory = require('./redis');

class Handle {
    /**
     * redis: 共享RedisClient对象
     * type: 任务分组
     * */
    constructor(that) {
        this.redis = that.redis;
        this.type = that.type
    }

    /**
     * 功能: 查询q:type:jobs列表中,是否有值,并返回
     *
     * 1.blpop作用
     *   (1)列表 & blpop移除并获取列表的第一个元素
     *   (2)如果列表没有元素>>>阻塞，直到超时或发现可弹出元素位置
     *   (3)返回后,列表长度-1
     * 2.q:type:jobs的lpush位置
     *   (1)在job.js中的_toInactive() & _inactiveState()
     *   (2)当事件变为'inactive'时,lpush q:type:jobs 1
     * 3.同一个分组共用一个node_redis对象(此对象非共享redis对象)
     * 4.0:表示阻塞,当列表q:type:jobs中没有成员时,会阻塞
     *   1:表示,等待1s后返回;没有type,会显示err=null,member=null
     * */
    blpopJob() {
        let client = exports.clients[this.type] || (exports.clients[this.type] = this.redis.createClient());
        let self = this;

        return new Promise((resolve, reject) => {
            client.blpop(self.redis.getKey(this.type, 'jobs'), 0, (err, member) => {
                if (err) {
                    throw new Error(err)
                }

                if (member) {
                    resolve(member) // [ 'q:type:jobs', '1' ]
                }
            })
        })
    }

    /**
     * 功能: 返回有序集合q:jobs:type:inactive中，优先级最高的zid
     *      更新事件inactive>>>active
     *
     * 1.返回有序集合q:jobs:type:inactive中，优先级最高的zid
     * 2.将zid转成id
     * 3.Job.getJob.call(self, id)
     *   (1)在q:jobs:type:inactive中的,返回的job实例state='inactive'
     *   (2)getJob()更新该任务事件,inactive>>>active
     *   (3)返回job实例
     * 4.在q:jobs:type:inactive添加(priority,zid)的位置
     *   (1)_toInactive()
     *   (2)_inactiveState()
     * */
    getJob() {
        let self = this;
        return new Promise((resolve) => {
            self.zpop(self.redis.getKey('jobs', self.type, 'inactive'))
                .then((zid) => {
                    let id = RedisFactory.getIdFromZid(zid);
                    let workJob = Job.getJob.call(self, id);
                    workJob.then((data) => {
                        resolve(data)
                    })
                })
        })
    }

    /**
     * 功能: 集合原子出栈方法(模仿列表blpop功能，使用有序集合的方式来实现)
     *
     * 1.移除并返回有序集合q:jobs:type:inactive中优先级最高的成员
     *   (1)当优先级相同时,按添加到有序集合的顺序排列
     *   (2)zrange(key,0,0)>>>返回有序集合中值score最小的元素(优先级最高)
     *   (3)zremrangebyrank(key,0,0)>>>删除有序集合中值score最小的元素(优先级最高)
     * 2.返回结果zid
     *   (1)data>>> [ [ '01|1' ], 1 ]
     *   (2)data[0][0]>>>'01|1'(zid)
     * 3.描述
     *   (1)有序集合按分数排列,从小到大
     *   (2)优先级越高,值越小('critical'-15~10'low')
     * */
    zpop(key) {
        return new Promise((resolve, reject) => {
            let multi = this.redis.client.multi();
            multi
                .zrange(key, 0, 0)
                .zremrangebyrank(key, 0, 0)
                .exec(function (err, data) {
                    if (err) {
                        reject(err)
                    }
                    resolve(data[0][0]) // 01|1
                })
        })
    }
}

class Worker {
    /**
     * queue: xqueue实例
     * type: 分组
     * redis: 共享RedisClient对象
     * running: 标志位(未使用)
     * handle: Handle实例
     * */
    constructor(queue, type) {
        this.queue = queue;
        this.type = type;
        this.redis = queue.redis;
        this.running = true;
        this.handle = new Handle(this)
    }

    /**
     * 功能: 列表和有序集合同时原子出栈(移除并返回成员)
     *
     * 1.blpopJob(): 移除/取出列表q:type:jobs中第一个成员
     * 2.getJob():
     *   (1)zpop(): 移除/取出有序集合q:jobs:type:inactive中第一个成员(优先级最高成员)
     *   (2)getJob(): 将inactive>>>active,修改事件状态
     *
     * 3.查阅重复往同一个有序集合中添加相同(priority,zid)会不会覆盖? 答: 会覆盖
     * 4.查阅重复往同一个列表中添加1，会不会覆盖? 答: 不会覆盖
     * */
    async getJob(id) {
        let jobMsg = null;
        let member = null;
        member = await this.handle.blpopJob();
        if (member) {
            jobMsg = await this.handle.getJob()
        }
        return jobMsg
    }

    /**
     * 功能: 将任务事件从inactive>>>active
     *
     * 1.将inactive事件>>>active事件,必须满足同时以下两个条件
     *    (1)调用getJob()方法
     *    (2)此时任务事件为inactive
     * 2.shuttingDown表示任务队列正在停止
     * 3.两种情况
     * (1)如果正在停止队列服务，以正确形式返回Promise{错误信息+错误位置}
     * (2)如果没有停止队列服务，
     *    a.取出有序集合中q:jobs:type:inactive优先级最高的任务(event=inactive)
     *    b.将任务事件由inactive>>>active
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

    /**
     * 功能: 销毁ob与work对象map
     *
     * 1.jobsList: 任务事件>>>给jobsList中所有任务设置属性shutDown=true
     * 2.清空队列
     *  (1)clearWorkMap: 清空工作队列
     *  (2)clearObmMap: 清空消息通知队列
     *  (3)clearSubMap: 清空键事件通知队列
     * 3.销毁queueEvent()的pub/sub client
     * 4.销毁warlock对象
     * 5.销毁共用redis链接
     * 6.xqueue._shutDown=true: 表示任务服务队列已经关闭
     * */
    clear() {
        map.jobsList.map((job) => {
            job.shutDown = true // 给每一个job实例设置shutDown属性
        });

        // 2.
        map.clearWorkMap();
        map.clearObMap();
        map.clearSubMap();
        // 3.
        event.subClient.map((client) => {
            client.quit()
        });

        event.pubClient.map((client) => {
            client.quit()
        });
        // 4.
        this.queue.lockClient.quit();
        // 5.
        this.queue.redis.client.quit();
        // 6.
        this.queue._shutDown = true
    }
}

module.exports = Worker;
exports.clients = {};

/*
* 1.queue.process()>>>worker.start()
*   (1)worker.start()能将任务的inactive事件>>>active事件
*   (2)当shuttingDown=true,表示任务队列正自停止时,以正确形式返回Promise{错误信息+错误位置}
* 2.queue.process(type)>>>blpopJob()
*   (1)当type='test'时,即任务分组'test'不存在时,不会报错,返回err=null,member=null
*   (2)当type='email1'时,即任务分组'email1'存在时,返回1.继续zpop()操作
*   (3)type参数的作用: blpopJob.js
*        a.对每个type分组,实例化一个新的node_redis的client对象
*        b.查询q:type:jobs分组,
*             报错: 最外层catch捕获
*             type不存在: 若timeout=0,阻塞;若timeout!=0(1),返回err=null,member=null
*             type存在: 返回1
* 3.问题:
*   (1)blpopJob()和zpop()之间保持1对1的关系? 重复往列表q:type:jobs中添加,而没有往有序集合q:jobs:type:inactive中添加
*
* 4.只有通过worker.start(),才能使任务事件inactive>>>active
*   从而,调用done()>>>active>>>complete
*                 >>>active>>>failed>>>retry>>>inactive
*                                           >>>delay>>>queue.checkPromotion()>>>delay>>>inactive
*   当任务事件为inactive时,>>>等待worker.start()更新事件inactive>>>active,进入下一个循环
*
* 1.任务事件分为3个部分,以worker.start(),更新事件inactive>>>active为分界线
*   (1)在分界线之前, delay+inactive
*   (2)在分界线时, inactive更新为active
*   (3)在分界线之后, active+complete+retry+failed
*
* 2.第一部分delay+inactive
*   (1) delay: 当创建任务时,添加延迟选项,queue.createJob(...).delay(20000).save()>>>进入delayed事件
*   (2) inactive: 当创建任务时,没有添加延迟选项,queue.creatJob().save()>>>直接进入inactive事件
*   (3) xqueue.checkPromotion(): delayed>>>inactive
*
*   第二部分inactive更新为active
*   (1) let job=xqueue.process()>>>worker.start()>>>inactive更新为active
*
*   第三部分active+complete+failed+retry
*   (1) job.done('complete')>>>标记任务成功active>>>complete
*   (2) job.done('failed')>>>标记任务失败active>>>failed
*   (3) 失败>>>_toRetry>>>
*       a.判断剩余尝试次数,没有退出
*       b.backoff(true/{delay:20000}): 进入delayed事件
*       c.backoff(false): 立即重试任务,进入inactive事件(调用_inactiveState())
*         代码:
*         this._state='inactive'
*         this.state('inactive')
*
* 3.还有一种情况, 会调用_inactiveState()
*   就是createJob()时, 不添加delay选项
*   save()时,
*         会设置this._state='inactive'  (1)
*         然后执行this.state('inactive') (2)
*   进入state()时,
*         此时,oldState=this._state='inactive' (1)
*         this._state='inactive'(2)
*         oldState===this._state>>>执行了_inactiveState()>>>省去了删除q:jobs:delayed
*                                                               删除q:jobs:type:delayed 的2个操作
* */