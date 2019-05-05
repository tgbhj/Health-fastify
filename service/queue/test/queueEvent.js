/*
* q:events频道
*   this.redis >>> 目前来自xqueue.js的Queue类: this.redis = RedisClient(RedisFactory类的实例，非node_redis操作对象)
* */
const jobsMap = require('./map.js');
exports.subscribeEvent = function () {
    let redis = this.redis;
    // console.log('[subscribeEvent]', redis)
    let sub = redis.createClient(); // 非node_redis的createClient方法
    exports.subClient.push(sub);
    sub.on('message', exports.queueMessage);
    sub.subscribe(redis.getKey('events'), function (err, channel) {
        // 订阅频道名称
        // console.log('>>>>>subscribeEvent Start<<<<<')
        // console.log('[err]', err)
        console.log('[channel]', channel, '已经订阅')
        // console.log('>>>>>subscribeEvent End<<<<<')
    });
};

exports.queueMessage = function (channel, msg) {
    /*
    * channel: 监听的频道名字q:events
    * msg:
    *   1.{ id: '1', event: 'retry',type: 'email1', retry_at: 1528269758231,delay: 200000,args: []}
    *   2.{ id: '1', event: 'retry',type: 'email1', args: [ 'string字符串' ]}
    * */
    console.log('>>>>>queueMessage Start<<<<<');
    // console.log('[queueMessage channel]', channel)
    // console.log('[queueMessage msg]', msg)
    // console.log('>>>>>queueMessage End<<<<<')
    let message = JSON.parse(msg);
    let {id} = message;
    let job = null; // 根据id取出job实例
    let event = null; // retry delay

    if (message.hasOwnProperty('event')) {
        let {event} = message;
        if (jobsMap.hasObJob(id) === true) {
            // 如果有id，取出对应的job实例
            job = jobsMap.getObJob(id);
            job.emit(event, message) // job实例发出的EventEmitter
        }

        // 队列任务事件监听
        if (jobsMap.hasObJob(`qob-${id}`) === true) {
            // xqueue的observed(...obmsg){...}设置了qob-id
            let qJob = jobsMap.getObJob(`qob-${id}`);
            if (qJob.is_observedAllEvent === true) { // 表示是否监听所有事件
                return qJob.emit('*', message) // qJob是xqueue实例 & xqueue发出EventEmitter事件，通过xqueue的on来监听
            }
            qJob.emit(event, message)
        } else if (jobsMap.hasObJob('qob-all-keys') === true) {
            // xqueue的observed(...obmsg){...}设置了qob-all-keys
            let qJob = jobsMap.getObJob('qob-all-keys'); // 获取同一个queue实例
            if (qJob.is_observedAllKey === true) {
                return qJob.emit('*', message)
            }
            qJob.emit(event, message)
        }

        /*
        * 两个疑问:
        * 1.queue.observed(1,2).on('*').then(res=>console.log(res))
        * 同时监听2个任务id1和id2，当id1和id2状态发生变化时，调用一次on()只会监听一次，返回一个promise对象，那么第二个发生状态
        * 变化的id任务，就被丢弃了
        * 说白了，就是，你一个on()怎么来接收2个结果
        * 2.当有qob-all-keys时，is_observedAllKey一定===true，那么这个if判断的意义到底在哪里?
        * 3.总结: 这个队列的监听，依然有很多疑问，使用的时候一定要谨慎
        * */

        /*
        * is_observedAllEvent & xqueue.js的on(event){...}
        * is_observedAllKey & xqueue.js的observed(...obmsg){...}
        * */

        // 当任务成功或任务失败时，删除obList中对应id的job实例
        if (['complete', 'failed'].indexOf(event) !== -1 && jobsMap.hasObJob(id) && jobsMap.getObJob(id).remaining === 0) {
            /*
            * 1.必须是complete和failed事件
            * 2.id对应的job实例存在
            * 3.剩余次数 === 0
            * */
            jobsMap.deleteFromObMap(id) // 刪除任务
        }
    }
};

/*
* 键事件通知(redis)
*   请开启 redis key-event-notify 事件通知选项
*   地址:
*     /url/local/redis-3.0.6/redis.conf
*     notify-keyspace-events "AKE"
*
* */
exports.subscribeSchema = function () {
    // ...
    let redis = this.redis; // this.redis >>> RedisClient实例(非redis对象)
    exports.redisConfig = redis.redisConfig;
    let sub = redis.createClient();
    // 这个方法不是node_redis插件中的createClient
    // 而是redis.js中的方法createClient()
    // redis.createClient() >>> 解释为由RedisFactory类生成的redis实例
    // redis实例有属性this.redisConfig和this.shutDown
    exports.subClient.push(sub);
    sub.on('pmessage', exports.schemaMessage);
    sub.psubscribe(`__keyevent@${redis.redisConfig.db}__:expired`, function (err, channel) {
        // __keyevent@0__:set
        // 订阅频道名称
        // console.log('>>>>>subscribeSchema Start<<<<<')
        // console.log('[err]', err)
        console.log('[channel]', channel, ' 已经订阅')
        // console.log('>>>>>subscribeSchema End<<<<<')
    });
};

exports.schemaMessage = function (matchedChannel, channel, msg) {
    // schema.js.save().set(stringKey,1).expire(stringKey,ttl) >>> stringKey过期时触发
    /*
    * matchedChannel: __keyevent@4__:expired
    * channel: matchedChannel
    * msg: q:schemas:zzzz:4:{"name":"lisi"}
    * */
    console.log('>>>>>schemaMessage Start<<<<<');
    // >>>>>schemaMessage Start<<<<<
    // [time end] 2018-05-23T06:20:45.963Z
    // [schemaMessage matchedChannel] __keyevent@4__:expired
    // [schemaMessage channel] __keyevent@4__:expired
    // [schemaMessage msg] q:schemas:zzzz:4:{"name":"lisi"}
    // >>>>>schemaMessage End<<<<<
    let separator = exports.redisConfig.separator;
    let data = msg; // q:schemas:zzzz:4:{"name":"lisi"}
    let id = null;
    /*
    * exports.redisConfig
    * >>> 来自上面subscribeSchema()的exports.redisConfig = redis.redisConfig
    * >>> redis 来自 this.redis >>> xqueue.subscribeSchema()
    * >>> xqueue.js的this.redis >>> RedisFactory()产生的对象
    * */

    for (let i = 0; i <= 3; i++) {
        // @@@@@@@@@@@@@[data] schemas:zzzz:5:{"name":"lisi"} >>> i=0
        // @@@@@@@@@@@@@[data] zzzz:5:{"name":"lisi"} >>> i=1
        // @@@@@@@@@@@@@[data] 5:{"name":"lisi"} >>> i=2
        // @@@@@@@@@@@@@[data] {"name":"lisi"} >>> i=3
        if (i === 2) {
            id = data.substr(data.indexOf(separator) + 1); // 7:{"name":"lisi"}
            id = id.substring(0, id.indexOf(separator)) // 7
        }
        data = data.substr(data.indexOf(separator) + 1)
    }
    let _msg = msg.split(separator); // [_msg] [ 'q', 'schemas', 'zzzz', '22', '{"name"', '"lisi"}' ]
    _msg = _msg.slice(0, 3); // [_msg] ['q', 'schemas', 'zzzz']
    _msg.push(id, JSON.parse(data)); // [_msg] [ 'q', 'schemas', 'zzzz', '22', { name: 'lisi' } ]
    // JSON序列化data: string >>> object
    console.log('>>>>>schemaMessage End<<<<<');
    if (jobsMap.hasSubMap(_msg[2])) {  // _msg[2] === type
        jobsMap.getSubMap(_msg[2]).emit('message', _msg, msg)
        /*
         * jobsMap.getSubMap取出的是schema对象
         * schema.js的subType()/lockType()
         * .emit('命名事件'): 表示schema对象(EventEmitter)发出的，需要同一个schema对象去监听on这个命名事件
         * emit('message')和xqueue.js.ontime(){...schema.on('message')}和schema.js.on(...){...}相对应
         **/
    }
};

/*
* 对参数...args进行进行处理
* */
exports.emit = function (id, event, type, ...args) {
    /*
    * id: this.id & 自增长 & number
    * event: 'delay'
    * type: 'email1'
    * args: 可能this对象(job实例)
    * */
    /*
    * args会有参数:
    * 1._toFailed() event.emit.bind(this)(this.id, 'failed', this.type, { err: err, stack: stack || 0 })
    * 2._toRetry()  event.emit.bind(this)(this.id, 'retry', this.type, { retry_at: Date.now(), delay: delay })
    * 3._toInactive() event.emit.bind(this)(this.id, 'promotion', this.type, { promote_at: Date.now() })
    *
    * 1. [ { err: 'err', stack: 'stack' } ]
    * 2. [ { retry_at: 1528266719406, delay: 200000 } ]
    * 3. [ { promote_at: 1528266839455 } ]
    * */
    let pub = this.redis.createClient();
    let redis = this.redis; // RedisFactory对象，非node_redis对象
    exports.pubClient.push(pub);
    let obmsg = {id, event, type};
    let _arg = [];
    let _msg = null;
    if (args !== []) {
        args = args.filter((x) => {
            if (isNaN(x) === false || typeof x === 'object') { // 当x是一个数字或者是一个对象时
                _msg = Object.assign(obmsg, x);
            } else { // 当x不是一个数字或者一个对象时
                return x
            }
        });
        _msg = Object.assign(obmsg, {args})
        /*
        * 如果args传入的是数字或对象，那么将args中的内容直接合并到obmsg{}
        * 如果args传入的不是数字或对象(String)，那么将args中的内容添加到obmsg{}的args:[]属性中去
        * */
    } else {
        // args为空
        _msg = Object.assign({}, obmsg, {args: []})
    }
    // object >>> string
    obmsg = JSON.stringify(_msg);
    // 发送事件
    pub.publish(redis.getKey('events', false), obmsg, function (err, num) { // q:events
        console.log('[queueEvent emit()]', err, num, '发布', obmsg)
    })
};

exports.hasSubMap = (type) => {
    return jobsMap.hasSubMap(type)
};

exports.addSubMap = (type, schema) => {
    jobsMap.addSubMap(type, schema)
};

exports.addObJob = (id, job) => {
    jobsMap.addObJob(id, job)
};

exports.subClient = [];
exports.pubClient = [];
/*
* 这里的exports相当于类中的this，有那么个意思
* exports.queueMessage === 可以理解为class类中的this.queueMessage
* */