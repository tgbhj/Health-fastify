const EventEmitter = require('events');
const Job = require('./job');
const Worker = require('./worker');
const event = require('./queueEvent');
const map = require('./map');
const Warlock = require('node-redis-warlock');
const Schema = require('./schema');

class Queue extends EventEmitter {
    constructor(option, RedisClient) {
        super();
        // console.log('[Queue constructor()]')
        // console.log('[option]', option)
        // console.log('[RedisClient]', RedisClient)
        /*
        * option >>> 通过test.js文件查看
        *   option:{
        *     name:'xqueue',
        *     prefix:'q'
        *   }
        * redis >>> redis.js的RedisFactory生成的RedisClient实例
        *       >>> 注意这里仅为RedisFactory实例，并不是node_redis操作对象
        * */
        this.id = [
            option.name, // 传参'xqueue'
            require('os').hostname, // 主机名
            process.pid, // 进程的PID
        ].join(':');
        this.redis = RedisClient; // (分区db:4)
        this.setMaxListeners(10); // EventEmitter设置最大监听器数量10(每个Queue实例最多有10个监听器)
                                 // queue.on(...) × 10
        this.is_observedAllKey = false; // ???
        this.is_observedAllEvent = false; // ???
        // 实例化的时候启动(在Queue实例化时，订阅频道)
        this.subscribeEvent(); // 订阅q:events频道
        this.subscribeSchema(); // 订阅__keyevent@${redis.redisConfig.db}__:expired
                               // 当使用db:4分区时，订阅__keyevent@4__:expired键事件通知
                               // 每当一个键因为过期而被删除时，产生一个 expired 通知
                               // 就会触发这个键事件通知 >>> 实质是键被删除时触发，而非生存时间ttl=0时触发
        this.running = true; // ???
        this.lockClient = null; // redis分布式锁的RedisClient(暂指定为db:5)
        this.warlock = Warlock(this.lockClient = RedisClient.createLockClient()); // redis强化分布式锁
        this.shuttingDown = false; // 是否正在停止队列服务 关闭标志位(jobs.errorEvent()中用到)
        this._shutDown = false; // 是否已经停止队列服务
        this.setupTimers() // 设置定时器(这个方法就很核心了)
    }

    /*
    * 创建队列任务
    *   type:'email1'
    *   data:{name:'zhangsan'}
    * */
    createJob(type, data) {
        // ...
        // console.log('[xqueue.js.createJob()]', this)
        return new Job(type, data, this)
    }

    /*
    * 创建计划任务类schema
    * type,data
    * zzzz,{name:'lisi'}
    * qqqq,{name:'zhanglei'}
    *
    * type:任务分组
    * data:任务数据
    *
    * this.redis >>> 为RedisFactory生成的实例
    * */
    createSchema(type, data) {
        return new Schema(type, data, this.redis)
        // 这个RedisClient对象在实例化的时候，构造函数中调用了createClient()方法
        // 并赋给属性_client，然后通过class类的get client()方法，将_client对象暴露出来
    }

    /*
    * 订阅q:events频道,message,queueMessage()处理函数
    * */
    subscribeEvent() {
        event.subscribeEvent.bind(this)()
        // 使用RedisClient在queueEvent中自己调用了createClient()，没有使用
        // 那这里为什么不直接使用get client()方法返回的client对象，而要自己重新生成一个
    }

    /*
     * 定时任务
     * 订阅__keyevent@4__:expired频道,pmessage,schemaMessage()处理函数
     * 过期触发
     */
    subscribeSchema() {
        event.subscribeSchema.bind(this)()
        // event.subscribeSchema方法中this.redis是由本类的xqueue的this.redis属性决定的
        // 使用RedisClient在queueEvent中自己调用了createClient()，没有使用
    }

    /*
    * 从队列获得任务
    * let job = await queue.process('email1')
    * 通过.process()获得任务
    * 看了下Worker.js代码，不理解其具体功能
    * */
    process(type) {
        let worker = this.worker = new Worker(this, type);
        return worker.start()
    }

    /*
    * 监听
    * qob-all-keys: 监听queue实例的所有任务(所有id)
    * qob-id: 监听queue实例的指定id(1个或多个)
    * */
    observed(...obmsg) {
        /*
        * queue.observed(1,2).on('*')
        * 1. (1,2)为任务id
        * 2. *为监听的事件名称
        * - `enqueue` 任务进入队列
          - `active` 任务已被获取
          - `promotion` 任务从delay状态过渡进入队列
          - `failed` 任务失败
          - `complete` 任务完成
          - `retry` 任务失败并已重试
        * */
        let self = this;
        if (obmsg.length === 1 && obmsg[0] === '*') { // 当传入的obmsg有且只有一个'*'时
            // 监听所有的id
            this.is_observedAllKey = true;
            event.addObJob('qob-all-keys', self)
        } else {
            // 监听指定id(一个或多个)
            obmsg.map((x) => {
                event.addObJob(`qob-${x}`, self)
            })
        }
        return this
    }

    /*
    * 监听定时任务
    * 两种模式
    * 1.'type' --- string --- 只传入类型 --- 监听相同类型的任务
    * 2.{type:'type',only:true} --- object
    * eg: {type:'zzzz',only:true}
    *
    * 使用ontime监听到期通知
    * 当定时到期通知运行时，将返回<promise>对象，可获得id,data
    * */
    ontime(obj) {
        let _type = null;
        let _only = false;
        if (typeof obj === 'object' && obj != null) {
            let {type, only} = obj;
            if (type) _type = type; // type='zzzz'
            if (only) _only = only // only=true
        } else if (obj.only === undefined || obj.only === false) {
            _type = obj
        } else {
            throw new Error('Invalid parameter')
        }

        // 创建新的schema对象
        let schema = new Schema(_type, null, this.redis, this.warlock);
        schema.subType(_only);
        return schema.on('message') // 调用的是schema.js的on()方法，返回一个Promise对象(但没有resolve()也就是返回结果???为什么)
        // super.on('message')，调用父类EventEmitter的on()方法
    }

    /*
    * queue队列监听事件
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

    /*
     * 设置定时器
     */
    async setupTimers() {
        let self = this;
        let lockTtl = 2000; // 2s & warlock给redis上锁的ttl生命周期(生命周期到期后，不在对redis提供锁的保护)
        let timeout = 10000; // 10s & 间隔时间(字面意思和实际意思好像有出入)
        let limit = 500; // 0~500(取500条信息)

        checkPromotion(); // 检查q:jobs:delayed(delay>>>promotion(inactive))
        checkActiveTTL(); // 检查q:jobs:active()
        checkSchemaTTL(); // 检查q:unconfirmed:schema

        /*
        * 1.每隔10s，查询Redis的q:unconfirmed:schema有序集合，符合值的
        * 2.返回所有符合条件的ids数组
        * 3.对ids数组做处理，取出id，并重新放入ids数组，交给recoverAndClear(ids)处理
        * 4.
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

                            // 返回ids = [ '01|1', '01|2', '01|3' ]
                            // 取出其中id
                            // ids = ['1','2','3']
                            ids = ids.map((zid) => {
                                return parseInt(RedisFactory.getIdFromZid(zid))
                            });
                            recoverAndClear(ids)
                        })
                        // 查找q:unconfirmed:schema(有序集合)未执行的定时任务中，查找定时任务时间在100000~当前时间
                        // 因为timeStamp中保存的是定时任务的执行时间
                        // 如果到了定时任务执行时间，那么这个timeStamp必然在100000~当前时间的区间内
                        // LIMIT OFFSET(偏移量) COUNT(返回的数量)
                    }, timeout) // timeout 10s间隔 zrangebyscore一次
                }
            })
        }

        function recoverAndClear(ids) {
            // 按值查询q:unconfirmed:schema符合条件(任务执行时间)的数据记录，返回ids数组
            let redis = self.redis;
            ids.forEach((id) => {
                redis
                    .client // client:class的get client()来获取createClient()创建的node_redis对象
                    .hgetall(redis.getKey('schema', id), (err, schema) => {
                        /*
                        * 情况1:err=null schema=null
                        * 情况2:err=null schema!=null schema.state=unconfirmed
                        * 情况3:err=null schema!=null schema.state=confirmed
                        * */
                        /*
                        * 比如: q:schema:1
                        * 存在: err:null schema:{ttl:...,schedule:...,data:...,state:...,type:...}
                        * 不存在: err:null(并不会报错) schema:null(只是schema返回为null)
                        * */
                        let stringKey = redis.getKey('schemas', schema.type, id, JSON.stringify(schema.data));
                        /*
                        * stringKey对应schema.js中保存方法save()
                        * .set(stringKey,1)
                        * .expire(stringKey,ttl) // ttl单位为秒(s)
                        * */
                        if (schema.state === 'unconfirmed') {
                            // 情况2
                            // 重新创建，立即过期???
                            /*
                            * 1.schedule: 定时任务开始执行的时间
                            * 2.schedule + ttl: 设定任务最大完成耗时
                            * 3.schedule + ttl + timeout: ???理解不了
                            * 4.schedule + ttl + timeout + lockTtl: ???到底是什么意思
                            * */
                            if (parseInt(schema.schedule) + parseInt(schema.ttl) + timeout + lockTtl < Date.now()) {
                                // ttl吃满: 假设我们任务耗时吃满 === 设定的最大完成耗时
                                // timeout吃满: 假设我们任务延迟了一次(在第一次符合条件时，在500之外，可能是501或502...)
                                // lockTtl吃满: 假设有另一个Queue实例在创建时，也调用了setupTimers()方法 >>> 也调用了checkSchemaTTL()方法
                                // 此时，warlock会锁redis对象，它们用的key相同，需要等待上一个warlock对key解锁后，才能使用key来继续对redis对象上锁
                                // 测试结果: Warlock上锁是否有效，和key有关，和Warlock(RedisClient)中的RedisClient无关

                                // 也就是这个定时任务所有耗时加在一起 >>> 最大耗时 < Date.now()
                                // 那么，我们将任务重新创建并立即过期
                                /*
                                * 任务指: set(stringKey,1) --- 在schema.js的save()中设置
                                *        expire(stringKey,0) --- 设置过期时间为0，表示立即过期 >>> 触发subscribeSchema()方法，在Queue构造函数中，默认触发
                                * */
                                redis.client
                                    .multi()
                                    .set(stringKey, 1)
                                    .expire(stringKey, 1) // 原expire(stringKey,0)
                                    .exec(function (err) {
                                        if (err) {
                                            throw new Error(err)
                                        }
                                    })
                                // 测试手动过期，会触发什么 >>> msg = q:schemas:zzzz:4:{"name":"lisi"} >>> 然后继续做处理
                            }
                        } else {
                            // 情况1 直接忽略
                            // 情况3
                            if (schema.state === 'confirmed' && (parseInt(schema.schedule) + parseInt(schema.ttl) < Date.now())) {
                                // 定时任务状态为confirmed已经完成
                                // 清除
                                let multi = redis.client.multi();
                                multi
                                    .del(redis.getKey('schema', id)) // 删除q:schema:1整个集合
                                    .zrem(redis.getKey('unconfirmed', 'schema'), RedisFactory.createZid(id)) // 从未完成集合中删除
                                    .exec((err) => {
                                        if (err) {
                                            throw new Error(err)
                                        }
                                    })
                            }
                        }
                    })
            })
        }

        /*
        * 检查q:jobs:delayed
        * */
        function checkPromotion() {
            setInterval(function () {
                // q:jobs:delayed
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
                                if (err) { // 表示在任务执行的延时时间，在不在这个范围内
                                    return new Error(err)
                                }

                                if (ids.length === 0) {
                                    return
                                }

                                // 将ids数组中的zid>>>id，并放到原数组中
                                ids = ids.map((zid) => {
                                    return parseInt(RedisFactory.getIdFromZid(zid))
                                });

                                doPromote({ids, unlock})
                            })
                    }
                })
            }, timeout)
        }

        /*
        * checkPromotion()具体处理方法
        * ids: 符合条件的id数组(非zid)
        * unlock: 完成处理后的解锁函数
        *
        * 功能: 对符合要求的q:job:id，取出其中的id，依据它们的状态(在这里是'delay')，更新状态(这里是delay>>>inactive)
        *       并发出通知
        * */
        function doPromote({ids, unlock}) {
            // 如果有任务id在这个范围内，这里做处理
            ids.forEach(function (id) {
                Job.getJob.call(self, id) // Job.js let worker = this(self)
                    .then((job) => {
                        // 发出通知(虽然调用getJob()&state='delay',也会更新job.state('inactive')>>>toInactive()也会发出通知)
                        event.emit.bind(job)(job.id, 'promotion', job.type, {promote_at: Date.now()})
                        // bind(job): 表示在queueEvent.js的emit()，有用到this.redis，this===job
                    })
                    .catch((err) => {
                        console.log('[doPromote err]', err);
                        // if (err) {
                        //   throw new Error(err)
                        // }
                        unlock() // 解锁warlock
                    })
                // call(self,id)表示执行Job.getJob()方法，并且getJob()方法中的this>>>self，id表示传递到getJob(id)的参数
                // getJob()作用是根据id，查询q:job:id，然后判断任务状态(delay,inactive或其他)，来手动更新到下一个状态
            })
        }

        function checkActiveTTL() {
            setInterval(function () {
                // q:jobs:active
                self.warlock.lock('activeJobsTTL', lockTtl, function (err, unlock) {
                    if (err) {
                        console.log('[checkActive err]', err);
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

        /*
        * checkActiveTTL()具体处理方法
        * q:jobs:active: 表示当前符合0~Date.now()的任务的状态一定是active
        * 而只有state=delay，retry，inactive>>>会修改状态
        * 所以，getJob(id)后，取出的state=active，不会修改状态
        * */
        function removeTTLJobs({ids, unlock}) {
            ids.forEach(function (id) {
                Job.getJob.call(self, id)
                    .then((job) => {
                        let err = 'ttl exceed'; // 错误信息:ttl超时
                        let stack = null; // 错误位置
                        // _toFailed() & _toComplete()从q:jobs:active中删除对应id
                        // _toActive()添加q:jobs:active
                        // zrangebyscore获取到的id是既没标记成功，也没标记失败，在这里标记超时
                        if (!job.complete) {
                            // 超时，我们将当前任务标记为失败
                            job.state('failed', {err, stack});
                            // 发送通知
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
    }

    /*
    * 停止队列服务，参数ms可以执行最长等待时间
    * 即等待当前队列中正在进行任务结束的时长，
    * 若在此期间没有结束，队列任务将会被标记为失败
    * */
    shutdown(ms) {
        // ... 未完成
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
            this.redis.shutDown = true;
            setTimeout(function () {
                that.worker.clear();
                this.running = false
            }, ms)
        }
    }

    /*
    * 当前终端队列状态预览: 一定情况反映了终端的内存使用状态
    * */
    detail() {
        return {
            job_List_Count: map.jobsList.size, // 存在job对象数
            ob_List_Count: map.obList.size, // 存在ob对象数
            schema_List_Count: map.subList.size, // 存在的schema对象数
            shuttingDown: this.shuttingDown, // 正在停止???
            shutDown: this._shutDown // 停止???
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

/*
* queue.createJob()和queue.createSchema()中的redis对象(RedisClient对象，RedisFactory生成的实例)
* */

/*
* queue.observed(1,2).on('*')
* 1. (1,2) 监听id
* 2. * 监听对象
*
* case 1:
* event.addObJob('qob-1',queue实例)
* event.addObJob('qob-2',queue实例)
*
* case 2:
* event.addObJob('qob-all-keys',queue实例)
*
*
* queueEvent.js
* 1.queueMessage()
* (1) job的监听/触发
*     job.emit(event,message)
*     event: 'delay' '' '' ''
*     message: { id: '1', event: 'retry',type: 'email1', retry_at: 1528269758231,delay: 200000,args: []}
*     先发出一个job的EventEmitter
*     用job.on(...){...}来监听
*     job1.on('enqueue').then(data=>{
*         console.log(data)
*     })
*
* (2) xqueue的监听/触发
*     查询'qob-all-keys'是否存在 & 当有人调用了queue.observed(){}时，就会存在
*     存在: xqueue实例.emit('*',message)
*     不存在: xqueue实例.emit('delay',message)
*     发出一个xqueue的EventEmitter
*     用xqueue.on(...){...}来监听
*
*
*     查询'qob-id'
*
* 2.为什么_toDelay()没有返回值?
* (1) 在state(state,data)中调用了哪几个方法?
*
*     _toFailed()   没有返回值        this._toFailed(this)            event='failed' 任务失败
*     _toComplete() 没有返回值        this._toComplete(this)          event='complete' 任务完成
*     _toActive()   返回Promise      job = this._toActive(this)      event='active' 任务已被获取
*     _toDelay()    没有返回值        job = this._toDelay(this)       event='delay'
*     _toInactive() 返回Promise      job = this._toInactive(this)    event='promotion' 任务从delay状态过渡进入队列
*     _toRetry()    有返回(不清楚内容) job = this._toRetry(this)       event='retry' 任务失败并已重试
*     _inactiveState() 返回Promise   job = this._inactiveState(this) event='enqueue' 任务进入队列
*
*     监听的事件有哪些?
*     - `enqueue` 任务进入队列
*     - `active` 任务已被获取
*     - `promotion` 任务从delay状态过渡进入队列
*     - `failed` 任务失败
*     - `complete` 任务完成
*     - `retry` 任务失败并已重试
*     - `TTL exceed` 任务超时(既没有标记成功，也没有标记失败，超时标记)>>>this.state('failed',{err,stack})>>>用`failed`可以监听到
*
*     可见，并没有job.on('delay')
*
*  (2)两个问题
*
*  问题1：因为this.state('delay') >>> _toDelay()没有返回值
*
*  delay返回job = this._toDelay(this)，会导致返回的job=null，这样不会有问题吗?
*
*  回答： 在save()中，除了最后一个return this，表示返回this(job实例)
*        其他的return的功能仅仅表示流程上的判断和走向
*        所以，return this.state('delay')不是真正的返回值，而是表示流程上的判断(不执行后面的代码this.state('inactive'))
*
*  问题2：on()方法返回的并不是Promise对象，为什么可以链式调用then()方法
*  job.on('enqueue').then(res=>{console.log(res)})
*
*  感觉这里有问题，是不是要模仿xqueue的on()方法 & 还是说返回的是xqueue的实例
*
* */

/*
* 任务行为事件监听 & 它可以分为2个部分
* 基于queueEvent.js.queueMessage()
* 首先，明白一个流程:
* 调用job.js中的任意一个方法，如果其中包含this.state(event事件名) >>> state(state,data)方法 >>> 触发对应的方法
* 比如:
* failed事件 --- toFailed()
* complete事件 --- toComplete()事件
* active事件 --- toActive()事件
* delay事件 --- toDelay()事件
* inactive事件 --- toInactive()事件
* retry事件 --- toRetry()事件
*
* >>> event.emit(this.id,event事件名称,type分组)
* >>> queueEvent.emit()
* >>> queueEvent.subscribeEvent()
* >>> queueEvent.queueMessage()
* >>> 分为2部分
* >>> 先查询job实例部分
* >>> 再查询queue实例部分
*
* 1.job.js job实例的监听 & job.emit('enqueue',message) & job.on('enqueue').then(...)
* 当每次调用let job1 = queue.createJob().delay(1000)save()时
* (1)它返回的是一个job实例
* (2)它每次save()都会调用this.state(event事件名称) >>> 最终触发queueMessage()方法
* (3)比如，在save()后的某一时间段，调用this.state(event,data)，用于修改this._state状态
* >>> queueMessage()取出对应id的job实例，用这个job实例emit(event修改的事件)
* >>> 然后用job1去监听job1.on('enqueue').then(...)自然能监听到
* >>> 这个流程应该没问题
*
*
* 2.xqueue.js queue实例的队列监听 &
*   (1)queue.observed(1,2).on('*').then(...)
*   (2)queue.observed(1,2).on('enqueue').then(...)
*   (3)queue.observed('*').on('*').then(...)
*   (4)queue.observed('*').on('enqueue').then(...)
*
*   (1) (1,2) >>> 转换成 >>> 数组[1,2] >>> event.addObJob(`qob-${x}`,self)
*   意思是添加(qob-1,queue实例)和(qob-2,queue实例)到obList集合中
*   此时，当q:job:1的某个状态更新，调用了this.state(state,data)方法 >>> event.emit(id,event,type)
*   >>> queueMessage()
*   >>> 第1步，必然是先查询id对应的job实例，由job实例emit(event,message) // 这个是用job实例来监听的
*   >>> 第2步，查询id对应的queue实例，比如，你传入的id是1,那么就查询qob-1
*                                      你传入的id是2,那么就查询qob-2
*       如果有(qob-id)，继续往下，
*       通过is_observedAllEvent来判断，如果为true，那么对id=1的任务，你要监听他所有的事件(enqueue、active、inactive)
*       我可以监听id=1任务的所有事件
*       queue.observed(1,2).on('*')
*       如果为false，那么对id=1的任务，监听传入参数event，例如
*       this.state('enqueue')，我就可以这么写
*       queue.observed(1).on('enqueue').then(...)
*       this.state('active')
*       queue.observed(1).on('active').then(...)
*
*       如果没有(qob-id)，直接跳过，执行下面的语句
*
*  (2) queue.observed('*').on('enqueue').then(...)
*  当传入'*'时，会走向另一个判断
*  is_observedAllKey = true
*  意思是添加qob-all-key到obList中去，表示监听所有任务id
*  此时，q:job:1的某个状态更新，调用了this.state(state,data)方法 >>> event.emit(id,event,type)
*  >>> queueMessage()
*  >>> 第1步，先查询id对应的job实例，有job实例emit(event,message) // 这个是用job实例来监听的
*  >>> 第2步，查询obList中是否含有qob-all-keys
*  如果有(qob-all-key)，继续往下执行
*  在observed()中，event.addObJob('qob-all-key',self)
*  此时，当q:job:1的某个状态更新，调用了this.state(state,data)方法 >>> event.emit(id,event,type)
*  >>> queueMessage()
*  >>> 第1步，查询id对应的job实例，用job实例来监听某个event事件
*  >>> 第2步，检查是否有'qob-all-keys'，
*  如果有，判断is_observedAllKey，表示是否监听所有Key
*  如果为true，
*  如果为false，
*
*  如果没有(qob-all-key)，则跳过，执行下面的语句
*
*  总结:测试下来，感觉queue.observed(...).on(...)有很多bug，不好用
* */

/*
* checkPromotion():　检查所有任务中，状态为delay的，且符合条件(延迟执行时间已到)的任务
*
* 语句１: redis.client.zrangebyscore(redis.getKey('jobs:delayed'), 0, Date.now(), 'LIMIT', 0, limit, function(err,ids){...})
* 作用: 查询q:jobs:delayed有序集合中，分数值在(0~当前时间)范围内的成员
* 集合名称: q:jobs:delayed的解释
* 1. queue.createJob().delay(5000).save()
* 2. 当设置了delay(5000)>>>this._delay=5000
* 3. 在save()的时候，会调用this.state('delay')>>>state(state,data)>>>_toDelay()
* 4. _toDelay()中，有代码
* zadd q:jobs:delayed (延迟时间+当前时间) zid
* zadd q:jobs:email1:delayed priority zid
* 5. q:jobs:delayed表示在延迟有序集合中的任务id
* 6. delayed的下一步将是变成inactive(promotion)>>>符合checkPromotion()这一方法的命名
* */

/*
* 疑问:
* 1.this.shuttingDown: 出现位置xqueue.js worker.js job.js
* 2.this._shutDown
* 3.jobsList/obList/schemaList
* 4.完成process()和shutDown()方法
* 5.完成Worker.js
* 6.在xqueue中，有哪些方法直接/间接的修改了job的状态event(delay,inactive(promotion),active,failed,complete)
* */