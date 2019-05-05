const jobsMap = require('./map.js');

/**
 * 功能: 任务事件通知
 *
 * (1)queue实例化时,启动
 * (2)订阅q:events频道
 * (3)emit()参数处理后,发布消息到q:events
 * (4)queueMessage()处理通知消息
 * (5)this.redis:(event.subscribeEvent.bind(this)())
 *    a.this指向xqueue实例>>>redis为共享redis对象
 *    b.redis: 表示RedisFactory对象,非node_redis对象
 *    c.redis.createClient(): 表示RedisFactory类中的方法,非node_redis的createClient()
 * */
exports.subscribeEvent = function () {
    let redis = this.redis;
    let sub = redis.createClient(); // 非node_redis的createClient方法
    exports.subClient.push(sub);
    sub.on('message', exports.queueMessage);
    sub.subscribe(redis.getKey('events'), function (err, channel) {
        console.log('[channel]', channel, '已经订阅')
    });
};

/**
 * 功能: 任务事件通知消息处理发布
 *
 * (1)参数:
 *    a.channel: 表示监听频道名称
 *    b.msg: 表示监听到的消息
 *      {"id":1,"event":"failed","type":"email1","err":"错误信息","stack":"错误位置","args":[]}
 *      {"id":2,"event":"delay","type":"email1","args":["延迟通知"]}
 * (2)发布job通知
 *    a.根据id,从obList集合中取出对应job实例
 *    b.job实例发布(event,message);通过job.on(event)监听
 * (3)发布xqueue通知
 *    经过测试,发现qob-id和qob-all-key使用时, 仍有问题
 *    a.建议尽量不要使用在observed()和on()中使用参数'*';
 *    b.使用'*', 在任务事件为'complete'和'failed'时, 无法移除任务(已修改)
 * (4)
 * */
exports.queueMessage = function (channel, msg) {
    // console.log('[>>>>>queueMessage Start<<<<<]')
    let message = JSON.parse(msg);
    let {id} = message;
    let job = null;
    let event = null;

    if (message.hasOwnProperty('event')) {
        event = message.event;
        if (jobsMap.hasObJob(id) === true) {
            // 如果有id，取出对应的job实例
            job = jobsMap.getObJob(id);
            job.emit(event, message) // job实例发出的EventEmitter
        }

        // 队列任务事件监听
        if (jobsMap.hasObJob(`qob-${id}`) === true) {
            let qJob = jobsMap.getObJob(`qob-${id}`);
            if (qJob.is_observedAllEvent === true) { // 表示是否监听所有事件
                // return qJob.emit('*', message) // qJob是xqueue实例 & xqueue发出EventEmitter事件，通过xqueue的on来监听
                qJob.emit('*', message)
            } else {
                // 新增代码 2018/07/13: 区分不同任务id的相同事件
                event = event + '-' + id;
                qJob.emit(event, message)
            }
        } else if (jobsMap.hasObJob('qob-all-keys') === true) {
            let qJob = jobsMap.getObJob('qob-all-keys'); // 获取同一个queue实例
            if (qJob.is_observedAllKey === true) {
                // return qJob.emit('*', message)
                qJob.emit('*', message)
            } else {
                qJob.emit(event, message)
            }
        }

        // 当任务成功或任务失败时，删除obList中对应id的job实例 ??? 这里也有问题
        // if (['complete', 'failed'].indexOf(event) !== -1 && jobsMap.hasObJob(id) && jobsMap.getObJob(id).remaining === 0) {
        //   /*
        //   * 1.必须是complete和failed事件
        //   * 2.id对应的job实例存在
        //   * 3.剩余次数 === 0
        //   * */
        //   jobsMap.deleteFromObMap(id) // 刪除任务
        // }

        // 当任务事件为'complete'时, 移除任务
        if (['complete'].indexOf(event) !== -1) {
            jobsMap.deleteFromObMap(id)
        }

        // 当任务事件为'failed', 且剩余次数为0时, 移除任务
        if (['failed'].indexOf(event) !== -1 && jobsMap.hasObJob(id) && jobsMap.getObJob(id).remaining === 0) {
            jobsMap.deleteFromObMap(id)
        }
    }
};

/**
 * 功能: 计划任务键(过期)事件通知(redis)
 * 1.queue实例化时,启动
 * 2.订阅__keyevent@4__:expired频道
 * 3.this.redis: queue.redis>>>共享redis对象(RedisClient)
 * 4.createClient(): RedisClient对象的方法,非node_redis的createClient()
 *
 * 配置
 * 1.开启redis的'key-event-notify'事件通知选项
 * 2.目标地址:
 *  (1)/url/local/redis-3.0.6/redis.conf
 *  (2)notify-keyspace-events "AKE"
 * 3.在开启redis服务时, 约定, 不论有无设置密码, 都键入命令:
 *  (1)redis-server /usr/local/redis-3.0.6/redis.conf
 * */
exports.subscribeSchema = function () {
    let redis = this.redis;
    exports.redisConfig = redis.redisConfig;
    let sub = redis.createClient();
    exports.subClient.push(sub);
    sub.on('pmessage', exports.schemaMessage);
    sub.psubscribe(`__keyevent@${redis.redisConfig.db}__:expired`, function (err, channel) {
        // 订阅频道名称
        console.log('[channel]', channel, ' 已经订阅')
    });
};

/**
 * 功能: 计划任务键(过期)处理
 *
 * 1.参数:
 *  (1)matchedChannel: __keyevent@4__:expired, 表示匹配的频道
 *  (2)channel: __keyevent@4__:expired
 *  (3)msg:
 *    a.有schema.js.save()的stringKey
 *    b.expire(stringKey, Math.round(this._ttl / 1000)
 *    c.msg: 表示stringKey, q:schemas:type:id:{name:'lisi'}
 * 2.exports.redisConfig>>>subscribeSchema()中赋值
 *  (1)exports.redisConfig>>>redis.redisConfig>>>this.redis.redisConfig>>>queue.redis.redisConfig>>>RedisClient.redisConfig
 *  (2)RedisClient: 共享redis对象
 * 3.substr和substring的区别?
 *  (1)stringObject.substr(start,length)
 *  (2)stringObject.substring[start,stop): 不包括最后一个
 * 4.stringObject.slice[start,end): 不包括最后一个
 * 5.schemaMessage()有2个功能:
 *    a.处理msg字符串,取出id
 *      for()循环为了取出id,并添加到_msg数组中
 *      为什么不在_msg.slice(0,3)时,直接获取>>>代码改为_msg.slice(0,4)不就好了
 *      存在疑问???
 *    b.处理msg字符串,取出data任务数据(string>>>object)
 * 6.测试字符串: exports.schemaMessage("q:schemas:email1:10:\{\"name\":\"lisi\"\}")
 *   结果: [ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]
 * 7.
 * */
exports.schemaMessage = function (matchedChannel, channel, msg) {
    console.log('>>>>>schemaMessage Start<<<<<');
    let separator = exports.redisConfig.separator;
    let data = msg;
    let id = null;
    for (let i = 0; i <= 3; i++) {
        if (i === 2) {
            // data在这里没变
            id = data.substr(data.indexOf(separator) + 1);
            id = id.substring(0, id.indexOf(separator))
        }
        data = data.substr(data.indexOf(separator) + 1)
    }
    let _msg = msg.split(separator);
    _msg = _msg.slice(0, 3);
    _msg.push(id, JSON.parse(data));
    if (jobsMap.hasSubMap(_msg[2])) {  // _msg[2]任务分组
        jobsMap.getSubMap(_msg[2]).emit('message', _msg, msg)
        /*
         * jobsMap.getSubMap取出的是schema对象
         * schema.js的subType()/lockType()
         * .emit('命名事件'): 表示schema对象(EventEmitter)发出的，需要同一个schema对象去监听on这个命名事件
         * emit('message')和xqueue.js.ontime(){...schema.on('message')}和schema.js.on(...){...}相对应
         **/
    }
};

/**
 * 功能: 接收事件更新通知
 *      & 对args参数处理>>>obmsg
 *      & obmsg: object>>>string
 *      & 发送obmsg到q:events频道
 *      & subscribeEvent()>>>queueMessage()继续处理
 *
 * 通知位置
 * 1.job.js
 *  (1)_toComplete()>>>'complete'事件
 *  (2)_toActive()>>>'active'事件
 *  (3)_toFailed()>>>'failed'事件
 *  (4)_toRetry()>>>'retry'事件
 *  (5)_Inactive()>>>'promotion'事件
 *  (6)_inactiveState()>>>'enqueue'事件
 *  (7)_toDelay()>>>'delay'事件
 *
 * 2.xqueue.js
 *  (1)doPromote()>>>'promotion'事件(delay/retry>>>inactive)
 *  (2)removeTTLJobs()>>>'TTL exceed'事件
 *
 * 3.参数
 *  (1)id: 任务id>>>q:job:id
 *  (2)event: 任务事件>>>'delay','promotion','active','failed','complete','retry','enqueue'
 *  (3)type: 任务分组
 *  (4)args: 其他参数
 *      _toFailed: {err:err,stack:stack||0}>>>[ { err: 'err', stack: 'stack' } ]
 *      _toRetry: {retry_at: Date.now(), delay: delay}>>>[ { retry_at: 1528266719406, delay: 200000 } ]
 *      _toInactive: {promote_at: Date.now()}>>>[ { promote_at: 1528266839455 } ]
 *
 * 4.isNaN(x):
 *  (1) 用于检测parseFloat()和parseInt()的结果
 *  (2) 以判断它们是否是合法的数字
 *  (3) 是非法>>>true
 *  (4) 合法>>>false
 * */
exports.emit = function (id, event, type, ...args) {
    let pub = this.redis.createClient();
    let redis = this.redis; // RedisFactory对象，非node_redis对象
    exports.pubClient.push(pub);
    let obmsg = {id, event, type};
    let _msg = null;
    if (args !== []) {
        args = args.filter((x) => {
            if (isNaN(x) === false || typeof x === 'object') {
                // 1.
                _msg = Object.assign(obmsg, x);
                 // args=[]
            } else {
                // 2.
                return x // args=['延迟事件']
            }
        });
        _msg = Object.assign(obmsg, {args})
        /*
        * 1.如果args传入的是数字或对象，那么将args中的内容直接合并到obmsg{}
        *   {"id":1,"event":"failed","type":"email1","err":"错误信息","stack":"错误位置","args":[]}
        * 2.如果args传入的不是数字或对象(String)，那么将args中的内容添加到obmsg{}的args:[]属性中去
        *   {"id":2,"event":"delay","type":"email1","args":["延迟通知"]}
        * */
    } else { // args为空
        _msg = Object.assign({}, obmsg, {args: []})
    }
    obmsg = JSON.stringify(_msg);
    // 发送事件到q:events频道(subscribeEvent>>>queueMessage)
    pub.publish(redis.getKey('events', false), obmsg, function (err, num) {
        console.log('[queueEvent emit()]', err, num, '发布', obmsg, new Date())
    })
};

/**
 * 功能: map.js.subList.has()封装
 * */
exports.hasSubMap = (type) => {
    return jobsMap.hasSubMap(type)
};

/**
 * 功能: map.js.subList.add()封装
 * */
exports.addSubMap = (type, schema) => {
    jobsMap.addSubMap(type, schema)
};

/**
 * 功能: map.js.obList.add()封装
 * */
exports.addObJob = (id, job) => {
    jobsMap.addObJob(id, job)
};

exports.subClient = [];
exports.pubClient = [];
/**
 * 1.这里的exports相当于类中的this
 *   exports.queueMessage === 可以理解为class类中的this.queueMessage
 * 2.在其他js文件中导入
 *   let event = require('./queueEvent.js')
 *   event {
 *      subscribeEvent(),
 *      queueMessage(),
 *      subscribeSchema(),
 *      schemaMessage(),
 *      ...
 *      addObJob(),
 *      subClient,
 *      pubClient
 *   }
 *
 * */