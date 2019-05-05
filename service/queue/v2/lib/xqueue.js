const WxpayDb = require("../../../pay/lib2/wdb");
const AlipayDb = require("../../../pay/lib2/db");
const EventEmitter = require('events');
const Job = require('./job');
const Worker = require('./worker');
const event = require('./queueEvent');
const map = require('./map');
const Warlock = require('node-redis-warlock');
const Schema = require('./schema');
// const {talipay, twxpay} = require('../../../pay/') // 用于调用支付查询订单接口
const Pay = require('./pay'); // 对微信支付和支付宝API的一些功能做简单封装
const PayTest = require('../../../../dbs/PayTest'); // 测试用的数据接口
const AlipayFactory = require('../../../pay/lib2/factory');
const alipayFactory = new AlipayFactory();
const WxpayFactory = require('../../../pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const snakeCaseKeys = require('snakecase-keys'); // 驼峰转成下划线
const loopQuery = require('../../../pay/lib2/query'); // 轮询用
const RedisFactory = require('./redis');

class Queue extends EventEmitter {
    /**
     * 功能: 构造参数
     * option >>> {name:'xqueue', prefix:'q'}
     * RedisClient >>> RedisFactory实例，非node_redis对象
     * */
    constructor(option, RedisClient) {
        super();
        this.id = [
            option.name,
            require('os').hostname, // 主机名
            process.pid, // 进程的PID
        ].join(':');
        this.redis = RedisClient; // 分区db:4
        this.setMaxListeners(10); // EventEmitter设置最大监听器数量10(每个Queue实例最多有10个监听器)
        this.is_observedAllKey = false; // 是否监听所有键
        this.is_observedAllEvent = false; // 是否监听所有事件
        this.subscribeEvent(); // 实例化时,订阅q:events频道
        this.subscribeSchema(); // 实例化时,订阅__keyevent@${redis.redisConfig.db}__:expired & 键过期expired通知
        this.running = true; // 是否正在运行
        this.lockClient = null; // 用于warlock的redis对象(分区db:5)
        this.warlock = Warlock(this.lockClient = RedisClient.createLockClient()); // redis强化分布式锁
        this.shuttingDown = false; // 是否正在停止队列服务 & 关闭标志位(jobs.errorEvent()中用到)
        this._shutDown = false; // 是否已经停止队列服务 & worker.clear()中用到
        this.setupTimers() // 核心 (测试)
    }

    /**
     * 功能: 创建队列任务
     * 1.任务分组type:'email1'
     * 2.任务数据data:{name:'zhangsan'}
     * 3.所有创建的job实例,共享一个redis实例
     * */
    createJob(type, data) {
        return new Job(type, data, this)
    }

    /**
     * 功能: 创建计划任务schema
     * 1.任务分组type: 'email1'
     * 2.任务数据data: {name:'zhangsan'}
     * 3.所有创建的schema实例,共享一个redis实例
     * */
    createSchema(type, data) {
        return new Schema(type, data, this.redis, this.warlock)
    }

    /**
     * 功能: 队列事件监听
     * 1.实例化时构造函数中,启动
     * 2.subscribeEvent(): 订阅q:events
     * 3.在jobs中,当事件变化时(delay,inactive&promotion,active,retry,failed,complete),接收事件触发通知
     *   并通过job实例和queue实例分别监听通知
     * 4.导入方法,绑定实例this
     * */
    subscribeEvent() {
        event.subscribeEvent.bind(this)()
    }

    /**
     * 功能: 计划任务(定时任务)
     *
     * 1.实例化时构造函数中,启动
     * 2.subscribeSchema(): 订阅__keyevent@4__:expired频道
     * 3.当计划任务执行时间节点已到达任务最大完成耗时, 计划任过期, 触发__keyevent@4__:expired频道, 并交给schemaMessage()处理
     * 4.schemaMessage():
     *    a.取出id
     *    b.取出data: 任务数据
     *    c.检查subList集合中, type任务分组对应的schema实例是否存在(type,schema实例)
     *    d.如果存在,发送message事件和参数[ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]给ontime的return schema.on('message')监听
     *    e.ontime(): 跳转ontime()功能描述
     * 5.bind(this): 表示event.subscribeSchema()方法中的this>>>当前queue实例
     */
    subscribeSchema() {
        event.subscribeSchema.bind(this)()
    }

    /**
     * 功能: 从队列获得任务(并修改任务事件为active)
     *
     * 1.利用列表原子出栈和有序集合仿原子出栈
     * 2.取出q:jobs:type:inactive中,优先级最高的成员(任务)
     * 3.将任务的事件由inactive更新为>>>active
     * 4.该方法核心作用: 修改任务事件为active,为后续complete和failed
     * 5.let job = await queue.process('email1')
     * */
    process(type) {
        let worker = this.worker = new Worker(this, type);
        return worker.start()
    }

    /**
     * 功能: 添加需要监听的任务id到集合obList
     *
     * 1.key
     *   (1) qob-all-key: 表示监听所有任务id
     *   (2) qob-id: 表示监听指定任务id(1个或多个)
     * */
    observed(...obmsg) {
        let self = this;
        if (obmsg.length === 1 && obmsg[0] === '*') {
            this.is_observedAllKey = true;
            event.addObJob('qob-all-keys', self)
        } else {
            obmsg.map((x) => {
                event.addObJob(`qob-${x}`, self)
            })
        }
        return this
    }

    /**
     * 功能: queue队列监听事件
     *
     * on()方法分为2部分
     * 1.if代码+Promise代码
     *   (1)if代码+Promise代码只会执行一次.
     *   (2)当Promise接收到第一个通知event事件时,将结果放在resolve()并返回.此时on()方法执行结束.
     *   (3)调用Promise时,执行的super.on(event),会一直在后台监听后续的通知event事件,但不会接收结果&也没有Promise返回.
     * 2.super.on(event): 用于监听通知event事件代码
     *   (1)super.on(event)调用父类EventEmitter的on()来监听通知event事件
     *   (2)在运行super.on(event)后,EventEmitter会在后台一直监听通知event事件.
     *   (3)只有第一次监听的结果会交给Promise对象并返回,后续的只监听.
     * */
    on(event) {
        if (event === '*') {
            this.is_observedAllEvent = true
        }
        return new Promise((resolve) => {
            super.on(event, function (obmsg) {
                resolve(obmsg)
            })
        })
    }

    /**
     * observed()和on()链式写法
     * queue.observed().on()
     * 1.链式写法的observed()和on()之间没有必然的关系
     * 2.observed(): 表示添加任务id到obList集合中
     * 3.on(event): 表示监听通知event事件, 该event事件和observed(id)中的id没有必然的联系
     *   比如: observed(1).on('failed'), on()监听到的failed事件可能不是任务1(可能是任务2)发出的通知事件
     *
     * 几种情况:
     * 1.queue.observed('*').on('*')
     *  (1)当observed('*')时, is_observedAllKey=true & ('qob-all-key',queue)
     *  (2)当is_observedAllKey=true时, 在queueMessage()方法中,必会执行emit('*',message)
     *  (3)因此,只有on('*'), 才能监听到所有事件
     *
     * 2.queue.observed(id).on(event)
     *  (1)监听单一任务id & 监听单一事件(一对一的关系)
     *  (2)相同id+相同事件:
     *     queue.observed(1).on('failed')
     *     queue.observed(1).on('failed')
     *     触发通知:
     *     结果:
     *     a.super.on(): 会监听到2次'failed'事件.
     *     b.promise: 只会返回第一次监听到的'failed'事件结果.
     *  (3)相同id+不同事件:
     *     queue.observed(1).on('failed')
     *     queue.observed(1).on('retry')
     *     结果:
     *     a.super.on(): 会监听到'failed'和'retry'事件.
     *     b.promise: 分别返回'failed'和'retry'事件结果.
     *  (4)不同id+相同事件: (有问题,已解决)
     *     queue.observed(1).on('failed')
     *     若此时触发_toFailed(1)
     *     监听到id=1任务发出的failed事件通知
     *     queue.observed(2).on('failed')
     *     若此时触发_toFailed(1)
     *     也会监听到id=1任务发出的failed事件通知
     *     结果:
     *     这就有问题了,从链式写法的语义上来看,
     *     queue.observed(2).on('failed')
     *     我明明监听id=2任务的failed事件,为什么id=1任务的failed事件发出通知时,也会响应?
     *     解决方法:
     *     在queueEvent.queueMessage()修改代码
     *     发送通知:
     *     event=event+'-'+id
     *     qJob.emit(event,message)
     *     监听:
     *     queue.observed(3).on(`failed-${3}`)
     *     .then(data=>console.log(data))
     *  (5)不同id+不同事件:
     *     queue.observed(1).on('failed')
     *     queue.observed(2).on('retry')
     *     结果:
     *     a.super.on(): 会监听到'failed'和'retry'事件.
     *     b.promise: 分别返回'failed'和'retry'事件结果.
     * 3.queue.observed(id).on('*')
     *   (1)监听单一任务id & 监听所有事件(一对多的关系)
     *   (2)表示监听所有事件,但只返回一次结果(promise) & super.on()后台可以监听多次
     * 4.使用xqueue队列监听时, 建议不要使用'*'
     * */

    /**
     * 功能: 监听定时任务
     *      使用ontime监听到期通知
     *      当定时到期通知运行时，将返回<promise>对象，可获得id,data
     *
     * 1.两种模式
     *  (1)传递only参数
     *      a.表示传入的是一个对象object: {type:'type',only:true/false}
     *  (2)没传递only参数
     *      a.表示传入的是一个字符串string: 'type',  only=false(默认)
     *
     * 2.创建新schema对象 & 并附带关键参数type
     * 3.subType(): subList中添加以type为key的Map, event.addSubMap(type任务分组, 新的schema实例) & 按type来指定对应的schema实例
     * 4.等待过期事件触发>>>schemaMessage>>>getSubMap.emit('message', [ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ])
     *   使用schema.on()监听
     * 5.schema.on():
     *   (1)监听过期事件传递来的参数, 返回当前schema对象给ontime()
     *   (2)更新q:schema:id的state为'confirmed'
     * 6.ontime(): 最终返回Promise{schema实例}, 是否调用done(), 看情况再说
     * */
    ontime(obj) {
        let _type = null;
        let _only = false;
        if (typeof obj === 'object' && obj != null) {
            let {type, only} = obj;
            if (type) _type = type;
            if (only) _only = only
        } else if (obj.only === undefined || obj.only === false) {
            _type = obj
        } else {
            throw new Error('Invalid parameter')
        }

        // 创建新的schema对象
        let schema = new Schema(_type, null, this.redis, this.warlock);
        schema.subType(_only);
        return schema.on('message')
    }

    /**
     * 功能: 计划任务和队列任务定时轮询
     *
     * 1.实例化时构造函数中,启动
     * 2.this.redis共享redis对象(非node_redis对象)
     * 3.checkSchemaTTL():
     * 4.checkPromotion():
     *    (1)循环遍历q:jobs:delayed, 每次返回500个符合匹配的ids
     *    (2)根据ids, 更新任务事件'delay'>>>'inactive'或'retry'>>>'inactive'
     *    (3)发送事件更新通知
     * 5.checkActiveTTL():
     *    (1)循环遍历q:job:active, 每次返回500个符合匹配的ids
     *    (2)根据ids, 当前任务事件为'active', 所以getJob()不会更新事件, 返回id对应job实例
     *    (3)判断job实例的complete属性,
     *       当job.complete=false, 标记任务失败, 更新事件'active'>>>'failed'.
     *       当进入'failed'事件, 会调用'retry'事件, 根据已尝试次数决定是否重试任务.
     */
    async setupTimers() {
        let self = this;
        let lockTtl = 2000;
        // let timeout = 10000 // 查询间隔
        let timeout = 1000; // 查询间隔(修改为1s)
        let timeoutComplete = 10000;
        let timeoutFinish = 10000;
        let timeoutSave = 1000;
        let limit = 500; // 每次查询,返回结果的数量

        let method = 'alipay_trade_query_response';

        checkPromotion(); // 检查q:jobs:delayed(delay>>>promotion(inactive))
        checkActiveTTL(); // 检查q:jobs:active()
        checkSchemaTTL(); // 检查q:unconfirmed:schema
        checkActive(); // 检查q:jobs:inactive(inactive>>>active)
        checkComplete(); // 检查q:jobs:complete(写入数据库,支付成功)
        checkFinish(); // 检查去q:jobs:finish(写入数据库, 支付失败)
        // checkSave()

        /*
        * 1.每隔10s，查询Redis的q:unconfirmed:schema有序集合，符合值的
        * 2.返回所有符合条件的ids数组
        * 3.对ids数组做处理，取出id，并重新放入ids数组，交给recoverAndClear(ids)处理
        * 4.
        * */

        /**
         * 功能: 循环查询有序集合q:unconfirmed:schema
         *
         * 1.每次返回最多500个任务
         * 2.参数:
         *    (1)分数值timeStamp: 表示计划任务执行时间
         *    (2)区别ttl: 表示计划任务最大完成耗时
         * 3.redis命令: limit [offset(偏移量) count(返回数量)] 三个参数必须同时出现
         * */
        function checkSchemaTTL() {
            self.warlock.lock('activeJobsTTL', lockTtl, function (err, unlock) {
                if (err) {
                    console.log('[checkSchemaTTL err]', err);
                    return
                }

                if (typeof unlock === 'function') {
                    // 上锁成功，执行业务代码，完成后解锁
                    setInterval(function () {
                        let redis = self.redis;
                        redis.client.zrangebyscore(redis.getKey('unconfirmed', 'schema'), 100000, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                            if (ids.length === 0) {
                                return
                            }

                            // zid>>>id
                            ids = ids.map((zid) => {
                                return parseInt(RedisFactory.getIdFromZid(zid))
                            });
                            recoverAndClear({ids, unlock})
                        })
                    }, timeout) // 轮询间隔10s
                }
            })
        }

        /**
         * 功能: q:unconfirmed:schema中, 计划任务执行时间满足执行时间, 处理函数.
         *      字面意思: 表示尚未执行的计划任务, 已经到达执行时间.
         *
         * 1.参数:
         *  (1)client: RedisFactory()实例化时, 创建node_redis对象, client类属性获取
         *  (2)hgetall: 获取集合的所有信息
         *  (3)schema.schedule: 计划任务执行时间
         *  (4)schema.ttl: 计划任务最大完成耗时
         *  (5)warlock生效: warlock上锁是否有效，
         *                 与key有关，
         *                 与warlock(RedisClient)中的RedisClient无关
         * 2.根据id, 获取集合q:schema:id的所有信息, 返回schema实例(包含具体信息)
         * 3.生成stringKey
         * 4.当该计划任务未执行
         *  (1)schedule+ttl+timeout+lockTtl: 考虑到一切可能产生的等待时间
         *      a.schedule: 计划任务执行时间
         *      b.timeout: 计划任务最大完成耗时
         *      c.timeout: 轮询间隔, (满足当前的ids.length>500,剩余的ids需下次轮询,所以+timeout)
         *      d.lockTtl: warlock, redis上锁超时(当多个queue队列启动时, 可能需要等待上一个queue启动完成时, redis锁用完时)
         *  (2)考虑到允许执行时间的最大值(ttl)+一切可能产生的等待时间, 依然<当前时间,
         *     表示该计划任务理论上应该被执行(过期)了, 但是基于某些原因, 而没有执行(过期),
         *     那么, 我们通过轮询到该计划任务后, 将其强行过期.
         * 5.当该计划任务已执行
         *  (1)删除q:schema:id整个集合
         *  (2)删除q:unconfirmed:schema有序集合中, zid成员
         * */
        function recoverAndClear({ids, unlock}) {
            let redis = self.redis;
            ids.forEach((id) => {
                redis
                    .client
                    .hgetall(redis.getKey('schema', id), (err, schema) => {
                        let stringKey = redis.getKey('schemas', schema.type, id, JSON.stringify(schema.data));
                        if (schema.state === 'unconfirmed') {
                            if ((parseInt(schema.schedule) + parseInt(schema.ttl) + timeout + lockTtl) < Date.now()) {
                                redis.client
                                    .multi()
                                    .set(stringKey, 1)
                                    .expire(stringKey, 1) // 过期, 单位(s)
                                    // .expire(stringKey, 0) // 过期, 但不会触发__keyevent@4__:expired频道
                                    .exec(function (err) {
                                        if (err) {
                                            throw new Error(err)
                                        }
                                        unlock()
                                    })
                            }
                        } else {
                            if (schema.state === 'confirmed' && (parseInt(schema.schedule) + parseInt(schema.ttl) < Date.now())) {
                                // 清除
                                let multi = redis.client.multi();
                                multi
                                    .del(redis.getKey('schema', id)) // 删除q:schema:1整个集合
                                    .zrem(redis.getKey('unconfirmed', 'schema'), RedisFactory.createZid(id)) // 从未完成集合中删除
                                    .exec((err) => {
                                        if (err) {
                                            throw new Error(err)
                                        }
                                        unlock()
                                    })
                            }
                        }
                    })
            })
        }

        /**
         * 功能: 循环查询有序集合q:jobs:delayed
         * 1.每次最多返回500个任务
         * 2.两种情况,会在q:jobs:delayed
         *   (1) 当创建任务时,添加延迟选项queue.createJob(...).delay(20000).save()
         *   (2) 当任务失败时,重试retry,且backoff(true/20000)失败补偿时,将任务重新添加到q:jobs:delayed有序集合中
         * */
        function checkPromotion() {
            setInterval(function () {
                self.warlock.lock('promotion', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkPromotion err]', err);
                        return
                    }

                    if (typeof unlock === 'function') {
                        let redis = self.redis;
                        redis
                            .client
                            .zrangebyscore(redis.getKey('jobs:delayed'), 0, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                                if (err) {
                                    return new Error(err)
                                }

                                if (ids.length === 0) {
                                    return
                                }

                                // zid>>>id
                                ids = ids.map((zid) => {
                                    return parseInt(RedisFactory.getIdFromZid(zid))
                                });

                                doPromote({ids, unlock})
                            })
                    }
                })
            }, timeout)
        }

        /**
         * 功能: q:jobs:delayed中,任务延迟时间满足执行条件,处理函数
         *      更新事件delay>>>inactive
         *      更新事件retry>>>inactive
         *      发送通知'promotion'
         *
         * 1.ids: 满足条件的任务id数组
         * 2.unlock: 用于warlock解锁.
         *           在发生错误时,关闭.
         * 3.getJob(): 调用时,绑定本类this
         *             由checkPromotion()可知,两种情况在q:jobs:delayed
         *             两种情况对应的事件分别为: delay和retry
         *             getJob()中,当事件为delay和retry时,会更新事件
         *             delay>>>inactive>>>发送通知>>>emit('promotion')
         *             retry>>>inactive>>>发送通知>>>emit('promotion')
         * 4.在getJob()执行完后,又再一次发送通知.
         *             该通知和_toInactive()中发送的通知相同
         * */
        function doPromote({ids, unlock}) {
            ids.forEach(function (id) {
                Job.getJob.call(self, id)
                    .then((job) => {
                        // 通知
                        event.emit.bind(job)(job.id, 'promotion', job.type, {promote_at: Date.now()})
                    })
                    .catch((err) => {
                        if (err) {
                            throw new Error(err)
                        }
                        unlock()
                    })
            })
        }

        /**
         * 功能: 循环查询有序集合q:jobs:active
         * 1.有序集合q:jobs:active添加分数值(在job._toActive()中)
         *   (1)当ttl(任务最大生存时间)存在时,添加分数值===ttl
         *   (2)当ttl不存在时,添加分数值===priority
         *   (3)在有序集合q:jobs:active中,通过指定分数区间(100000,当前时间)来返回成员列表
         *       可以看出q:jobs:active保存的应是ttl值
         *   (4)在创建任务时,添加ttl选项,添加分数值===ttl
         *   (5)该ttl=this._ttl+Date.now()===任务完成最大耗时
         * 2.一种情况,会在q:jobs:active
         *   (1)当外部调用getJob()并且该任务事件为inactive时,会修改事件inactive>>>active
         * 3.问题: 哪里调用了getJob()并且该任务事件为inactive???
         *   (1)worker.start()>>>worker.getJob()>>>handle.getJob()>>>job.js.getJob()
         * */
        function checkActiveTTL() {
            setInterval(function () {
                self.warlock.lock('activeJobsTTL', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkActiveTTL err]', err);
                        return
                    }

                    if (typeof unlock === 'function') {
                        let redis = self.redis;
                        redis
                            .client
                            .zrangebyscore(redis.getKey('jobs', 'active'), 100000, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                                if (err) {
                                    return new Error(err)
                                }

                                if (ids.length === 0) {
                                    return
                                }

                                ids = ids.map((zid) => {
                                    return parseInt(RedisFactory.getIdFromZid(zid))
                                });

                                removeTTLJobs({ids, unlock})
                            })
                    }
                })
            }, timeout)
        }

        /**
         * 功能: q:jobs:active中,表示达到任务最大生存时间,
         *      此时,
         *      当job.complete=true时,任务被标记为成功
         *      当job.complete=false时,任务被标记为失败>>>修改事件为failed
         *                                          >>>发送(超时)通知
         *
         * 1.getJob():
         *    (1)在q:jobs:active中,表示当前任务事件为'active',不修改事件
         *    (2)在q:job:id中,查找任务信息
         *        当任务没有被标记为complete,则修改任务事件为失败,并发送通知'TTL exceed'
         * 2.考虑当前任务的事件状态到底是什么?
         *    (1)当前任务事件是'active'
         * */
        function removeTTLJobs({ids, unlock}) {
            ids.forEach(function (id) {
                Job.getJob.call(self, id)
                    .then((job) => {
                        let err = 'ttl exceed'; // 错误信息:ttl超时
                        let stack = null; // 错误位置
                        if (!job.complete || !job.finish) {
                            job.state('failed', {err, stack});
                            // 通知
                            event.emit.bind(job)(job.id, 'TTL exceed', job.type, {removeTTLJob_at: Date.now()})
                        }
                    })
                    .catch((err) => {
                        if (err) {
                            throw new Error(err)
                        }
                        unlock()
                    })
            })
        }

        /**
         * 功能: 循环查询有序集合q:job:inactive
         *
         * 1.返回成员, 查询支付订单
         *
         * */
        function checkActive() {
            setInterval(function () {
                self.warlock.lock('activeQueryOrder', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkActive err]', err);
                        return
                    }

                    if (typeof unlock === 'function') {
                        let redis = self.redis;
                        redis.client.zrangebyscore(redis.getKey('jobs', 'inactive'), 0, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                            if (err) {
                                return new Error(err)
                            }

                            if (ids.length === 0) {
                                return
                            }

                            ids = ids.map((zid) => {
                                return parseInt(RedisFactory.getIdFromZid(zid))
                            });

                            queryOrder({ids, unlock})
                        })
                    }
                })
            }, timeout)
        }

        /**
         * 功能: 循环更新inactive>>>active, 并根据type分组, 调用alipay/wxpay不同的查询接口
         * */
        function queryOrder({ids, unlock}) {
            ids.forEach((id) => {
                Job.getJobProcess
                    .call(self, id)
                    .then(async (job) => {
                        // let jobJson = job.Json()
                        // let loopParams = {
                        //   out_trade_no: JSON.parse(jobJson['data'])['out_trade_no'],
                        //   type: jobJson['type'],
                        //   // max_attempts: jobJson['max_attempts'],
                        //   // attempts: jobJson['attempts'],
                        // }

                        // p1
                        console.log('[p1][queryOrder.job.Json()]', job.Json());

                        // 发起查询
                        let tradeStatus = await loopQuery.queryOrder.bind(job)();
                        // p5
                        console.log('[p5][xqueue.loopQuery.queryOrder tradeStatus]', tradeStatus);
                        tradeStatus && job.done('[pay complete]');
                        !tradeStatus && job.state('failed', {err: '[pay failed]', stack: 'pay failed position'})
                    })
                // Job.getJobInfo
                //   .call(self, id)
                //   .then(async (job) => {
                //     let {type} = job
                //     let _job = await self.process(type) // inactive>>>active
                //     let {out_trade_no} = JSON.parse(_job.Json()['data'])
                //     let tradeStatus = null
                //     console.log('[向(支付宝/微信支付)发起查询]', type, out_trade_no)
                //     // 查询订单接口(修改)
                //     if (type === 'alipay') {
                //       alipayFactory.setMethod('query')
                //       let queryRes = await alipayFactory.createAlipaySdk().exec(
                //         alipayFactory.ALIPAY_API_MAPPING,
                //         {
                //           bizContent: {outTradeNo: out_trade_no}
                //         },
                //         {
                //           // 验签
                //           validateSign: true
                //         }
                //       )
                //       tradeStatus = queryRes['tradeStatus'] // ??? 需要测试
                //     } else {
                //       // 微信支付查询订单接口
                //       // 发起查询 (待测试)
                //       tradeStatus = await Pay.queryOrder(type, out_trade_no)
                //       console.log('[queryOrder]', tradeStatus)
                //     }
                //
                //     if (type === 'alipay') {
                //       if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_CLOSED') {
                //         _job.done('[alipay complete]')
                //       } else if (tradeStatus === 'WAIT_BUYER_PAY') {
                //         _job.state('failed', {err: '[alipay failed]', stack: 'alipay failed position'})
                //         if (!(parseInt(_job.max_attempts) > parseInt(_job._attempts))) { // 重试次数用完时， 撤销订单
                //           // 调用撤销订单接口
                //           // let cancelRes = await Pay.cancelOrder(type, out_trade_no)
                //           // console.log('[撤销订单结果]', cancelRes)
                //           alipayFactory.setMethod('close')
                //           let closeRes = await alipayFactory.createAlipaySdk().exec(
                //             alipayFactory.ALIPAY_API_MAPPING,
                //             {
                //               bizContent: {
                //                 outTradeNo: out_trade_no
                //               }
                //             },
                //             {
                //               validateSign: true
                //             }
                //           )
                //           console.log('[交易关闭结果]', closeRes)
                //         }
                //       } else {
                //         // 未创建订单(只有在用扫码, 跳出输入密码后, 才会创建订单)
                //         _job.state('failed', {err: '[支付宝 支付失败 订单未创建 - ', stack: 'pay fail position'})
                //       }
                //     } else if (type === 'wxpay') {
                //       if (tradeStatus === 'SUCCESS' || tradeStatus === 'CLOSED') {
                //         console.log('微信支付成功')
                //         _job.done('[wxpay complete]')
                //       } else if (tradeStatus === 'NOTPAY') {
                //         console.log('微信支付失败')
                //         _job.state('failed', {err: '[wxpay failed]', stack: 'wxpay failed position'})
                //         if (!(parseInt(_job.max_attempts) > parseInt(_job._attempts))) {
                //           let cancelRes = await Pay.cancelOrder(type, out_trade_no)
                //           console.log('[撤销订单结果]', cancelRes)
                //         }
                //       } else {
                //         console.log('微信支付其他')
                //       }
                //     }
                //   })
                //   .catch((err) => {
                //     if (err) {
                //       throw new Error(err)
                //     }
                //     unlock()
                //   })
            })
        }

        /**
         * 功能: 将事件为complete的任务, 写入数据库, 标记为支付成功
         * */
        function checkComplete() {
            setInterval(function () {
                self.warlock.lock('jobsComplete', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkComplete err]', err);
                        return
                    }

                    if (typeof unlock === 'function') {
                        let redis = self.redis;
                        redis.client.zrangebyscore(redis.getKey('jobs:complete'), 0, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                            if (err) {
                                return new Error(err)
                            }

                            if (ids.length === 0) {
                                return
                            }

                            ids = ids.map((zid) => {
                                return parseInt(RedisFactory.getIdFromZid(zid))
                            });

                            doComplete({ids, unlock})
                        })
                    }
                })
            }, timeoutComplete)
        }

        function doComplete({ids, unlock}) {
            console.log('[doComplete]');
            ids.forEach(function (id) {
                Job.getJob
                    .call(self, id)
                    .then((job) => {
                        let {type, data} = job;
                        let {out_trade_no} = JSON.parse(data);
                        // 数据库保存
                        // PayTest.save({
                        //   out_trade_no,
                        //   tradeStatus: '支付成功',
                        //   type
                        // })
                        // p6
                        console.log('[p6][xqueue.doComplete out_trade_no, type]', out_trade_no, type);
                        type === 'alipay' && AlipayDb.updateOrderStatusByLoop(out_trade_no, 1);
                        type === 'wxpay' && WxpayDb.updateOrderStatusByLoop(out_trade_no, 1);

                        // 通知
                        event.emit.bind(job)(job.id, 'do complete', job.type)
                    })
                    .catch((err) => {
                        if (err) {
                            throw new Error(err)
                        }
                        unlock()
                    })
            })
        }

        /**
         * 功能: 将事件为finish的任务, 写入数据库, 标记为支付失败
         * */
        function checkFinish() {
            setInterval(function () {
                self.warlock.lock('jobsFinish', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkFinish err]', err);
                        return
                    }

                    if (typeof unlock === 'function') {
                        let redis = self.redis;
                        redis.client.zrangebyscore(redis.getKey('jobs:finish'), 0, Date.now(), 'LIMIT', 0, limit, function (err, ids) {
                            if (err) {
                                return new Error(err)
                            }

                            if (ids.length === 0) {
                                return
                            }

                            ids = ids.map((zid) => {
                                return parseInt(RedisFactory.getIdFromZid(zid))
                            });

                            doFinish({ids, unlock})
                        })
                    }
                })
            }, timeoutFinish)
        }

        function doFinish({ids, unlock}) {
            console.log('[doFinish]');
            ids.forEach(function (id) {
                Job.getJob
                    .call(self, id)
                    .then((job) => {
                        let {type, data} = job;
                        let {out_trade_no} = JSON.parse(data);
                        // PayTest.save({
                        //   out_trade_no,
                        //   tradeStatus: '支付失败',
                        //   type
                        // })
                        // p11
                        console.log('[p11][xqueue.doFinish out_trade_no, type]', out_trade_no, type);
                        type === 'alipay' && AlipayDb.updateOrderStatusByLoop(out_trade_no, 2);
                        type === 'wxpay' && WxpayDb.updateOrderStatusByLoop(out_trade_no, 2);

                        // 通知
                        event.emit.bind(job)(job.id, 'do finish', job.type)
                    })
                    .catch((err) => {
                        if (err) {
                            throw new Error(err)
                        }
                        unlock()
                    })
            })
        }
    }

    /**
     * 功能: 停止队列服务
     *
     * 1.可传参ms: 表示最长等待时间(即等待当前队列中正在进行任务结束的时长)
     * 2.若在此期间没有结束，队列任务将会被标记为失败
     * 3.shuttingDown: 表示任务队列正在停止
     *   (1)stack(位置): xqueue.js & worker.js & job.js
     *   (2)shutdown(ms): 修改shuttingDown的值
     * */
    shutdown(ms) {
        let that = this;
        ms = +ms | 0 || 0;
        /*
        * +一元运算符，如果操作数不是一个数值，会尝试将其转成一个数值
        * |按位或，有去除小数的功能
        * ||逻辑或，默认值为0
        * */
        if (this.shuttingDown) {
            // 表示正在关闭队列服务
        } else {
            this.shuttingDown = true;
            this.redis.shutDown = true; // 设置共享redis的shutDown=true
            setTimeout(function () {
                that.worker.clear();
                this.running = false
            }, ms)
        }
    }

    /**
     * 当前终端队列状态
     * */
    detail() {
        return {
            job_List_Count: map.jobsList.size, // 存在job对象数
            ob_List_Count: map.obList.size, // 存在ob对象数
            schema_List_Count: map.subList.size, // 存在的schema对象数
            shuttingDown: this.shuttingDown, // 队列服务是否正在停止
            shutDown: this._shutDown // 队列服务是否已经停止
        }
    }
}

module.exports = Queue;

/*
* checkSchemaTTL() >>> 过期重建
* >>> queueEvent.js.subscribeSchema() >>> schemaMessage() >>> 通过type，取出schema对象.emit()
* >>> schema.js.on() >>> confirmed() >>> 修改哈希表state状态
* 问题1: 哪里调用了schema.js.on(...)?
* 回答: ontime(){}方法中调用了schema.js.on(...)，但返回的promise并没有resolve(),如何取得id和data(保存在schema对象中)
* 问题2: ontime(){}中没有resolve()
*
* */

/**
 * jobsList/obList/schemaList之间的区别
 * 1.jobList:
 *   (1)工作队列
 *   (2)任务事件
 *   (3)job.js.getJob(): 表示将job实例添加到jobsList集合
 *   (4)job.js.done(): 表示当任务被标记为成功('complete')时,将job实例从jobsList集合删除
 *   (5)worker.js.clear(): 表示清空jobsList集合
 *
 * 2.obList:
 *   (1)发布事件更新时的通知
 *   (2)(事件通知相关,job.emit(event,message)),发送各类的通知给队列或者job实例监听
 *   (3)job.js.save(): 表示obList集合中添加(id,job实例)
 *   (4)xqueue.js.observed(): 表示obList集合中添加(id,job实例)
 *   (5)queueEvent.js.queueMessage().hasObJob(): 表示判断集合中有没有id对应的job实例
 *   (6)queueEvent.js.queueMessage().getObJob(): 表示获取集合中id对应的job实例
 *   (7)worker.js.clear(): 表示清空obList集合
 *
 * 3.schemaList:
 *   (1)定时任务
 * */

/**
 * 在xqueue中，有哪些方法直接/间接的修改了job的状态event(delay,inactive(promotion),active,failed,complete)
 * 1.checkPromotion()功能,满足delay时间的任务,修改该任务事件
 *                        if 'delay' >>> update 'inactive'
 *                        if 'retry' >>> update 'inactive'
 *   checkActiveTTL()功能,满足任务最大生存时间,修改该任务事件
 *                        if job.complete === false >>> update 'failed' + 通知
 *                        if job.complete === true >>> 保持不变
 * 2.另外worker.start()功能: 当q:type:jobs列表中有成员时,修改该任务事件并从q:jobs:type:inactive有序集合中删除
 *                        if 'inactive'>>> update 'active'
 * 3.job.done('complete')功能: 修改该任务状态active>>>complete
 * 4.job.done('failed')功能: 修改该任务状态active>>>failed>>>retry
 *                        if backoff(true/{delay:20000})>>>update 'delayed'
 *                        if backoff(false)>>>update 'inactive'
 *
 * */

/**
 * 哪里调用了getJob(),并且该任务当前事件为'inactive'?
 * (1)两个地方调用了getJob()
 *     a.xqueue.js的checkPromotion()和checkActiveTTL()
 *     b.worker.js的start()>>>getJob()>>>handle.getJob()
 * (2)该任务事件为'inactive',worker.js中的handle.getJob()正好符合这个要求
 *     a.worker.js.start(): 表示原子出栈
 *     b.同时移除/返回列表的第一个成员
 *       同时移除/返回有序集合的第一个成员
 *     c.将该任务事件inactive>>>active
 *       全局就这一个方法能将inactive>>>active
 * */