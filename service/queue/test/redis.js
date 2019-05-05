const EventEmitter = require('events');
const redis = require('redis');

/*
* db: 4支付消息队列
* db: 5支付消息队列锁warlock用(lock-RedisClient-lock) 互斥锁的意思
* */
class RedisFactory extends EventEmitter {
    constructor(options = {}, redisConfig) {
        super();
        // options = {} 解构赋默认值 等同于 下面语句
        // if (options === undefined) options = {}
        // console.log('[RedisFactory]', options)
        // console.log('[redisConfig]', redisConfig)
        // console.log('[redisConfig[socket]]', redisConfig['socket'])
        // console.log('[redisConfig.socket]', redisConfig.socket)
        this.redisConfig = {
            socket: redisConfig.socket || null,
            port: redisConfig.port || 6379,
            host: redisConfig.host || 'localhost',
            auth: redisConfig.auth || null,
            password: redisConfig.password || {},
            db: (+redisConfig.db | 0 || 0) || 3, // 当传入db === '123x'时，会启用默认值4
            // options: redisConfig.options || {},
            options: {
                password: redisConfig.auth,
                // db: redisConfig.db,
            } || {},
            prefix: options.prefix || 'q', // 当options={}时，options.prefix === undefined
            separator: options.separator || ':',
        };

        this.shutDown = false; // xqueue.js.shutdown()>>>true>>>表示正在停止任务队列
        this._client = this.createClient()
    }

    get client() { // class的属性可以有get()和set()方法
        return this._client // 在schema.js.save()方法中用到
    }

    createClient() {
        let client = redis.createClient(this.redisConfig.port, this.redisConfig.host, this.redisConfig.options);
        client.select(this.redisConfig.db);
        client.on('error', err => {
            if (err) {
                if (this.shutDown === true) {

                } else {
                    console.log(err)
                }
            }
        });

        return client
    }

    createLockClient() {
        let client = redis.createClient(this.redisConfig.port, this.redisConfig.host, this.redisConfig.options);
        client.select(5);
        client.on('error', err => {
            if (err) {
                if (this.shutDown === true) {

                } else {
                    console.log(err)
                }
            }
        });

        return client
    }

    getKey(key, separatorEnd) {
        const {prefix, separator} = this.redisConfig; // test.js传递进来的
        // console.log('[getKey]', prefix, separator) // prefix = q & separator = : & 由new RedisFactory(options,redisConfig)时传入
        // key = events & 来自queueEvent.js.subscribeEvent()
        let _key = prefix;
        if (arguments.length <= 2) {
            if (separatorEnd === undefined || separatorEnd === false) {
                _key = prefix + separator + key
            } else if (separatorEnd === true) {
                _key = prefix + separator + key + separator
            } else {
                _key = prefix + separator + key + separator + separatorEnd
            }
        } else {
            let argLen = 0;
            arguments[arguments.length - 1] === false
                ? argLen = arguments.length - 1 // 3 (for循环argLen:0-2过滤了false参数)
                : argLen = arguments.length; // 4 (for循环argLen:0-3全部)

            for (let i = 0; i <= argLen - 1; i++) {
                _key += separator + arguments[i]
            }

            if (arguments[arguments.length - 1] === true) {
                _key += separator
            }

            /*
            * 当参数>=2个时
            * 1.(1,2,false) - q:1:2
            * 2.(1,2,3) - q:1:2:3
            * 3.(1,2,true) - q:1:2:3:
            * */
        }
        // console.log('[getKey 输出]', _key.toString())
        return _key.toString()
    }

    /*
    * schema.js.save()中用到
    * ???
    * 为什么要在01|1之前要加0
    * 而在3|123之前不加0
    * */
    static createZid(id) {
        let idLen = id.toString().length;
        if (idLen === 1) {
            idLen = '0' + idLen
        }
        // console.log(`[createZid] ${id} - ${idLen}|${id}`)
        return idLen + '|' + id
    }

    static getIdFromZid(zid) {
        try {
            // console.log('[zid.substring]', zid.substring(zid.indexOf('|') + 1))
            return zid.substring(zid.indexOf('|') + 1)
        } catch (e) {
            return null
        }
    }
}

const options = {
    prefix: 'q123',
    name: 'xqueue'
};

const redisConfig = {
    port: 6379,
    host: 'localhost',
    auth: 'foobared',
    db: 4,
    // options: {}
};

// new RedisFactory(options, redisConfig).createClient()
// 参数 <= 2
// new RedisFactory(options, redisConfig).getKey('events')        // [_key] q123:events
// new RedisFactory(options, redisConfig).getKey('events', false) // [_key] q123:events
// new RedisFactory(options, redisConfig).getKey('events', true)  // [_key] q123:events:
// new RedisFactory(options, redisConfig).getKey('events', 123)   // [_key] q123:events:123
// new RedisFactory(options, redisConfig).getKey('events', 'dcj') // [_key] q123:events:dcj
// new RedisFactory(options, redisConfig).getKey('events', {name: 'dcj123'}) // [_key] q123:events:[object Object]

// 参数 > 2
// new RedisFactory(options, redisConfig).getKey('events', 'arg1', 'arg2', 'arg3') // [_key] q123:events:arg1:arg2:arg3
// new RedisFactory(options, redisConfig).getKey('events', 'arg1', 'arg2', 'arg3', false) // [_key] q123:events:arg1:arg2:arg3
// new RedisFactory(options, redisConfig).getKey('events', 'arg1', 'arg2', 'arg3', true) // [_key] q123:events:arg1:arg2:arg3:true:
// new RedisFactory(options, redisConfig).getKey('emails', 'jobs', false) // q123:emails:jobs
// new RedisFactory(options, redisConfig).getKey('job', '12345', false)   // q123:job:12345
// new RedisFactory(options, redisConfig).getKey('jobs', 'delay', false)  // q123:jobs:delay
// new RedisFactory(options, redisConfig).getKey('jobs', 'email1', 'delay', false) // q123:jobs:email1:delay
// new RedisFactory(options, redisConfig).getKey('jobs', 'delay', false) // q123:jobs:delay

// new RedisFactory(options, redisConfig).createZid(0) // 01|0
// new RedisFactory(options, redisConfig).createZid(1) // 01|1
// new RedisFactory(options, redisConfig).createZid(12) // 2|12
// new RedisFactory(options, redisConfig).createZid(123) // 3|123
//
// new RedisFactory(options, redisConfig).getIdFromZid('01|1') // 1
// new RedisFactory(options, redisConfig).getIdFromZid('01|2') // 2
// new RedisFactory(options, redisConfig).getIdFromZid('2|12') // 12
// new RedisFactory(options, redisConfig).getIdFromZid('3|123')// 123

// job.js的_toDelay()中用到
// let j1 = new RedisFactory(options, redisConfig).getKey('jobs', 'delayed', false)
// let j2 = new RedisFactory(options, redisConfig).getKey('jobs', 'email1', 'delayed', false)
// console.log('[j1]', j1)
// console.log('[j2]', j2)
// [j1] q123:jobs:delayed
// [j2] q123:jobs:email1:delayed
// let q1 = new RedisFactory(options, redisConfig).getKey('events', false)

module.exports = RedisFactory;

/*
// function dbHandle(db) {
//   console.log((+db | 0 || 0) || 3)
// }
//
// dbHandle('123') // 123
// dbHandle(123) // 123
// dbHandle('456.78') // 456
// dbHandle(456.78) // 456
// dbHandle('123x') // 3
//
// console.log(+'123x') // NaN
// console.log(NaN | 0) // 0
// console.log(0 || 0) // 0
// console.log(0 || 3) // 3
*/