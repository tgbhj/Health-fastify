const fxqueue = require('fxqueue');
const queue = fxqueue.createQueue({
    options: {
        prefix: 'q',
        name: 'xqueue'
    },
    redis: {
        port: 6379,
        host: 'localhost',
        auth: '',
        db: 3,
        options: {}
    }
});

const queue2 = fxqueue.createQueue({
    options: {
        prefix: 'q',
        name: 'xqueue'
    },
    redis: {
        port: 6379,
        host: 'localhost',
        auth: '',
        db: 3,
        options: {}
    }
});

const type = 'zzzz'; // string
const data = {name: 'lisi'}; // object

let schema = queue.createSchema(type, data).ttl(5000).schedule(5000).save();
// let schema = queue.createSchema(type, data).ttl(15000).schedule(15000).save()
// console.log('[schema]', schema) // async save(){} >>> 返回promise对象(id)
// schema
//   .then(res => {
//     console.log('[res]', res)
//   })
//   .catch(err => {
//     console.log('[err]', err)
//   })

const schemaObj3 = queue.ontime('zzzz');
const schemaObj4 = queue2.ontime('zzzz');

// 延迟监听
// setTimeout(function () {
//   const schemaObj5 = queue.ontime('zzzz')
//   schemaObj5
//     .then(res => console.log('[res]', res['id'], res['data']))
//     .catch(err => console.log('[err]', err))
// }, 20000)

// console.log('[schemaObj3]', schemaObj3)
// console.log('[schemaObj4]', schemaObj4)

schemaObj3
    .then(res => {
        let {id, data} = res;
        console.log('[schemaObj3 res]', id, data)
    })
    .catch(err => {
        console.log('[schemaObj3 err]', err)
    });

schemaObj4
    .then(res => {
        let {id, data} = res;
        console.log('[schemaObj4 res]', id, data)
    })
    .catch(err => {
        console.log('[schemaObj4 err]', err)
    });

// test2.js __keyevent@4__:expired
// 搞不懂，为什么，没有触发过期事件
// 回答: 触发事件了，要直接输入命令redis-server /usr/local/redis-3.0.6/redis.conf
// 为什么直接触发了 activeJobsTTL:lock过期事件，我不要这个过期事件啊?
// 为什么自己写的，就没有触发?搞不懂?
// 回答: 所有的原因都出在redis的分区上
// 自己写的代码: 业务分区:4 lock分区:5
// fxqueue的代码: 业务分区:3 lock分区:4
// 而我在使用fxqueue时，业务代码的参数db:4，造成了业务分区:4 lock:4，从而造成了冲突
// 在activeJobsTTL:lock过期时，也触发了expired键事件通知，造成了后续的一系列问题

/*
* 测试1: 测试在创建定时任务后，schemaObj3和schemaObj4分别监听类型为'zzzz'
* 结果: 只有schemaObj4
* */

/*
* 测试2:当定时任务时间(当前时间+定时任务时间)<10s，也就是在第一次10s轮询之前就expired过期了
*     queue.createSchema('zzzz',{name:'lisi'}).ttl(5000).schedule(5000).save()
*     (1)q:unconfirmed:schema 任务执行时间 id(自增涨)
*     (2)q:schemas 任务执行时间 id(自增涨) (不做修改)
*     (3)q:schemas:zzzz:1:{name:'lisi'} set/expires
*     (4)q:zzzz:schemas (不做修改)
*     (5)q:schema:1
*
*     (1)在第一次扫描之前，过期
*     (2.1)触发schemMessage(...) >>> 类型绑定的schema实例.emit('message',{...})
*     (2.2)同时监听ontime(...) >>> 给类型绑定schema实例 >>> 返回return 类型绑定schema实例.on(...) >>> 返回promise结果并修改q:schema:id中的状态
*     (2.3)emit('message',{...}) >>> 通过queue.ontime({type:'zzzz',only:true})立即接收到
*
*     // q:unconfirmed:schema 存在 没变化
*     // q:schemas 存在 没变化
*     // q:schemas:zzzz:1:{name:'lisi'} set/expires 不存在 过期被删除
*     // q:zzzz:schemas 存在 没变化
*     // q:schema:1 存在 变化 state = 'unconfirmed' >>> state = 'confirmed'
*     // expires过期的完成的操作如下
*     // (1)删除q:schemas:zzzz:1:{name:'lisi'} 字符串
*     // (2)修改状态state='confirmed'
*
*     (3)开始第一次扫描
*     (4)检索q:unconfirmed:schema集合 >>> 获取符合条件的ids
*     (5)通过ids，检索q:schema:id >>> 条件判断state
*     (6.1)state === 'unconfirmed' >>> 过期触发 >>> q:schemas:zzzz:id:{name:'lisi'}
*     (6.2)state === 'confirmed' >>> 删除q:schema:id
*                                >>> 删除q:unconfirmed:schema对应的id项
*     (6.3)当前state === 'confirmed' >>> 删除q:schema:id
*                                   >>> 删除q:unconfirmed:schema中对应的id选项
* */

/*
* 测试3:当定时任务时间>10s，...
*     queue.createSchema('zzzz',{name:'lisi'}).ttl(15000).schedule(15000).save() --- 15s
*     (1)q:unconfirmed:schema 任务执行时间 id(自增涨)
*     (2)q:schemas 任务执行时间 id(自增涨) (不做修改)
*     (3)q:schemas:zzzz:1:{name:'lisi'} set/expires
*     (4)q:zzzz:schemas (不做修改)
*     (5)q:schema:1
*
*     (1.1)等待第一次扫描，不符合条件10s
*     (1.2)在下一次扫描前，自动过期
*     (1.3)修改了state，state='confirmed'
*     (2.1)等待下一次扫描
*     (2.2)检索到符合条件的ids
*     (2.3)通过ids,检索q:schema:id >>> 条件判断state
*     (2.4)state='confirmed'
*     (2.5)删除q:schema:id
*          删除q:unconfirmed:schema中对应的id选项
*
*       [schemaObj3] Promise { <pending> }
        __keyevent@3__:expired 已经订阅
        [定时循环] --------------------------------------------------------------第一次遍历 10s
        [键事件通知] __keyevent@3__:expired q:schemas:zzzz:1:{"name":"lisi"} ----定时任务启动/过期 15s
        [修改state状态为confirmed][type] zzzz  [id] 1 ---------------------------修改状态state
        [schemaObj3 res] 1 { name: 'lisi' } ------------------------------------监听结果
        [定时循环] --------------------------------------------------------------第二次遍历 20s
        [ids] 1 ----------------------------------------------------------------检索q:unconfirmed:schema集合，得到ids
        [recoverAndClear] ------------------------------------------------------处理
        [confirmed 清理] confirmed false ----------------------------------------state='confirmed' 15s(定时/延迟时间)+15s(最大执行时间) = 30s > 20s，不执行代码
        [定时循环] ---------------------------------------------------------------第三次遍历 30s，可能没这么精确比如30.1234567s
        [ids] 1 -----------------------------------------------------------------检索q:unconfirmed:schema集合，得到ids
        [recoverAndClear] -------------------------------------------------------处理
        [confirmed 清理] confirmed true ----------------------------------------- 30.123456s > 30s，删除q:schema:id和删除q:unconfirmed:schema中对应的id选项
        [定时循环] --------------------------------------------------------------- 程序继续轮询
        [定时循环] --------------------------------------------------------------- 程序继续轮询
*
* */

/*
* 测试4: 假设我们不掉用ontime()方法
*   如果我们queue.createSchema('zzzz',{name:'lisi'}).ttl(15000).schedule(15000).save()
*   此时，我们不掉用queue.ontime(...){...}方法，那么就没有生成一个新的schema对象，保存在subList中，
*   那么，当过期时，触发schemaMessage(){}时，jobsMap.getSubList()就拿不到schema对象，导致schema.emit(...){...}就不会发生
*   所以，ontime()不掉用，会造成以下2个结果
*   (1) subList中不会保存schema对象 >>> 在过期触发时，不会发送schema.emit() & 同时也不会有schema.on()
*   (2) 没有schema.on()会导致 >>> 不会修改state状态
*   (3) 重新创建后，为什么没有触发过期键事件 >>> expire(...,0)为什么不触发keyevent事件
*       结论: 不清楚为什么expire(...,0)不会触发keyevent事件
*       但是exipre(...,1)会触发keyevent事件
*   (4) 触发keyevent事件，为了什么，就是为了能够schema.emit()，然后给queue.ontime(){}去监听，从而导致最终目的修改state的状态
*       以至于，在每次定时循环时，能够检索到state==='confirmed'，删除q:schema:id和删除q:unconfirmed:schemas中类型对应的id
* */
// const redis = require('redis')
// const auth = ''
// const partTest = 6
// const config = {
//   redisHost: 'localhost',
//   redisPort: '6379'
// }
// const redisConfig = {
//   db: 6
// }
//
// const clientTestSub = redis.createClient(Object.assign({}, auth, partTest, {
//   host: config.redisHost,
//   port: config.redisPort
// }))
//
// const clientTestPub = redis.createClient(Object.assign({}, auth, partTest, {
//   host: config.redisHost,
//   port: config.redisPort
// }))
//
// // console.log('[clientTestPub]', clientTestPub)
//
// clientTestSub.on('pmessage', function (matchedChannel, channel, msg) {
//   console.log('[键事件通知]', channel, msg)
// })
// clientTestSub.psubscribe(`__keyevent@${redisConfig.db}__:expired`, function (err, channel) {
//   // 订阅频道名称
//   console.log(channel, '已经订阅')
// });

// clientTestPub
//   .multi()
//   .set('q:schemas:zzzz:1:{name:"lisi"}', 1, function (err, res) {
//     console.log('[res]', res)
//   })
//   .expire('q:schemas:zzzz:1:{name:"lisi"}', 1, function (err, resEx) {
//     console.log('[resEx]', resEx)
//   })
//   .exec((err) => {
//     console.log('[err]', err)
//   })

// clientTest.multi()
//   .set('name', 1)
//   .expire('name', 0)
//   .exec((err) => {
//     if (err)
//       throw new Error(err);
//   })

/*
* sub/pub必须使用2个不同的client
* */

/*
* 1.疑问1: api中的2中ontime(){}到底有什么区别
* 2.疑问2: 是不是我不调用queue.ontime() >>> 可以延迟监听
* */

/*
* ttl:5000 >>> 5s
* schedule:5000 >>> 5s
* timeout+lockTtl:12000 >>> 12s,共计22s
* ontime()延迟20s后，开始监听
*
* [键事件通知] __keyevent@3__:expired q:schemas:zzzz:1:{"name":"lisi"} ---------- 5s
  [jobsMap.hasSubMap(_msg[2])] false ------------------------------------------- 触发keyevent，因为没有ontime()监听，所以无法修改状态
  [定时循环] -------------------------------------------------------------------- 10s
  [ids] 1 ---------------------------------------------------------------------- q:unconfirmed:schemas中符合的
  [recoverAndClear]
  [hgetall q:schema:id] { ttl: '5000',
    schedule: '1527662651159',
    data: '{"name":"lisi"}',
    state: 'unconfirmed',
    type: 'zzzz' }
  [uncomfirmed]
  [定时循环] -------------------------------------------------------------------- 20s，开始ontime()，开始监听schema.on('message',function(){})
  [ids] ------------------------------------------------------------------------ 最大时间为22s > 20s，所以没有触发keyevent事件
  [recoverAndClear]
  [hgetall q:schema:id] { ttl: '5000',
    schedule: '1527662651159',
    data: '{"name":"lisi"}',
    state: 'unconfirmed',
    type: 'zzzz' }
  [uncomfirmed]
  [定时循环] -------------------------------------------------------------------- 触发keyevent事件 & 正在监听
  [ids] 1
  [recoverAndClear]
  [hgetall q:schema:id] { ttl: '5000',
    schedule: '1527662651159',
    data: '{"name":"lisi"}',
    state: 'unconfirmed',
    type: 'zzzz' }
  [uncomfirmed]
  [重新创建] q:schemas:zzzz:1:"{\"name\":\"lisi\"}"
  [键事件通知] __keyevent@3__:expired q:schemas:zzzz:1:"{\"name\":\"lisi\"}"
  [jobsMap.hasSubMap(_msg[2])] true
  [修改state状态为confirmed][type] zzzz  [id] 1
  [res] 1 {"name":"lisi"}
  [定时循环]
  [ids] 1
  [recoverAndClear]
  [hgetall q:schema:id] { ttl: '5000',
    schedule: '1527662651159',
    data: '{"name":"lisi"}',
    state: 'confirmed',
    type: 'zzzz' }
  [confirmed 清理] confirmed true
  [定时循环]
*
*
* */