const EventEmitter = require('events');
const event = require('./queueEvent');
const path = require('path');
const clientPayPath = path.resolve(process.cwd(), '/redis');
const RedisFactory = require('./redis');
const {clientPay} = require(clientPayPath);
const moment = require('moment');

class Schema extends EventEmitter {
    constructor(type, data, RedisClient, warlock) {
        super();
        /*
        * type,data
        * zzzz,{name:'lisi'}
        * qqqq,{name:'zhanglei'}
        * */
        this._ttl = null; // 任务生存时间
        this.timeStamp = null; // 定时任务执行时间戳
        this.redis = RedisClient; // RedisFactory类的实例对象，非node_redis操作对象
        this.id = null; // 新建定时任务序列id，当前是第几个定时任务(save()用)
        this.type = type; // 任务分组
        this.data = data; // 任务数据
        this.only = false; // ???
        this.warlock = warlock // ??? warlock是redis锁的功能，在哪个js文件中，实例化Schema时，带入了warlock参数
        // 答: 在queue.ontime()中实例化新的schema对象时,传入
    }

    /*
    * 定时创建定时任务，链式写法:
    * queue.createSchema('type',{data}).ttl(ttl).schedule(schedule).save()
    * */

    ttl(ttl) {
        this._ttl = +ttl | 0 || 0;
        /*
        * +: 一元运算符，如果操作数不是一个数值，会尝试将其转换成一个数值
        * | 0: 按位或，有去小数的功能
        * || 0: 逻辑或，取默认值0
        * */
        // console.log('[schema.js ttl]', this._ttl)
        return this // 返回this对象为了，能链式调用下面的方法
    }

    /*
    * queueEvent.js > subscribeSchema > jobsMap.getSubList(_msg[2]).emit('message')
    * _msg数组中的data，是object类型
    * msg数组中的data,是string类型
    * */
    on(event) {
        return new Promise((resolve, reject) => {
            super.on(event, (_msg, msg) => {
                // _msg >>> [ 'q', 'schemas', 'zzzz', '22', { name: 'lisi' } ]
                // msg >>> q:schemas:zzzz:22:{"name":"lisi"}
                this.type = _msg[2]; // 实例化时，传参
                this.id = _msg[3]; // save()中自增ids，因为queue.createSchema().ttl().schedule().save() --- 每次都会生成一个新的schema对象来执行任务，所以在这里修改this.id并不会影响save()中的this.id(它们是同一个this.id)
                this.data = _msg[4]; // 实例化时，传参
                this.keyString = msg;
                this.confirmed();
                resolve(this) // ??? 自己添加代码，将当前schema对象最为promise的返回结果
            })
        })
    }

    /*
     * 修改q:schema:1/q:schema:2/q:schema:100哈希集合的中state的状态
     * hset setName key value --- 赋值
     * hget setName key --- 获取集合中的key对应的value
     * hgetall setName --- 获取集合中所有
     * hdel setName key --- 删除集合中的key对应的value
     * del setName --- 删除整个集合
     */
    confirmed() {
        let redis = this.redis;
        redis
            .client
            .hset(redis.getKey('schema', this.id), 'state', 'confirmed', function (err) {
                if (err) {
                    throw new Error(err)
                }
            })
    }

    /*
     * timestamp
     * 1.定时增量 --- 增量 + new Date()
     * 2.定时时间 --- 任务执行时间
     * ??? 修改 差8个小时 见下面的处理方式
     */
    schedule(date) {
        if (typeof date === 'number') {
            // 定时增量
            this.timeStamp = date + Date.now()
            // console.log('[this.timeStamp]', this.timeStamp)
        } else {
            // 定时时间
            if (!isDate()) {
                throw new Error(`Date Invalid :${date}`)
            }
            // console.log('[date]', date)
            this.timeStamp = date.getTime() // 此时的date已经通过isDate()方法,date = new Date(date)
                                            // 所以，可以使用date.getTime()方法
        }

        function isDate() {
            let is_date;
            date = new Date(date);
            is_date = isFinite(date.getTime()) && Date.now() < date.getTime();
            return is_date
            /*
            * isFinite(有限数字或可以转成有限数字): true
            * isFinite(非数字NaN或无穷大/无穷小): false
            * eg:
            *   isFinite('123'): true
            *   isFinite(123): true
            *
            *   isFinite(date.getTime()) 用来判断date.getTime()是否为NaN
            *
            * */
        }

        // console.log('[schema.js schedule]', this.timeStamp)
        return this
    }

    useEvent() {
        event.subscribeEvent.bind(this)()
    }

    useSchema() {
        event.subscribeSchema.bind(this)()
    }

    /*
    *  创建定时任务
    *  step1 ttl()
    *  step2 schedule()
    *  step3 save()
    * */
    async save() {
        let multi = this.redis.client.multi();
        // this.redis.client()是RedisFactory的get client()方法
        // 不是node_redis中的client()方法
        // this.redis.client是构造方法中this._client方法
        // this.redis === RedisClient非node_redis对象，特别要注意
        // this.redis.getKey()是RedisFactory的方法

        let id = await new Promise((resolve, reject) => {
            this.redis.client.incr('ids', (err, id) => {
                (!err) ? resolve(id) : reject(new Error('error'))
            })
        });

        this.id = id; // 新建定时任务序列id，当前是第几个定时任务
        let stringKey = this.redis.getKey('schemas', this.type, id, JSON.stringify(this.data));
        // console.log('[stringKey]', stringKey) // q:schemas:zzzz:4:{'name':'lisi'}
        // console.log('[createZid]', this.redis.createZid(id)) // 01|4
        console.log('>>>>>schema.save() start<<<<<');
        // console.log('[this.timeStamp]', this.timeStamp)
        // console.log('[this._ttl]', this._ttl)
        console.log('[stringKey]', stringKey);
        // console.log('[this.data]', this.data)
        // console.log('[this.type]', this.type)
        console.log('>>>>>schema.save() end<<<<<');

        multi
            .zadd(this.redis.getKey('unconfirmed', 'schema'), this.timeStamp, RedisFactory.createZid(id)) // 有序集合q:unconfirmed:schema --- 未执行定时任务集合 & timeStamp定时任务执行时间
            .zadd(this.redis.getKey('schemas'), this.timeStamp, RedisFactory.createZid(id)) // 有序集合q:schemas --- 所有定时任务集合 & timeStamp定时任务执行时间
            .set(stringKey, 1) // q:schemas:zzzz:4:{'name':'lisi'}  & ???为什么设置为1
            .expire(stringKey, Math.round(this._ttl / 1000)) // 设置stringKey过期时间 & 定时任务超时处理??? & 单位为秒(s)
            .lpush(this.redis.getKey(this.type, 'schemas'), stringKey) // 列表(插入列表头)q:zzzz:schemas & 对所有定时任务进行分类
            .hset(this.redis.getKey('schema', this.id), 'ttl', this._ttl) // 哈希表-Key-Value q:schema:4
            .hset(this.redis.getKey('schema', this.id), 'schedule', this.timeStamp) // 任务执行时间
            .hset(this.redis.getKey('schema', this.id), 'data', JSON.stringify(this.data)) // 任务数据
            .hset(this.redis.getKey('schema', this.id), 'state', 'unconfirmed') // 任务状态
            .hset(this.redis.getKey('schema', this.id), 'type', this.type) // 任务分组
            .exec((err) => {
                if (err) {
                    console.log('[Schema save error]', err);
                    throw new Error(err)
                }
            });
        /*
        * ttl:任务生存时间
        * schedule:任务(定时任务)执行时间
        * data:任务数据
        * state:任务状态
        * type:任务分组
        *
        * save():
        * 1.有序集合 q:unconfirmed:schema --- 未执行定时任务集合
        * 2.有序集合 q:schemas --- 所有定时任务集合
        * 3.set/expire: q:schemas:zzzz:4:{'name':'lisi'} --- 仅为设置过期时间来触发queueEvent.js中的subscribeSchema(...)的(过期)键通知事件
        * 4.列表(插入列表头) q:zzzz:schemas/q:qqqq:schemas --- 定时任务分组列表
        * 5.哈希表 --- q:schema:4 ttl/timeStamp/data/state/type
        * 6.hset --- 对应hgetall来获取所有ttl/timeStamp/data/state/type
        *
        * */

        return id
        // const stringKey = 'q:schemas:sendMessage:1:{name:"lisi"}'
        // clientPay
        //   .multi()
        //   .set(stringKey, 1)
        //   .expire(stringKey, 10) // (单位:秒/s)
        //   .exec((err) => {
        //     if (err) {
        //       console.log('[save err]', err)
        //     }
        //   })

        // expire给任务设定过期时间
        // 在时间到期后，触发__keyevent@${redis.redisConfig.db}__:expired键事件通知
        // 键事件通知在queueEvent.subscribeSchema(...)中实现
    }

    subType(only) {
        if (only) {
            this.only = true; // this.only在queue.createSchema()中没有用到
                             // this.only在queue.ontime()中用到 -> ontime创建了一个新的schema对象
            this.lockType()
        } else {
            // event.addSubMap(type, schema)
            event.addSubMap(this.type, this)
            /*
            * subList.set(this.type,this)
            * subList.set(类型，当前实例)
            *
            * 同一个schema实例
            * 1.xqueue.ontime(...){
            *   let schema = new Schema(_type,null,this.redis,this.warlock)
            *   参数分析:
            *     (1)在最外部调用queue.ontime({type:type,only:true})
            *     (2)_type === type === 'zzzz'
            *     (3)this.redis和this.warlock在createQueue时传入
            *     this.redis = RedisClient(RedisFactory生成)
            *     this.warlock = Warlock(RedisClient);
            *     一次createQueue()调用一次RedisClient，所以使用的warlock也是同一个
            *  2.生成的schema实例，调用subType(_only)方法，根据参数_only值的不同，有不同的操作
            *     (1)当_only===false时，执行event.addSubMap(type='zzzz',schema实例)
            *        >>> subList(Map集合中添加了key=type(zzzz)
            *                                 value=schema实例对象)
            *        >>> 而queueEvent.js的schemaMessage()中jobsMap(就是queueEvent.js)根据类型(type)
            *        取出schema实例，用这个schema实例.emit('message',function(){...})来发送EventEmitter事件
            *
            *        >>> 总结:所有的类型为'zzzz'的使用了相同schema
            *            & 每次调用queue.ontime()都会生成新的
            *            & 但能够保证schema.emit(...)和schema.on(...)是同一个
            *     (2) 当_only===true时，
            *
            * }
            * */
        }
        return this
    }

    lockType() {
        let self = this;
        let lockTtl = 20000; // 20s
        let timeout = 1000; // 1s
        setImmediate(function () { // 延迟1s后执行
            self.warlock.lock(`schema${self.type}`, lockTtl, function (err, unlock) {
                // 上锁的key=schemazzzz & schematype
                if (err) {
                    console.log('[schema.js lockType]', err);
                    return
                }

                if (typeof unlock === 'function') {
                    // 如果subList中没有type类型，则添加
                    if (event.hasSubMap(self.type) === false) {
                        event.addSubMap(self.type, self)
                    } else {

                    }
                }
            })
        }, timeout)
    }
}

// new Schema().ttl('123')    // [ttl] 123 number
// new Schema().ttl('123.45') // [ttl] 123 number
// new Schema().ttl(123)      // [ttl] 123 number
// new Schema().ttl(123.45)   // [ttl] 123 number
// new Schema().ttl('12345x') // [ttl] 100 number --- 默认值
// new Schema().ttl('123.45x')// [ttl] 100 number --- 默认值
// console.log(+'12345x') // NaN
// console.log(+'123.45x')// NaN
// console.log(NaN | 0) // 0 --- 触发默认值

// new Schema().schedule(20000)
// new Schema().schedule(new Date(2018, 4, 16, 18, 14, 23, 111))
// console.log(new Date()) // 2018-05-16T09:50:02.296Z
// console.log(new Date().getTime()) // 1526464222168(ms)
// console.log(new Date(2018, 11, 24, 10, 33, 30, 123)) // 2018-12-24T02:33:30.123Z 月份+1
// console.log(new Date(2018, 5, 16, 18, 11, 23, 456))  // 2018-06-16T10:11:23.456Z 月份+1

// 差8个小时，手动修正
const d = new Date();
const d1 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 8, d.getMinutes(), d.getSeconds(), d.getMilliseconds());
// console.log('[d1]', d1, d1.getTime(), d1 instanceof Date)

// console.log(new Date('ddfdf').getTime()) // NaN
// console.log(new Date('12345x').getTime()) // NaN
// console.log(new Date('12345').getTime()) // NaN
// console.log(Date.now()) // NaN

// new Schema('zzzz', {name: 'lisi'}, new RedisFactory(
//   {
//     name: 'xqueue',
//     prefix: 'q'
//   },
//   {
//     port: 6379,
//     host: 'localhost',
//     auth: 'foobared',
//     db: 4
//   }
// )).save()

// const options = {
//   name: 'dcj123',
//   age: 123
// }
//
// console.log(options.sex)

module.exports = Schema;