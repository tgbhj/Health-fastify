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
        };

        this.shutDown = false; // xqueue.js.shutdown()>>>true>>>表示正在停止任务队列
        this._client = this.createClient()
    }

    /**
     * 功能: 返回client对象
     * 1.在index.js.createQueue时，创建的对象
     * 2.使用class的属性,set()和get()方法
     * */
    get client() {
        return this._client
    }

    /**
     * 功能: 返回分隔符,默认为':'
     * */
    get separator() {
        return this.redisConfig.separator
    }

    /**
     * 功能: 根据实例化时，传入的参数，创建node_redis对象
     * 1.可直接操作redis数据库，非RedisFactory实例，两者要区分开
     * 2.默认为redis数据库的第4分区
     * */
    createClient() {
        let client = redis.createClient(this.redisConfig.port, this.redisConfig.host, this.redisConfig.options);
        client.select(this.redisConfig.db);
        client.on('error', err => {
            if (err) {
                if (this.shutDown === true) { // 表示当正在停止任务队列时，创建node_redis时报错，直接返回

                } else {
                    console.log(err)
                }
            }
        });

        return client
    }

    /**
     * 功能: 根据实例化时，传入的参数，创建node_redis对象
     * 1.为Warlock使用创建的node_redis实例，锁，xqueue.js用到
     * 2.默认为redis数据库第5分区
     * */
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

    /**
     * createClient() & createLockClient()两个方法的区别?
     * 1.createClient()创建的是普通node_redis对象
     *  >>> 为subscribeEvent(redis)提供，监听q:events事件
     *  >>> 为subscribeSchema(redis)提供，监听键事件通知，__keyevent@$4__:expired
     *      每当一个键因为过期而被删除时，产生一个 expired 通知
     *
     * 2.createLockClient()创建的node_redis对象，是供Warlock使用
     *  >>> 在上锁和解锁时，会有过期事件的触发
     *  >>> [warlock key]:lock,其中[warlock key]为锁名,即key=[warlock key]
     *
     * 3.warlock上锁和解锁，也会触发 __keyevent@$4__:expired 过期事件
     *  >>> 如果共用一个分区，上锁和解锁会和原来由于业务逻辑而触发过期事件，造成冲突
     *
     * */

    /**
     * 功能: 根据传入的参数，参数个数，进行封装
     * 1.有序集合名 q:jobs:delayed & q:jobs:type:delayed
     * 2.列表名 q:type:jobs(type分组中，所有任务)
     * 3.哈希表名 q:jobs:id
     * 4.函数参数和arguments之间的关系
     * */
    getKey(key, separatorEnd) {
        let {prefix, separator} = this.redisConfig;
        let _key = prefix;
        if (arguments.length <= 2) {
            if (separatorEnd === undefined || separatorEnd === false) {
                // getKey(key)
                // getKey(key,undefined)
                // getKey(key,false)
                _key = prefix + separator + key
            } else if (separatorEnd === true) {
                // getKey(key,true)
                _key = prefix + separator + key + separator
            } else {
                // getKey(key,'123')
                _key = prefix + separator + key + separator + separatorEnd
            }
        } else {
            let argLen = 0;
            // 当arguments最后一个参数===false>>>argLen = arguments.length - 1
            // 当arguments最后一个参数!==false>>>argLen = arguments.length
            arguments[arguments.length - 1] === false
                ? argLen = arguments.length - 1
                : argLen = arguments.length;

            // 拼接
            for (let i = 0; i <= argLen - 1; i++) {
                _key += separator + arguments[i]
            }

            // 当arguments最后一个参数!==false & 且为true时
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
        return _key.toString()
    }

    /**
     * 功能: 将id封装成zid
     * */
    static createZid(id) {
        let idLen = id.toString().length;
        if (idLen === 1) {
            idLen = '0' + idLen
        }
        return idLen + '|' + id
    }

    /**
     * 功能: 将zid转成id
     * */
    static getIdFromZid(zid) {
        try {
            return zid.substring(zid.indexOf('|') + 1)
        } catch (e) {
            return null
        }
    }
}

module.exports = RedisFactory;