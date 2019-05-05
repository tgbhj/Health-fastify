const RedisFactory = require('./redis');
const EventEmitter = require('events');
const event = require('./queueEvent');
const priorities = {low: 10, normal: 0, medium: -5, high: -10, critical: -15};
const map = require('./map');

// const {alipay, twxpay} = require('../../../pay/') // 用于调用支付查询订单接口

class Job extends EventEmitter {
    constructor(type, data, queue) {
        super();
        /*
        * type:'email1'
        * data:{name:'zhangsan'}
        * queue:Queue类的实例,queue.createJob()
        * */
        this.type = type;
        this.data = data || {};
        this.queue = queue;
        // this.redis = queue.redis // RedisClient ??? 问题出在这里
        this.redis = queue ? queue.redis : null; // 修改后代码
        this._priority = 0; // 优先级
        this._state = null; // 当前任务的状态(6种)
        this.id = null; // q:job:id(自增长，和schema定时任务共用)
        this.max_attempts = null; // 最大尝试次数
        this.setMaxListeners(10); // 设置EventEmitter的监听器数量
        this._delay = 0; // 延迟时间(传入时，传入2种方式: 1.延时时间 2.延时后的真实时间(延时时间=延时后的真实时间-当前时间))
        this.args = null; // ???
        this._ttl = 0 || 5000; // 任务生存时间
        this._attempts = 0; // 已尝试次数
        this.remaining = null; // 剩余尝试次数
        this._backoff = false; // 任务失败，补偿参数 & _toRetry()
        this.complete = false; // 完成状态(true:已完成，false:没有完成)
        this.finish = false; // 任务完结(任务失败, 无剩余重试次数)
        this.created_at = null; // save()中用到，q:job:id的创建时间
        this.exceed_at = null; // 任务过期时间
        this.shutdown = false; // worker.js.clear()>>>jobsList.job.shutDown
        this.errorEvent(); // EventEmitter错误事件监听
        this.cancel_order = false // 是否执行取消订单(true: 可以取消订单， false: 不可以取消订单)
        // this.updated_at // 更新时间 & 代码中用到，但这个属性没有在constructor中声明
        // this.complete_at // 任务完成时间
        // this._state // 任务状态
    }

    // queue.createJob('email1',{name:'zhangsan'}).ttl(1000).delay(5000).attempts(3).save()

    /*
    * 当job实例发生错误时，会触发一个'error'事件
    * 如果EventEmitter没有为'error'注册事件监听器 & 当error事件触发时，Nodejs会崩溃
    * */
    errorEvent() {
        super.on('error', err => { // 调用父类的on()
            if (this.queue.shuttingDown === false) {
                // 如果不是正常关闭的，抛出错误
                throw new Error(err)
            } else {
                // 如果是因为正常关闭的，不做任何处理，直接返回

            }
        }) // 绑定当前实例Job
        // === Es6规定，在子类的普通方法中，通过super调用父类的方法时，方法内部的实例指向当前子类的实例
    }

    ttl(ms) {
        this._ttl = +ms | 0 || 0;
        /*
        * +一元运算符: 如果操作数不是一个数值，会尝试将其转换成一个数值
        * |: 按位或，有去除小数的功能
        * ||: 逻辑或，取默认值0
        * */
        return this // 为了能够实现链式写法
    }

    /*
    * EventEmitter监听事件
    * 1.job实例.emit(...) & queueEvent.js的queueMessage()中发出
    * 2.job实例.on(...)
    * */
    // on(event, callback) {
    //   super.on(event, function (msg) {
    //     callback(msg)
    //   })
    // }

    // 根据xqueue的on()方法改写
    on(event) {
        console.log('[job.js.on()方法]');
        return new Promise((resolve) => {
            super.on(event, function (msg) {
                // resolve(msg)
                // console.log('[job.js.super.on()]')
                resolve(msg)
            })
        })
    }

    /*
    * 最大尝试次数
    * */
    attempts(num) {
        num = +num | 0 || 1;
        /*
        * +一元运算符，如果操作数不是一个数值，会尝试将其转成一个数值
        * | 按位或，有去除小数的功能
        * || 逻辑或，取默认值0
        * */
        this.max_attempts = num;
        return this // 为了能够实现链式写法
    }

    /*
    * 任务失败重试 & .backoff()设定，允许在重试时包含补偿时间，相当于进入delay状态
    * let job=await queue.createJob('email1',{name:'zhangsan'}).priority('high').delay(1000).backoff({delay:2000}).save()
    * case 1: 当.backoff({delay:2000})存在时，delay设定的延时将被替代
    * case 2: 当.backoff(true)时，默认使用delay作为补偿值
    * case 3: 当.backoff(false)时，将无视所有补偿值，立即重试任务
    * */
    backoff(backoff) {
        this._backoff = backoff;
        return this // 为了实现链式写法
    }

    /*
    * 返回一个promise对象
    * */
    async save() {
        // get id
        /*
        * 存在问题
        * 1.super.emit('error',err) >>> 报错: ReferenceError: .this_function is not defined
        * 2.super.on('error',...) >>> 无法监听到super.emit(...)发出的错误事件
        * */
        let id = await new Promise((resolve, reject) => { // 使用了await,具有阻塞的功能
            this.redis.client.incr('ids', (err, id) => {    // 这个err到底是不是错误类型(可以用有序集合的命令，在书写时少传一个参数，观察err的类型)
                (!err)
                    ? resolve(id)
                    : reject(new Error(err))
            })
        }).catch((err) => {
            return super.emit('error', err)
            /*
             * 在v7.6.0，运行正常
             * 在v8.0.0，会报错，会将super.emit('error')也认为是一个错误没有处理(还没有找到解决方法)
             */
        });

        /*
        * 1.先执行同步任务
        * 2.再执行异步任务
        * */

        /*
        * q:job:id中属性
        * 1.created_at
        * 2.priority
        * 3.max_attempts
        * 4.attempts
        * 5.data
        * 6.ttl
        * 7.delay
        * 8.type
        * 9.updated_at
        * 10.state 任务状态
        * 11.info _toComplete() & 标记complete信息 & 结合this.done()和文档来看
        * 12.complete_at 任务完成时间
        * 13.failed_at 任务失败时间
        * 14.stack 堆栈 & done()传入参数，错误位置 & _toComplete()和_toFailed()中用到
        * 15.error 错误信息 & done()传入参数，错误信息 & _toComplete()和_toFailed()中用到
        * 16.finish_at 任务完成时间(任务失败,不再重试,支付失败)
        * */

        // setIntoJob
        let object = await new Promise((resolve, reject) => {
            this.id = id;
            let multi = this.redis.client.multi();
            let hkey = this.redis.getKey('job', this.id); // q:job:id
            this.created_at = Date.now();
            // console.log('[job.js.async save() backoff]', this._backoff)

            multi
                .hset(hkey, 'created_at', Date.now()) // 任务创建时间
                .hset(hkey, 'priority', this._priority) // 优先级(默认值0)
                .hset(hkey, 'max_attempts', this.max_attempts || 3) // 最大尝试次数(默认值3)
                .hset(hkey, 'attempts', this._attempts) // 已尝试次数(默认值0)
                .hset(hkey, 'data', JSON.stringify(this.data)) // 任务数据(参数传入，非空)
                .hset(hkey, 'ttl', this._ttl || 0) // 任务生存时间(默认值5000)
                .hset(hkey, 'delay', this._delay || 0) // 延迟(默认值0)
                .hset(hkey, 'type', this.type) // 任务分组(参数传入，非空)
                .hset(hkey, 'backoff', JSON.stringify(this._backoff)) // 任务失败补偿
                .exec((err, effectNum) => {
                    if (err) {
                        return super.emit('error', err) // 同样有v7.6.0和v8.0.0的版本问题
                    }
                    return resolve(effectNum) //  >>> object值
                    // 当第一次往q:job:id中插入这些值时，返回一个数组[1,1,1,1,1,1,1,1]
                    // 当第二次往q:job:id中插入这些值时，返回一个数组[0,0,0,0,0,0,0,0]
                });

            // 同步任务
            this.addTypes(); // 向q:job:types集合(普通集合)中添加email1(分组)
            this.addIntoJobs(); // 向q:jobs集合(有序集合中)中添加 优先级(score) zid(value)
            event.addObJob(this.id, this); // 往ObList.set(this.id,job实例)
            // console.log('[save().this._delay]', this._delay)
            if (this._delay !== 0) { // 如果有设置了delay延迟值
                return this.state('delay')// 修改delay状态，包含2部分: 1.修改q:job:id下的state为'delay' 2.修改q:job:id下的delay为this._delay(if判断通过表示this._delay已经有赋值了)
                // return表示立即结束new Promise((resolve,reject){...})
            }
            // 如果没有设置delay(延迟属性)
            this._state = this._state || 'inactive'; // 赋任务初始状态inactive
            this.state('inactive')
        });

        return this
        /*
        * return
        * 除了最后一个return this，返回this(job)实例
        * 其他的return的功能，仅仅表示流程上的判断和走向
        * */
    }

    /*
    * 1.先执行同步任务
    * 2.再执行异步任务
    * */

    /*
    * 优先级
    * queue.createJob('email1',{name:'zhangsan'}).priority('high').save()
    * */
    priority(level) {
        this._priority = priorities[level];
        if (this.id) { // 如果id已经生成，修改priority时
            this.setJob('priority', this._priority);
            this.setJob('updated_at', Date.now()) // updated_at:任务修改时间
        }
        return this // 为了实现链式写法
    }

    /*
    * q:job:id
    * */
    setJob(key, value) {
        this.redis.client
            .hset(this.redis.getKey('job', true) + this.id, key, JSON.stringify(value))
    }

    /*
    * 暂时没用到 & 可以用setJob()方法代替
    * */
    setType(key, value) {
        this.redis.client
            .hset(this.redis.getKey('job', true) + this.id, key, value.toString())
    }

    // 搞错了 true表示最后一个':'要还是不要 并不是q:job:true(错啦)

    /*
    * 1.有序集合 zadd myset 1 hello
    *           zadd key_name score value
    * 2.集合    sadd myset hello
    *           sadd key_name value
    *           查询: sscan key 0
    *                sscan q:job:types 0 查看所有
    * 往q:job:types集合中添加类型
    * */
    addTypes() {
        this.redis.client
            .sadd(this.redis.getKey('job', true) + 'types', this.type, (err) => { // 集合q:job:types email1
                if (err) {
                    return super.emit('error', new Error(err))
                }
            })
    }

    /*
    * 往q:jobs有序集合中添加
    * zadd('q:jobs',priority,'01|1') // 优先级 任务id(自动生成)
    * */
    addIntoJobs() {
        this.redis.client
            .zadd(this.redis.getKey('jobs', false), this._priority, this.getZid(), (err) => { // 有序集合q:jobs
                if (err) {
                    return super.emit('error', new Error(err))
                }
            })
    }

    /*
    * 封装方法: createZid()
    * */
    getZid() {
        return RedisFactory.createZid(this.id) // '01|1'
    }

    /*
    * q:job:id save() hset
    * q:job:types email1 sadd
    * q:jobs priority '01|1' zadd
    * q:jobs:delayed 延迟后任务执行时间 zid zadd
    * q:jobs:email1:delayed priority(优先级) zid zadd
    * */

    /*
    * date = new Date() >>> 2018-06-04T03:26:33.387Z Date
    * new Date(date) >>> 2018-06-04T03:26:33.387Z Date
    * isFinite(有限数字或可以转成有限数字): true
    * isFinite(非数字NaN或无穷大/无穷小): false
    *
    * this._delay = '延迟时间'
    * */
    delay(sec) {
        if (typeof sec === 'number') {
            this._delay = sec
        } else {
            if (!isDate()) {
                throw new Error(`Date Invalid: ${sec}`)
            }
            this._delay = sec.getTime() - Date.now()
        }

        function isDate() {
            let date = new Date(sec);
            return isFinite(date.getTime() && Date.now() < date.getTime())
        }

        return this // 为了实现链式写法
    }

    /*
    * 修改state状态
    * 1.save() 修改state('delay')状态
    * */
    async state(state, data) {
        if (arguments.length === 0 && !this._state) { // 第一次调用state()
            return this._state
        }
        let oldState = this._state; // 旧状态(当前状态)赋给当前变量oldState
        this._state = state; // 新状态，this._state被赋予新的状态
        /*
        * 此时,
        * oldState: 旧状态
        * this._state = state: 新状态
        * */
        let job = null;
        if (this._state === null) { // 调用时，this.state(null,{...})
            this._state = 'inactive'  // 如果只传入数据时，默认传入的新状态为'inactive'
        }
        if (oldState !== this._state) { // 如果旧状态和新状态不一样
            // change state
            if (this._state === 'failed') { // 如果新状态为'failed'，传入data参数
                this._toFailed(data)
            }
            if (this._state === 'complete') { // 如果新状态为'complete'，传入data参数
                this._toComplete(data)
            }
            if (this._state === 'active') {
                job = this._toActive(this)
            }
            if (this._state === 'delay') {
                job = this._toDelay(this)
            }
            if (this._state === 'inactive') {
                job = this._toInactive(this)
            }
            if (this._state === 'retry') {
                job = this._toRetry(this)
            }
            if (this._state === 'finish') {
                job = this._toFinish(data)
            }
            if (this._state === 'save') {
                this._toSave(data)
            }
        } else {
            if (this._state === 'inactive') { // 如果旧状态===新状态 && 新状态==='inactive'
                job = this._inactiveState(this)
            }
        }

        // 修改updated_at
        let updated = new Promise((resolve, reject) => {
            this.redis.client
                .hset(this.redis.getKey('job', this.id), 'updated_at', Date.now(), function (err, effectNum) {
                    resolve(effectNum) // 成功返回[0]
                })
        });

        await updated; // 异步阻塞，会等待异步得到结果并改变状态为resolve()
        return job
    }

    /*
    * 根据id来查询对应的job实例(可以不是当前的id)
    * 注意: 这是静态方法
    * Xqueue.js.doPromote(): Job.getJob(self,id)>>>self表示Xqueue的this
    * 以此类推: let worker=this，this>>>指向具体调用getJob()方法的类
    * */
    static getJob(id) {
        let worker = this; // this,非本类实例的this
        // console.log('[job.js.getJob().worker]', worker)
        return new Promise((resolve, reject) => {
            let job = new Job();
            job.redis = worker.redis;
            job.id = parseInt(id);
            // 加入workmap
            // 第一次: 添加到jobsMap集合
            // 第二次: id不变>>>理解为更新key=id的map集合
            map.addInWorkMap(job.id, job);
            worker.redis.client.hgetall(worker.redis.getKey('job', job.id, false), (err, hash) => {
                job.type = hash.type;
                job._ttl = hash.ttl || 0;
                job._priority = hash.priority;
                job._state = hash.state;
                job.created_at = hash.created_at;
                job.data = hash.data;
                job.updated_at = hash.updated_at;
                job.max_attempts = hash.max_attempts;
                job._attempts = hash.attempts || 1;
                job._backoff = hash.backoff || false;
                if (hash.delay) {
                    job._delay = hash.delay
                }

                // 自己新加代码，xqueue.js.removeTTLJobs()中用来判断(需要job.complete这个属性)
                if (hash.complete) {
                    job.complete = hash.complete
                }

                // delay
                if (hash.state === 'delay') {
                    // 更新状态delay>>>inactive(promotion)
                    job.state('inactive')
                        .then(job => {
                            return resolve(job)
                        })
                        .catch(err => {
                            return super.emit('error', new Error(err))
                        })
                }

                // retry
                if (hash.state === 'retry') {
                    // 更新状态retry>>>inactive
                    job.state('inactive')
                        .then(job => {
                            return resolve(job)
                        })
                        .catch(err => {
                            return super.emit('error', new Error(err))
                        })
                }

                // inactive
                if (hash.state === 'inactive') {
                    // 更新状态inactive>>>active
                    job.state('active')
                        .then(job => {
                            return resolve(job)
                        })
                        .catch(err => {
                            return super.emit('error', new Error(err))
                        })
                }

                // complete
                if (hash.state === 'complete') {
                    // 更新状态complete>>>saved
                    // 保存后, 立即从q:jobs:complete和q:jobs:type:complete中删除, 避免重复保存\
                    job.state('save', 'complete')
                        .then(job => {
                            return resolve(job)
                        })
                        .catch(err => {
                            return super.emit('error', new Error(err))
                        })
                }

                if (hash.state === 'finish') {
                    job.state('save', 'finish')
                        .then(job => {
                            return resolve(job)
                        })
                        .catch(err => {
                            return super.emit('error', new Error(err))
                        })
                }

                return resolve(job)
            })
        })
    }

    /**
     * 功能: 通过id，查询job实例
     * 1.queuePay.index中用到
     * */
    static getJobInfo(id) {
        let worker = this;
        return new Promise((resolve, reject) => {
            let job = new Job();
            job.redis = worker.redis;
            job.id = parseInt(id);
            worker.redis.client.hgetall(worker.redis.getKey('job', job.id, false), (err, hash) => {
                job.type = hash.type;
                job._ttl = hash.ttl || 0;
                job._priority = hash.priority;
                job._state = hash.state;
                job.created_at = hash.created_at;
                job.data = hash.data;
                job.updated_at = hash.updated_at;
                job.max_attempts = hash.max_attempts;
                job._attempts = hash.attempts || 1;
                job._backoff = hash.backoff || false;

                if (hash.delay) {
                    job._delay = hash.delay
                }

                if (hash.complete) {
                    job.complete = hash.complete
                }

                return resolve(job)
            })
        })
    }

    /***
     * 功能: 返回out_trade_no, 用于轮询
     * @param id
     * @returns {Promise<any>}
     */
    static getJobProcess(id) {
        let worker = this;
        return new Promise((resolve, reject) => {
            let job = new Job();
            job.redis = worker.redis;
            job.id = parseInt(id);
            worker.redis.client.hgetall(worker.redis.getKey('job', job.id, false), (err, hash) => {
                return resolve(worker.process(hash.type))
            })
        })
    }

    /*
    * let job = await queue.process('email1') >>> 通过process获得任务
    * (1)job.done('email1 complete')
    * 通过job.done(err|info)来返回任务执行结果
    * 当传入Error对象，此任务被标记为failed
    * 当传入其他参数，此任务被标记为complete
    * (2)job.Json() >>> 返回任务信息的更多细节
    * */
    done(msg) {
        let getKey = this.redis.getKey.bind(this.redis);
        let multi = this.redis.client.multi();
        let {stack, err} = msg; // stack:表示错误位置 err:表示错误信息

        if (err instanceof Error) {
            this.state('failed', {err, stack})
        }

        if ((msg instanceof Error) === false || msg === undefined) {
            this.state('complete', msg);
            map.deleteFromWorkMap(this.id) // 从jobsList中删除id ??? 关注下
        }
    }

    /*
    * 获取任务信息的更多细节
    * -`data`           任务数据
      -`type`           任务分组
      -`priority`       优先级
      -`ttl`            任务生存时间 (从被获取到相应的最大时间)
      -`state`          任务状态
      -`max_attempts`   最大尝试次数
      -`created_at`     任务创建时间
      -`updated_at`      任务修改时间
      -`attempts`       已经尝试次数
      -`backoff`        backoff参数细节
      -`remaning`      剩余重试次数
    * */
    Json() {
        const _json = {
            data: this.data, // 任务数据
            type: this.type, // 任务分组
            priority: this._priority,
            ttl: this._ttl,
            state: this._state,
            max_attempts: this.max_attempts,
            created_at: this.created_at,
            updated_at: this.updated_at || this.created_at,
            attempts: this._attempts,
            backoff: this._backoff,
        };

        if (this.remaining !== null) {
            _json['remaining'] = this.remaining
        }

        return _json
    }

    /*
    * active >>> complete任务完成
    * */
    _toComplete(data) {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis); // this.redis.getKey()方法中的this使用当前job实例的redis
        let hkey = getKey('job', this.id, false);
        let self = this;
        // zrank memeber key >>> 返回有序集合中指定成员的排名
        multi
            .zrank(getKey('jobs', this.type, 'active'), this.getZid()) // getZid()为Job类的方法，对this.id进行封装的方法
            .exec((err, num) => {
                if (num[0] === null) {
                    return
                }
                // zrank查询 >>> 为了检查当前zid是否在q:jobs:email1:active中存在
                multi
                    .hset(hkey, 'state', 'complete')
                    .hset(hkey, 'updated_at', Date.now())
                    .hset(hkey, 'info', data || 0) // info >>> 标记为complete & 结合this.done()和文档来看
                    .hset(hkey, 'complete_at', Date.now()) // 设置任务完成时间
                    .hdel(hkey, 'failed_at', 'stack', 'error') // 删除任务失败时间/堆栈(done()错误位置)/错误信息(done()错误具体信息)
                    .zrem(getKey('jobs', this.type, 'active'), this.getZid()) // 删除q:jobs:email1:active
                    .zrem(getKey('jobs', 'active'), this.getZid()) // 删除q:jobs:active
                    .zadd(getKey('jobs', this.type, 'complete'), this._priority, this.getZid())
                    .zadd(getKey('jobs', 'complete'), this._priority, this.getZid())
                    .exec((err) => {
                        if (err) {
                            return super.emit('error', new Error(err)) // 自己加上了return
                        }
                        self.complete = true; // 标记为true(xqueue.js.removeTTLJobs中用来判断)
                        event.emit.bind(this)(this.id, 'complete', this.type)
                    })
            })
    }

    /*
    * active >>> failed(任务失败)
    * 将错误信息添加到日志 >>> q:job:id:log
    * */
    _toFailed(data) {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis); // getKey的this>>>job实例的this.redis
        let {stack, err} = data;
        let hkey = getKey('job', this.id, false);

        // 集合不能出现重复数据
        multi
            .hset(hkey, 'error', err) // 错误信息
            .hset(hkey, 'stack', stack || 0) // 错误位置
            .hset(hkey, 'state', 'failed')
            .hset(hkey, 'failed_at', Date.now()) // 任务失败时间
            .hset(hkey, 'updated_at', Date.now())
            .zrem(getKey('jobs', this.type, 'active'), this.getZid()) // 删除q:jobs:email1:active
            .zrem(getKey('jobs', 'active'), this.getZid()) // 删除q:jobs:active
            .zadd(getKey('jobs', this.type, 'failed'), this._priority, this.getZid())
            .zadd(getKey('jobs', 'failed'), this._priority, this.getZid())
            .lpush(getKey('job', this.id, 'log'), err) // 添加日志q:job:id:log
            .exec((err) => {
                if (err) {
                    throw new Error(err) // 不会执行后面的语句(???这里报错)
                }
                // 通知
                event.emit.bind(this)(this.id, 'failed', this.type, {err: err, stack: stack || 0});
                // 重试
                this.state('retry')
            })
    }

    /*
    * backoff(补偿)
    * (1)使用方法: let job=await queue.createJob('email1',{name:'zhangsan'}).priority('high').delay(1000).backoff({delay:2000}).save()
    * (2)当任务失败时，.backoff()设定，允许在重试时包含补偿时间，相当于进入delay状态
    * (3)当.backoff({delay:2000})存在时，delay设定的延迟将被替代
    * (4)当.backoff(true)存在时，默认使用delay作为补偿值
    * (5)当.backoff(false)存在时，将无视所有补偿值，立即重试任务
    * */
    _toRetry() {
        this._backoff = JSON.parse(this._backoff);
        let getKey = this.redis.getKey.bind(this.redis); // getKey中的this === 当前实例的job(this).redis
        let multi = this.redis.client.multi();
        console.log('[_toRetry() 比较次数]', parseInt(this.max_attempts), parseInt(this._attempts));
        if (parseInt(this.max_attempts) > parseInt(this._attempts)) {
            let delay = null;
            if (typeof this._backoff !== 'object' && this._backoff !== null && this._backoff !== false) {
                // (4)默认使用delay作为补偿值 & 不是对象Object(true) & 不是.backoff(null) & 不是默认值false
                // 测试
                console.log('[默认使用delay作为补偿值]');
                delay = parseInt(this._delay) + Date.now()
            } else if (this._backoff !== null && this._backoff !== false) {
                // (3)可以是一个对象Object && 不是.backoff(null) && 不是默认值false
                // 测试
                console.log('[delay设定的延迟将被替代]', this._backoff);
                // let {delay} = this._backoff
                let _delay = this._backoff['delay'];
                if (_delay) {
                    delay = _delay + Date.now()
                }
            } else {
                // (5)立即重试任务 & inactive: 表示delay>>>promotion(跳过_toDelay()>>>直接_toInactive())
                // 测试
                console.log('[立即重试任务]');
                this._state = 'inactive';
                return multi
                    .zrem(getKey('jobs', this.type, 'failed'), this.getZid())
                    .zrem(getKey('jobs', 'failed'), this.getZid())
                    .exec((err) => {
                        if (err) {
                            throw new Error(err)
                        }
                        this.state('inactive')
                    })
            }

            multi
                .hset(getKey('job', this.id), 'state', this._state) // 修改状态
                .hset(getKey('job', this.id), 'delay', this._delay) // 修改延时(重新给任务设置延迟)
                .zrem(getKey('jobs', this.type, 'failed'), this.getZid()) // 从q:jobs:email1:failed中删除
                .zrem(getKey('jobs', 'failed'), this.getZid()) // 从q:jobs:failed中删除
                .zadd(getKey('jobs', this.type, 'delayed'), this._priority, this.getZid()) // 添加q:jobs:email1:delayed
                .zadd(getKey('jobs', 'delayed'), delay, this.getZid()) // 添加q:jobs:delayed
                .exec((err) => {
                    if (err) {
                        throw new Error(err)
                    }
                    // 通知
                    event.emit.bind(this)(this.id, 'retry', this.type, {retry_at: Date.now(), delay: delay})
                })
        } else {
            // finish事件: 表示尝试次数已经用完
            // zrem: 表示从q:jobs:failed中删除， 再调用_toFinish()更新事件为finish
            // 不在_toFinish()中执行， 由于执行时间和轮询间隔的原因，会执行多次_toFinish()， 而在这里执行不会有这样的问题
            multi
                .zrem(getKey('jobs', this.type, 'failed'), this.getZid())
                .zrem(getKey('jobs', 'failed'), this.getZid())
                .exec((err) => {
                    if (err) {
                        throw new Error(err)
                    }
                    this.state('finish')
                })
        }
    }

    /*
    * promotion >>> active(任务已被获取)
    * */
    _toActive(job) {
        // 修改已经尝试的次数
        this._attempts = parseInt(this._attempts) + 1;
        // 修改剩余尝试的次数
        this.remaining = this.max_attempts - this._attempts;
        return new Promise((resolve, reject) => {
            let multi = this.redis.client.multi();
            let getKey = this.redis.getKey.bind(this.redis);
            let hkey = getKey('job', this.id, false);
            let zid = RedisFactory.createZid(this.id);
            let ttl = null;
            if (this._ttl !== 0) { // 任务的生存时间
                ttl = +this._ttl + Date.now(); // +一元运算符，如果操作数不是一个数值，会尝试将其转换成数值
                this.exceed_at = ttl // 任务过期时间
            }

            multi
                .hset(hkey, 'state', 'active') // 修改状态
                .hset(hkey, 'attempts', this._attempts) // 修改已经尝试的次数
                .zrem(getKey('jobs', 'inactive'), zid)
                .zrem(getKey('jobs', this.type, 'inactive'), zid) // 源代码中没有这条删除语句(我添加了，删除)
                .zadd(getKey('jobs', 'active'), ttl || this._priority, zid) // 任务最大生命周期(一般使用这个，因为在xqueue.js.checkActiveTTL查询zrangebyscores) && 任务优先级
                .zadd(getKey('jobs', this.type, 'active'), this._priority, zid)
                .exec((err) => {
                    if (err) {
                        // 错误处理
                        return super.emit('error', new Error(err))
                    }
                    // 通知
                    event.emit.bind(this)(this.id, 'active', this.type);

                    return resolve(job)
                })
        })
    }

    /*
    * delay >>> promotion
    * */
    _toInactive(job) {
        return new Promise((resolve, reject) => {
            let multi = this.redis.client.multi();
            let getKey = this.redis.getKey.bind(this.redis);
            let zid = RedisFactory.createZid(this.id);
            // 有序集合沒有smove命令
            multi
                .hset(getKey('job', this.id), 'state', 'inactive')
                .zrem(getKey('jobs:delayed'), zid)
                .zrem(getKey('jobs', this.type, 'delayed'), zid)
                .zadd(getKey('jobs', this.type, 'inactive'), this._priority, zid)
                .zadd(getKey('jobs:inactive'), this._priority, zid)
                .lpush(getKey(this.type, 'jobs'), 1) // 这个有什么用???
                .exec((err) => {
                    if (err) {
                        // 错误处理
                        super.emit('error', new Error(err))
                    } else {
                        resolve(job)
                    }
                });

            // 通知(任务从delay状态过渡进入队列)
            event.emit.bind(this)(this.id, 'promotion', this.type, {promote_at: Date.now()})
        })
    }

    /*
    * 当连续2次，调用this.state('inactive')时触发
    * 作用是什么?
    * 各个任务之间的关系(队列事件之间的关系)
    * 在什么情况下，会连续2次调用this.state('inactive')
    * */
    _inactiveState(job) {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis);
        return new Promise((resolve, reject) => {
            multi
                .lpush(getKey(this.type, 'jobs'), 1)
                .hset(getKey('job', this.id), 'state', this._state) // 修改当前状态为'inactive'
                .zadd(getKey('jobs', this.type, this._state), this._priority, this.getZid())
                .zadd(getKey('jobs', this._state), this._priority, this.getZid())
                .exec((err) => {
                    if (err) {
                        return super.emit('error', new Error(err))
                    }
                    resolve(job);
                    // 通知
                    event.emit.bind(this)(this.id, 'enqueue', this.type, this.args)
                })
        })
    }

    /**
     * 功能: 当没有剩余次数时, 任务仍然为失败, 设置状态为'finish'
     *
     * 1.删除failed_at stack error失败属性
     * 2.更新状态'finish'
     * */
    _toFinish(data = 'task failed, no more retry', job) {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis);
        let hkey = getKey('job', this.id, false);
        let self = this;
        this.cancel_order = true;

        return new Promise((resolve, reject) => {
            multi
                .hset(hkey, 'state', 'finish')
                .hset(hkey, 'updated_at', Date.now())
                .hset(hkey, 'info', data || 0)
                .hset(hkey, 'finish_at', Date.now())
                .hset(hkey, 'cancel_order', this.cancel_order)
                .hdel(hkey, 'failed_at', 'stack', 'error')
                // .zrem(getKey('jobs', this.type, 'failed'), this.getZid())
                // .zrem(getKey('jobs', 'failed'), this.getZid())
                .zadd(getKey('jobs', this.type, 'finish'), this._priority, this.getZid())
                .zadd(getKey('jobs', 'finish'), this._priority, this.getZid())
                .exec((err) => {
                    if (err) {
                        return super.emit('error', new Error(err))
                    }
                    self.finish = true;
                    resolve(job);
                    // 通知
                    event.emit.bind(this)(this.id, 'finish', this.type)
                })
        })
    }

    /**
     * 功能: 删除complete和finish中, 数据库保存后的记录
     * */
    _toSave(eventName) {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis);
        let hkey = getKey('job', this.id, false);
        let self = this;

        multi
            .zrank(getKey('jobs', this.type, eventName), this.getZid())
            .exec((err, num) => {
                if (num[0] === null) {
                    return
                }

                multi
                    .hset(hkey, 'state', 'save')
                    .hset(hkey, 'updated_at', Date.now())
                    .hset(hkey, 'saved_at', Date.now())
                    .zrem(getKey('jobs', this.type, eventName), this.getZid())
                    .zrem(getKey('jobs', eventName), this.getZid())
                    .zadd(getKey('jobs', this.type, 'save'), this._priority, this.getZid())
                    .zadd(getKey('jobs', 'save'), this._priority, this.getZid())
                    .exec((err) => {
                        if (err) {
                            return super.emit('error', new Error(err))
                        }
                        self.save = true;
                        // 通知
                        event.emit.bind(this)(this.id, 'save', this.type)
                    })
            })
    }

    /*
    * delay
    * */
    _toDelay() {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis);
        multi
            .hset(getKey('job', this.id), 'state', this._state) // 修改state任务状态
            .hset(getKey('job', this.id), 'delay', this._delay) // 修改delay
            .zadd(getKey('jobs', 'delayed', false), parseInt(this._delay) + Date.now(), this.getZid()) // q:jobs:delayed 集合延迟后，任务执行的时间
            .zadd(getKey('jobs', this.type, 'delayed', false), this._priority, this.getZid()) // q:jobs:email1:delayed
            .exec((err) => {
                if (err) {
                    throw new Error(err)
                }
                // console.log('[_toDelay this.args]', this.args) // params和arguments都表示传入的job实例对象，但this.args=null
                // 只有args()方法中用到了this.args + 没有地方调用args()方法，不知道this.args有什么用
                // 通知
                event.emit.bind(this)(this.id, 'delay', this.type, this.args)
                /*
                * this.id 实例化job生成的id
                * 'delay'
                * this.type 'email1'
                * this.args 在调用_toDelay(this)传入了参数this(当前job实例)
                * */
                /*
                * state()方法中调用了job = this._toDelay(this);
                * & 但this._toDelay(this)中并没有return返回任何内容
                * & 从而导致state()方法return job实例为null
                * & 又导致了save()方法return job为null
                * & 这是不是优点问题，还是其他原因
                * */
            })
    }

    args(...args) {
        this.args = Array.from(args);
        return this // 链式写法
    }
}

module.exports = Job;

/*
* _toDelay(): delay状态
* _toInactive(): promotion状态(delay>>>promotion，任务从delay过渡进入队列)
* _toActive(): promotion状态>>>active(任务已被获取)
* _toComplete():
*
* 疑问:
* 1.在_toInactive()中的getKey(this.type,'jobs') >>> q:email1:jobs作用是什么?
* 在_toInactive()和_inactiveState()使用lpush列表
* 2.在_toActive()中的multi.zrem(getKey('jobs', this.type, 'inactive'), zid) // 这个不用删除吗???
* 删除
* 3.在_toActive()中的this.exceed_at=ttl; // exceed_at在后续代码中哪里用到了 & 用处在哪???
* 没找到在哪用到
* 4.在_toActive()中的multi.zadd(getKey('jobs', 'active'), ttl || this._priority, zid) // 为什么ttl || priority两个选择
*   ttl的作用是什么?
*   priority的作用是什么?
* 由于在xqueue.js.checkActiveTTL()中redis.client.zrangebyscore('q:jobs:active',100000,Date.now(),...)中
* 可以看到获取成员是按分数来的，这个分数＝0~当前时间，而ttl正好是该任务的最大执行时间，相符合
*
* 5.map在job.js中的使用
*   (1)getJob() >>> map.addInWorkMap(job.id, job) // 加入workmap
*   (2)done() >>> map.deleteFromWorkMap(this.id)  //
*   map.deleteFromWorkMap(this.id) // 从jobsList中删除id ??? 关注下
*
* 6._inactiveState()
*   (1)在什么情况下，会连续调用2次，从而激活_inactiveState(job)
*   (2)重复输入zadd('q:jobs:emails:inactive',this.ttl + Date.now(),this.getZid())
*             zadd('q:jobs:emails:inactive',this._priority,this.getZid())
*      结论: 后面的会覆盖前面的
*
* 7.加入workmap的作用是什么?
* */

/*
* 1.this.state('delay/inactive/active/retry/complete/failed/enqueue')中添加删除有序集合名字zadd/zrem/lpush/hset
* 2.分别在哪里调用了this.state('...')各个事件
* 3.分别在哪里调用了包含this.state('...')各个事件的方法
* 4.'delay/inactive/active/retry/complete/failed/enqueue'事件之间是如何更新的
* 5.操作流程是什么
* 6.在哪些情况下会调用_inactiveState()方法 & 注，调用_inactiveState()方法，必须连续2次调用this.state('inactive')
* 6.1 jobs.js中调用的map.deleteFromWorkMap()和map.addInWork()
*           操作jobsList Map集合有什么用???
*
* 7.方法分析
* (1)errorEvent(): 监听EventEmitter.emit('error', errMessage)发出的错误。
*                  例如: return super.emit('error', new Error(err))
*                  多出现在_toDelay() _toActive() _toInactive() ...方法中
*                  此方法，仍存在问题，super.emit('error',...)时，由于node版本问题而报错
* (2)ttl(ms): 任务生存时间 & this._ttl & return this 链式写法
* (3)attempts(num): 最大尝试次数 & this.max_attempts & return this 链式写法
* (4)on(event): 用来监听从queueEvent发来的事件通知(重写，原代码不能执行该功能)
* (5)backoff(backoff): 当任务失败时，设置补偿参数
*           允许在重试时，包含补偿时间，相当于进入delay状态
*           1.backoff({delay:2000}): delay设定的延时值将被替代
*           2.backoff(true): 默认使用delay作为补偿值
*           3.backoff(false): 将无视所有补偿值，立即重试任务
*
* (6)save(): 保存 &  queue.createJob('email1', { name: 'zhangsan' }).ttl(1000).delay(5000).attempts(3).save()
*            功能:
*            1.id自增长
*            2.this.id = id 自增长赋值
*            3.multi & getKey
*            4.created_at
*            5.hkey = q:job:id
*            6.addTypes(): 往集合q:job:types添加分组email1，表示统计有哪些分组
*            7.addIntoJobs(): 往有序集合q:jobs添加 priority zid
*            8.event.addObJob(this.id, this): 往obList中添加(id,job实例)
*            9.delay: delay参数判断(this._delay) & delay() & this.state('delay')
*            10.inactive: this.state('inactive')
*            11.return表示
*               在multi.exec()中的return表示: 1.立即结束在exec()中的方法 2.通过resolve返回值(object)
*               在new Promise()中的return表示: 流程判断，不在执行后面的代码，立即结束Promise中的方法
*            12.返回当前实例job
* (7)priority(level): 优先级 & {low: 10, normal: 0, medium: -5, high: -10, critical: -15}
*                & this.id判断(默认为null) 存在，调用setJob()修改priority和updated_at属性
*                & return this 链式写法
* (8)setJob(key,value): 封装方法，priority()调用 & q:job:id 修改priority和updated_at属性
* (9)setType(key,value): setJob()的另一种写法，现不用
* (10)addTypes(): 集合添加 & sadd & q:job:types & email1(type)
* (11)addIntoJobs(): 有序集合添加 & zadd & q:jobs & priority zid
* (12)getZid(): 封装方法，对于id的封装 & this.redis.createZid(id)
* (13)Json(): 返回任务信息的更多细节 & 返回以下属性
*   -`data`           任务数据
    -`type`           任务分组
    -`priority`       优先级
    -`ttl`            任务生存时间 (从被获取到相应的最大时间)
    -`state`          任务状态
    -`max_attempts`   最大尝试次数
    -`created_at`     任务创建时间
    -`updated_at`      任务修改时间
    -`attempts`       已经尝试次数
    -`backoff`        backoff参数细节
    -`remaning`      剩余重试次数
* (14)state(state,data):
*       更新各种状态:
*       _toFailed() _toComplete() _toActive() _toDelay() _Inactive() _toRetry()
*       疑问: _inactiveState()只有在连续2次调用this.state('inactive')时，才会调用，什么样的情况下会出现呢?
* (15)getJob(id):
*        根据id来查询其他任务，q:job:id
*        1.q:job:id加入到工作队列，对应done()方法的从队列中删除
*        2.判断当前状态
*        如果当前this._state === 'delay' >>> 手动触发this.state('inactive')
*        如果当前this._state === 'retry' >>> 手动触发this.state('inactive')
*        如果当前this._state === 'inactive' >>> 手动触发this.state('active')
*        触发对应的事件，可对应各个事件对应方法的zadd和zrem中看出来
*
*        this._state = 'retry' >>> 手动触发this.state('inactive')
*        前提是retry的_toRetry()的第1,2种方法，因为第1,2种zadd设置state为'delay'
*        第3种的当前状态是inactive，不是retry，所以不会手动触发this.state('inactive')
*        第3种，状态是inactive，所以它会跑this._state==='inactive' >>> 手动触发this.state('active')这一项
*
* (16)done(msg):
*       返回任务结果
*       当传入参数为Error对象时，表示此任务标记为失败 >>> this.state('failed') >>> _toFailed()
*       当传入其他参数时，表示此任务标记为成功 >>> this.state('complete') >>> _toComplete()
*       从jobsList中删除
*
* (17)delay(sec):
*         需求：延时时间，比如延迟5000，表示延时5s
*         1.sec传入的是5000，表示延迟时间
*         2.sec传入的是延迟后任务执行的时间，那么sec = 延迟后任务执行时间 - 当前时间
*         this._delay = sec 用来接收时间
*         在zadd & q:jobs:delayed & ('delay',this._delay + 当前时间)
*
* (18)_toComplete(data):
*           出处: 相当于哪里调用了this.state('complete')>>>done()
*           修改q:job:id的state，active>>>complete
*           修改q:job:id的update_at，修改时间
*           修改q:job:id的info，成功信息
*           修改q:job:id的complete_at，任务成功时间
*           删除q:job:id的failed_at,stack,error，q:job:id中的failed_at属性(任务失败时间)，stack属性(任务错误位置)，error属性(任务错误信息)
*           删除q:jobs:email1:active有序集合中对应的zid
*           删除q:jobs:active有序集合中对应的zid
*           添加q:jobs:email1:complete有序集合中添加(priority,zid)
*           添加q:jobs:complete有序集合中添加(priority,zid)
*
* (19)_toActive(job):
*           出处: 相当于哪里调用了this.state('active')>>> getJob()&Worker.js.getJob()
*           修改q:job:id的state，inactive>>>active
*           修改q:job:id的attempts，
*           删除q:jobs:inactive有序集合中对应zid
*           删除q:jobs:email1:inactive有序集合中对应的zid
*           添加q:jobs:active & (ttl || this._priority, zid)
*           添加q:job:email1:active & (priority,zid)
*
* (20)_toFailed(data):
*           出处: 相当于哪里调用了this.state('failed')>>>done()
*           修改q:job:id的error，新设置(错误信息)
*           修改q:job:id的stack，新设置(错误位置)
*           修改q:job:id的state，active>>>failed
*           修改q:job:id的failed_at，新设置(失败时间)
*           修改q:job:id的updated_at，更换时间
*           删除q:jobs:active有序集合中对应的zid
*           删除q:jobs:email1:active有序集合中对应的zid
*           添加q:jobs:failed有序集合中添加(priority,zid)
*           添加q:jobs:email1:failed有序集合中添加(priority,zid)
*           添加q:job:id:log列表头插入err错误信息
*
*
* (21)_toRetry():
*           出处: 相当于哪里调用了this.state('retry')>>>_toFailed()
*
*           backoff:
*           允许在重试时，包含补偿时间，相当于进入delay状态
*           1.backoff({delay:2000}): delay设定的延时值将被替代 >>> delay = delay + Date.now()
*           2.backoff(true): 默认使用delay作为补偿值 >>> delay = parseInt(this._delay) + Date.now()
*           3.backoff(false): 将无视所有补偿值，立即重试任务 >>> 立即重试任务
*           zrem & q:jobs:failed & zid
*           zrem & q:jobs:email1:failed & zid
*
*           修改q:job:id的state，state>>>retry
*           修改q:job:id的delay，
*           删除q:jobs:failed有序集合中对应的id
*           删除q:jobs:email1:failed有序集合中对应的id
*           添加q:jobs:delayed有序集合中添加(delay,id)
*           添加q:jobs:email1:delayed有序集合中添加(priority,zid)
*
*           'delay'属性 = 当前时间 + 延迟时间
*           当第1种时，'delay'属性将被重新设置(delay设置有2处，save()+_toRetry())
*           当第2种时，使用默认delay，也就是this._delay
*           当第3种时，执行完
*           zrem & q:jobs:failed & zid
*           zrem & q:jobs:email1:failed & zid >>> 表示现在zid不属于q:jobs:event或者q:jobs:email1:event
*           后，就立即退出，不在执行后面的代码
*
*           this.state('inactive')
*           当是第3种时，立即执行inactive，跳过了delay这一步
*
*           第1种和第2种，是进入delay状态
*           第3种，是直接进入inactive状态，条做delay状态
*
*
* (22)_toInactive(job):
*           出处: 相当于哪里调用了this.state('inactive')>>>save()和_toRetry()和getJob()
*           修改q:job:id的state，delay>>>inactive
*           删除q:jobs:delayed有序集合中对应的zid
*           删除q:jobs:email1:delayed有序集合中对应的zid
*           添加q:jobs:inactive有序集合中添加(priority,zid)
*           添加q:jobs:email1:inactive有序集合中添加(priority,zid)
*           添加q:email1:jobs列表中添加1
*
* (23)_inactiveState(job):
*           出处: 相当于哪里连续调用了this.state('inactive')2次
*           修改q:job:id的state，inactive>>>inactive
*           添加q:jobs:inactive有序集合中添加(priority,zid)
*           添加q:jobs:email1:inactive有序集合中添加(priority,zid)
*           添加q:email1:jobs列表中添加1
*
*           _toInactive()比较，区别在哪里?
*           修改q:job:id的state，delay>>>inactive
*           删除q:jobs:delayed有序集合中对应的zid
*           删除q:jobs:email1:delayed有序集合中对应的zid
*           添加q:jobs:inactive有序集合中添加(priority,zid)
*           添加q:jobs:email1:inactive有序集合中添加(priority,zid)
*           添加q:email1:jobs列表中添加1
*
*           区别在: 没有
*           删除q:jobs:delayed有序集合中对应的zid
*           和
*           删除q:jobs:email1:delayed有序集合中对应的zid
*           原因: 前一次已经是inactive了，已经删过了，没必要重复删除
*
*
* (24)_toDelay():
*           出处: 相当于哪里调用了this.state('delay')>>>只在save()中调用
*           修改q:job:id的state，null>>>delay
*           修改q:job:id的delay,修改延时时间(不是任务延迟执行时间)
*           添加q:jobs:delayed有序集合中添加(延时时间+当前时间,zid)
*           添加q:jobs:email1:delayed有序集合中添加(priority,zid)
*
* (25)args(): 此方法没调用，是什么原因
* */

/*
* priority() + setJob(): hset & q:job:id修改updated_at和priority属性
* save():
*    addTypes()
*    addIntoJobs()
*    addObJob()
*    this.state('delay')
*    this.state('inactive')
* addTypes(): sadd & q:job:types & email1(type) & 表示往q:job:types加入类型email1
* addIntoJobs(): zadd & q:jobs & priority zid
* addObJob(): 往obList集合中添加(id,job实例)
*
* _toDelay():
*           调用出处,1处: save()
*           hset & q:job:id & (state,'delay')
*           hset & q:job:id & (delay,this._delay)
*           zadd & q:jobs:delayed & (当前时间+延迟时间,zid)
*           zadd & q:jobs:email1:delayed & (priority,zid)
*
* _toInactive():
*           调用出处,3处: save() & _toRetry() & getJob()
*           hset & q:job:id & ('state','inactive')
*           zrem & q:jobs:delayed & zid
*           zrem & q:jobs:email1:delayed & zid
*           zadd & q:jobs:inactive & (priority,zid)
*           zadd & q:jobs:email1:inactive & (priority,zid)
*           lpush & q:email1:jobs & 1
*
* _toFailed():
*           调用出处,1处: done()
*           hset & q:job:id & (error,err)
*           hset & q:job:id & (stack,stack)
*           hset & q:job:id & (state,'failed')
*           hset & q:job:id & (failed_at,Date.now())
*           hset & q:job:id & (updated_at,Date.now())
*           zrem & q:jobs:active & zid
*           zrem & q:jobs:email1:active & zid
*           zadd & q:jobs:failed & (priority,zid)
*           zadd & q:jobs:email1:failed & (priority,zid)
*           lpush & q:job:id:log & err
*
* _toRetry():
*           调用出处,1处: _toFailed() & 涉及backoff()参数
*           hset & q:job:id & ('state','retry')
*           hset & q:job:id & ('delay',this._delay)
*           zrem & q:jobs:failed & zid
*           zrem & q:jobs:email1:failed & zid
*           zadd & q:jobs:delayed & (delay,zid)
*           zadd & q:jobs:email1:delayed & (priority,zid)
*
*           // 当backoff(false):立即重试任务时
*           zrem & q:jobs:failed & zid
*           zrem & q:jobs:email1:failed & zid
*
* _toActive():
*           调用出处,2处: getJob() & Worker.getJob()
*           hset & q:job:id & ('state','active')
*           hset & q:job:id & ('attempts',this._attempts)
*           zrem & q:jobs:inactive & zid
*           zrem & q:jobs:email1:inactive & zid
*           zadd & q:jobs:active & (ttl || this._priority, zid)
*           zadd & q:jobs:email1:active & (priority,zid)
*
*
* _toComplete():
*           调用出处,1处: _toComplete()
*           hset & q:job:id & ('state','complete')
*           hset & q:job:id & (updated_at,Date.now())
*           hset & q:job:id & (info,data||0)
*           hset & q:job:id & (complete_at,Date.now())
*           hdel & q:job:id & (failed_at,stack,error)
*           zrem & q:jobs:email1:active & zid
*           zrem & q:jobs:active & zid
*           zadd & q:jobs:email1:complete & (priority,zid)
*           zadd & q:jobs:complete & (priority,zid)
*
* _inactiveState():
*           调用出处,1处: state(state,data)
*           hset & q:job:id & ('state', inactive)
*           zadd & q:jobs:inactive & (ttl+Date.now(),zid) ??? 被后面语句覆盖了?
*           zadd & q:jobs:email1:inactive & (priority,zid)
*           zadd & q:jobs:inactive & (priority, zid)
*           lpush & q:email1:jobs & 1 // 对应_toInactive()中也有该列表
*
*
* 1.save() >>> this.state('delay') >>> _toDelay()
*          >>> this.state('inactive') >>> _toInactive()
*
* 2.done() >>> this.state('complete') >>> _toComplete
*          >>> this.state('failed',{err,stack}) >>> _toFailed() // err:错误信息 stack:错误位置
*               >>> this.state('retry') >>> _toRetry()
*                   >>> this.state('inactive') >>> _toInactive()
*
* 3._toFailed()中删除active >>> 说明在这之前this.state已经修改成active
* 哪里修改了active，也就是哪里调用了this.state('active')
*
* 5.getJob() & Worker.js.getJob()>>> 调用了this.state('active') >>> _toActive() >>> done() >>> toFailed() >>> active --> failed --> retry --> inactive立即重视，跳过delay
*                                                                                                            -->  delay，进入delay阶段
*                                                             >>> _toComplete() >>> complete(结束)
*
* 6.save() >>> this.state('delay')
*          >>> this.state('inactive') >>> getJob() & Worker.js.getJob() >>> 调用了this.state('active')
*          状态inactive >>> active
*
* 7.Xqueue.js.checkPromotion()>>>返回有序集合q:jobs:delayed中所有符合时间的成员(即任务q:job:id)
*     >>>doPromote()>>>便利ids数组，getJob(id)取出，自动更新状态(delay>>>inactive)，并发出通知(getJob()本身发出promotion通知+xqueue.doPromote()也会发出通知)
*
* 8.getJob()和done()供外部调用来修改this.state('...')
* 9.job.js第569行报错???找出原因
* */

/*
* 问题: 在什么情况下,会调用_inactiveState()方法? & 从代码角度看,什么情况下,既OldState='inactive',NewState='inactive'\
* 1.从worker.start()>>>整个插件中唯一更新状态inactive>>>active(通过getJob()且此时任务事件为inactive),可以看出
*   lpush q:type:jobs 原子出栈方法
*   zadd q:jobs:type:inactive 仿原子出栈方法
*   其中,q:type:jobs列表和q:jobs:type:inactive有序集合必然是一对一的关系
*
* 2.会调用_inactiveState(),必然和'inactive'事件相关
*  操作'inactive'事件可以分为2部分: 我们以inactive>>>active作为界限
*  (1)在inactive>>>active之前,操作'inactive'事件的方法有save()
*     当没有设置延时,queue.createJob(...)....save()
*     this.state('inactive')>>>触发的是_toInactive()方法
*     lpush q:inactive:jobs
*     zadd q:jobs:type:inactive
*     是一对一的,没有问题
*
*  (2)在inactive>>>active分界线,worker.js.start()将任务事件更新inactive>>>active
*     此时,已经可以调用done('complete')和done('failed'),将active>>>complete或active>>>failed
*
*  (3)在inactive>>>active之后,操作'inactive'事件的方法有_toRetry()
*    在第2条中,done('failed')>>>_toFailed()>>>_toRetry()
*
*  (4)当传入参数backoff=false是,表示立即重试任务,任务直接进入事件'inactive',跳过事件'delay'
*
*  (5)在_toRetry(),立即重试任务中,有代码
*     a. this._state='inactive'
*     b.this.state('inactive')
*  (6)在state()中
*     a. OldState='inactive'(this._state)
*     b. this._state='inactive'(this.state('inactive'))
*     c. OldState===this._state>>>执行_inactiveState()
*     d. lpush q:type:jobs
*        zdd q:jobs:type:inactive
*        一对一的关系,没问题了解决了
*
*  (7) 补充:
*  在_toFailed()
*  zadd q:jobs:type:failed    添加
*  zadd q:jobs:failed         添加
*
*  在_toRetry()中,backoff=true
*  zrem q:jobs:type:failed    删除
*  zrem q:jobs:failed         删除
*
*  在_inactiveState()中
*  lpush q:type:jobs
*  zadd q:jobs:type:inactive
*  zadd q:jobs:inactive
*
*  对比_Inactive()
*  lpush q:type:jobs
*  zadd q:jobs:type:inactive
*  zadd q:jobs:inactive
*  zrem q:jobs:delayed      (由于直接进入'inactive'事件,不用删除)
*  zrem q:jobs:type:delayed (同上)
* */

/**
 * 在事件操作中, 我们涉及到2个有序集合
 * 这里, 我们以inactive事件为例
 *
 * 1.q:jobs:inactive: 表示所有任务分组的inactive事件都在这个有序集合中
 * 2.q:jobs:alipay:inactive: 表示alipay任务分组的inactive集合
 * 3.q:jobs:wxpay:inactice: 表示wxpay任务分组的inactive集合
 * 4.它们有以下的关系
 *  q:jobs:inactive有序集合中成员数量 = q:jobs:alipay:inactive有序集合中成员数量
 *                                 + q:jobs:wxpay:inactive有序集合中成员
 *
 * */