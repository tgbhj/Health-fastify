/**
 * 计划任务类
 * */

const RedisFactory = require('./redis');
const EventEmitter = require('events');
const event = require('./queueEvent');

class Schema extends EventEmitter {
    /**
     * ttl: 任务最大完成耗时
     * timeStamp: 定时任务执行时间
     * redis: RedisFactory类的实例对象,非node_redis对象
     *        &共享redis对象(RedisFactory)
     * id: 新建任务id & 和job.save()任务共用ids
     * type: 任务分组 'email1'
     * data: 任务数据 {name:'zhangsan'}
     * only: ontime()调用subType的类型参数
     * warlock: redis强化分布式锁秀噶
     * */
    constructor(type, data, RedisClient, warlock) {
        super();
        this._ttl = null;
        this.timeStamp = null;
        this.redis = RedisClient;
        this.id = null;
        this.type = type;
        this.data = data;
        this.only = false;
        this.warlock = warlock // ??? warlock是redis锁的功能，在哪个js文件中，实例化Schema时，带入了warlock参数
        // 答: 在queue.ontime()中实例化新的schema对象时,传入
    }

    /**
     * 功能: 设置计划任务最大完成耗时
     * 1. 链式写法: return this
     * 2. +: 一元运算符,如果操作数不是一个数值, 会尝试将其转成一个数值
     * 3. |: 按位或, 去除小数
     * 4. ||): 逻辑或, 取默认值0
     * queue.createSchema('type',{data}).ttl(ttl).schedule(schedule).save()
     * */
    ttl(ttl) {
        this._ttl = +ttl | 0 || 0;
        return this
    }

    /**
     * 功能: 接收过期事件发送的message事件
     *       (1)queue.ontime()生成的新schema实例,非创建createSchema().save()的实例
     *
     * 1.过期事件expire+ontime(): 监听message事件 & subList.set(type任务分组, 新schema实例)
     * 2.返回结果schema实例给ontime()
     * 3.参数:
     *  (1)_msg数组中的data，是object类型: _msg: [ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]
     *  (2)msg数组中的data,是string类型: "q:schemas:email1:10:\{\"name\":\"lisi\"\}"
     * 4.this.keyString=msg: 表示新的schema实例, 监听到的过期事件
     * */
    on(event) {
        return new Promise((resolve, reject) => {
            super.on(event, (_msg, msg) => {
                this.type = _msg[2];
                this.id = _msg[3];
                this.data = _msg[4];
                this.keyString = msg; // done()方法中
                this.confirmed();
                resolve(this) // 自己添加代码，将当前schema对象作为promise的返回结果(因ontime().done(),确定on(event)返回schema实例)
            })
        })
    }

    /**
     * 功能: 更新q:schema:id集合的state属性
     *
     * 1.集合操作命令
     *  (1)hset setName key value --- 赋值
     *  (2)hget setName key --- 获取集合中的key对应的value
     *  (3)hgetall setName --- 获取集合中所有
     *  (4)hdel setName key --- 删除集合中的key对应的value
     *  (5)del setName --- 删除整个集合
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

    /**
     * 功能: 清除监听到的计划任务相关(列表,有序集合,集合)
     *     (1)queue.ontime()生成的新schema实例,非创建createSchema().save()的实例
     *
     * 1.lrem: 列表lrem key_name count value 移除列表中与参数value相等的元素.移除count个
     *  (1)count > 0 : 从表头开始向表尾搜索，移除与 VALUE 相等的元素，数量为 COUNT.
     *  (2)count < 0 : 从表尾开始向表头搜索，移除与 VALUE 相等的元素，数量为 COUNT 的绝对值.
     *  (3)移除表中所有与 VALUE 相等的值.
     * 2.lrem: 表示删除q:type:schemas列表中,value=this.keyString的元素, 删除1个
     * 3.zrem: 表示有序集合q:unconfirem:schema(未执行的计划任务集合)中删除对应zid
     * 4.del: 表示删除整个q:schema:id集合
     * */
    done() {
        return new Promise((resolve) => {
            let multi = this.redis.client.multi();
            let getKey = this.redis.getKey.bind(this.redis);
            let zid = RedisFactory.createZid(this.id);
            multi
                .lrem(getKey(this.type, 'schemas'), 1, this.keyString)
                .zrem(getKey('unconfirmed', 'schema'), zid)
                .del(getKey('schema', this.id))
                .exec((err) => {
                    if (err) {
                        throw new Error(err)
                    }
                })

        })
    }

    /**
     * 功能: 设置计划任务开始执行时间
     *
     * 1.定时增量(number) --- 任务执行时间 = 定时增量 + 当前时间
     * 2.定时时间(date) --- 任务执行时间
     * 3.有8小时时差
     * 4.链式写法:
     * 5.如果date本身是Date类型, 再new Date(date), 内容和类型保持不变
     * 6.isFinite():
     *    false: 正无穷大,负无穷大,NaN(非数字)
     *    true: 数字(123或'123')
     * 7.isDate(): 检查定时时间
     *   a.类型是否符合要求
     *   b.定时时间是否小于当前时间
     */
    schedule(date) {
        if (typeof date === 'number') {
            // 定时增量
            this.timeStamp = date + Date.now()
        } else {
            // 定时时间
            if (!isDate()) {
                throw new Error(`Date Invalid :${date}`)
            }
            /*
            * 1.此时的date已经通过isDate()方法,date = new Date(date)
            * 2.所以，可以使用date.getTime()方法
            * */
            this.timeStamp = date.getTime()
        }

        function isDate() {
            let is_date;
            date = new Date(date);
            is_date = isFinite(date.getTime()) && Date.now() < date.getTime();
            return is_date
        }

        return this
    }

    /**
     * 功能: 创建定时任务
     *
     * 1.client(): 返回this._client属性()>>>node_redis对象
     * 2.multi(): node_redis的事务处理
     * 3.id: 新建计划任务id & 和job任务队列共享ids
     * 4.expire(): 设置stringKey过期时间(最大任务耗时) & 单位(s)
     *   (1)在时间到期后，触发__keyevent@${redis.redisConfig.db}__:expired键事件通知
     *   (2)键事件通知在queueEvent.subscribeSchema(...)中实现
     * */
    async save() {
        let multi = this.redis.client.multi();
        let getKey = this.redis.getKey.bind(this.redis);
        let id = await new Promise((resolve, reject) => {
            this.redis.client.incr('ids', (err, id) => {
                (!err) ? resolve(id) : reject(new Error('error'))
            })
        });

        this.id = id;
        // q:schemas:type:id:{name:'lisi'}
        let stringKey = getKey('schemas', this.type, id, JSON.stringify(this.data));
        console.log('[schem.js.save().stringKey]', stringKey);

        /*
         * 列表:
         *    (1)q:type:schemas stringKey & 对所有计划任务进行分类
         * 集合:
         *    q:schema:id 对应job的 q:job:id
         *    (1)q:schema:id ttl 任务最大完成耗时
         *    (2)q:schema:id timeStamp 计划任务执行时间
         *    (3)q:schema:id data 任务数据
         *    (4)q:schema:id state 任务状态
         *    (5)q"schema:id type 任务分组
         * 键值:
         *    (1)set stringKey 1
         *    (2)expire stringKey ttl: 设置stringKey过期时间(最大任务耗时) & 单位(s)
         * 有序集合:
         *    q:unconfirmed:schema timeStamp zid 计划任务执行时间(未执行)
         *    q:schemas timeStamp zid 所有定时任务
         */
        multi
            .lpush(getKey(this.type, 'schemas'), stringKey) // 列表(插入列表头)q:zzzz:schemas & 对所有定时任务进行分类
            .hset(getKey('schema', this.id), 'ttl', this._ttl)
            .hset(getKey('schema', this.id), 'schedule', this.timeStamp)
            .hset(getKey('schema', this.id), 'data', JSON.stringify(this.data))
            .hset(getKey('schema', this.id), 'state', 'unconfirmed')
            .hset(getKey('schema', this.id), 'type', this.type)
            .set(stringKey, 1)
            .expire(stringKey, Math.round(this._ttl / 1000))
            .zadd(getKey('unconfirmed', 'schema'), this.timeStamp, RedisFactory.createZid(id))
            .zadd(getKey('schemas'), this.timeStamp, RedisFactory.createZid(id)) // 有序集合q:schemas --- 所有定时任务集合 & timeStamp定时任务执行时间
            .exec((err) => {
                if (err) {
                    console.log('[schema.js.save() error]', err);
                    throw new Error(err)
                }
            });

        return id
    }

    /**
     *  功能: 根据任务分组type, 将新schema实例添加到subList集合, 用于发送message事件.
     *       同一个任务分组type中的所有任务, 共享同一个schema实例
     *       subList.set(type任务类型, ontime()监听时,生成的新schema实例)
     *
     *  1.ontime(): 监听调用
     *  2.当only=false时
     *    (1)每次调用queue.ontime()都会生成新的schema对象
     *    (2)相同任务分组(type)的计划任务对应相同的schema对象
     *    (3)确定schema.emit(...)和schema.on(...)是相同实例
     *    (4)
     * */
    subType(only) {
        if (only) {
            this.only = true;
            this.lockType()
        } else {
            // only=false
            event.addSubMap(this.type, this)
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

module.exports = Schema;

/**
 * 已知的schema计划任务工作流程
 * 1.创建queue实例时, 启动this.subscribeSchema(), 监听过期键事件通知
 * 2.createSchema()....save(): 表示创建计划任务(expire stringKey ttl/1000)
 *   (1)stringKey: expire计划任务过期触发键过期频道, 并作为参数, 传递到schemaMessage()
 *                 >>>以数组形式, 作为监听结果
 *   (2)q:schema:id: 类似(q:job:id), 记录计划任务中的属性(ttl, timeStamp, data, state, type)
 *      ttl: 计划任务最大完成耗时. xqueue.checkSchemaTTL()中用到
 *      timeStamp: 计划任务执行时间. xqueue.checkSchemaTTL()中用到
 *      data: 计划任务数据
 *      state: 计划任务状态('unconfirmed','confirmed'). xqueue.checkSchemaTTL()中用到
 *      type: 计划任务类型. 一些有序集合中用到
 *   (3)q:unconfirmed:schema: 记录尚未执行计划任务的 执行时间 和 zid
 *      在xqueue.js.checkSchemaTTL()中, 当schema.state='confirmed'时, 删除zid
 *
 * 3.xqueue.checkSchemaTTL()
 *   (1)轮询q:unconfirmed:schema, 检查计划任务到达执行时间(应该过期), 计划任务的state状态
 *      a.state='unconfirmed', 表示该计划任务应该执行(过期), 但基于某种原因, 而没有执行(过期)
 *        (强制过期)
 *      b.state='confirmed',
 *        删除q:unconfirmed:schema中,对应的zid
 *        删除q:schema:id集合
 *        该功能和schema.js.done()的功能相同.
 *
 * 4.强制过期>>>queueEvent.subscribeSchema()>>>schemaMessage()
 *   (1)过期事件===stringKey>>>"q:schemas:email1:10:\{\"name\":\"lisi\"\}"
 *   (2)stringKey处理, 将stringKey以数组的形式呈现: [ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]
 *   (3)根据stringKey中的type计划任务分组, 向subList中获取schema实例(ontime()监听时,新建), 发送'message'事件
 *   schema.emit('message',...)
 *
 * 5.ontime(): 表示监听计划任务 & 两种模式
 *   (1)将新建的schem对象,根据type任务分组, 添加到subList, 为了在queueMessage()最后能获取到schema实例, 发送'message'事件
 *   (2)在queueMessage()获取到schema实例, 并发送'message'事件后, 调用schema.on('message')来监听'message'事件
 *   (3)schema.on(): 接收到数组参数[ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]
 *      并赋给新建schema实例, 并返回Promise{schema实例}
 *   (4)only=true
 *      a.多个queue队列使用同一个redis服务时,用到
 *   (5)only=false
 *      a.创建新的schema对象 & 并附带关键参数type
 *      b.subType(): >>>event.addSubMap(type,schema): 表示根据任务分组type,来添加对应的schema实例
 *   (6)return schema.on('message')>>>返回新的schema对象的on()方法
 *      a.on(event): 原来代码有错误,没写resolve(this),自己加上
 *      b.为什么写resolve(this), 因为从测试文件上看let getSchema = await queue.ontime('type') & getSchema.done()
 *      c.又调用了done()方法, 可以看出这个getSchema必须是schema实例, 所以写成resolve(this), promise返回schema实例
 *
 * 6.当计划任务到达最大完成耗时, 触发过期expire键事件(自动过期)
 *   (1)subscribeSchema()
 *   (2)schemaMessage()
 *      a.取出id
 *      b.取出data任务数据
 *      c.查询对应的type,有没有schema实例(这里和ontime()和subType()对上了)
 *      d.如果有, 则发送[ 'q', 'schemas', 'email1', '10', { name: 'lisi' } ]给ontime中的schema.on()监听
 *      e.schema.on()监听到后, 修改集合q:schema:id(对应job的q:job:id)的state属性
 *      d.done()方法是否调用, 看情况再说
 *
 * 7.总结
 *   (1)监听键过期通知: __keyevent@4__:expired
 *   (2)创建计划任务
 *   (3)自动过期>>>schemaMessage()>>>
 *      >>>若此时没有schema实例>>>无法发送'message'事件>>>schema.on()无法监听到>>>不会修改state的状态(state='unconfirmed')>>>跳转到强制过期
 *      >>>若此时已经schema实例>>>发送'message'>>>一定调用过ontime()
 *   (4)强制过期>>>
 *   (5)队列监听>>>
 *
 * */