const Schema = require('./schema');
const schema = new Schema();
const redis = require('redis');
const {log} = console;

// schema.useEvent() // [subscribeEvent] [useEvent redis]
// schema.useSchema() // [subscribeSchema] [useSchema redis]

/*
* 测试
* 当以键/值对保存在Redis中的记录过期时，会触发Redis键空间通知吗?
* */
// 添加定时任务
// schema.save()
//
// const RedisFactory = require('./redis')
// const Queue = require('./xqueue')
// const options = {
//   prefix: 'q',
//   name: 'xqueue'
// }
//
// const redisConfig = {
//   port: 6379,
//   host: 'localhost',
//   auth: 'foobared',
//   db: 4,
//   // options: {}
// }
//
// let RedisClient = new RedisFactory(options, redisConfig)
// new Queue(options, RedisClient).subcribeSchema()

const fxqueue = require('./index');
const queue = fxqueue.createQueue({
    options: {
        name: 'xqueue',
        prefix: 'q'
    },
    redisConfig: {
        port: 6379,
        host: 'localhost',
        auth: 'foobared',
        db: 4
    }
});

/*
* 定时任务事件
* 1.创建任务事件
* 2.监听定时任务
* */

// 1.创建任务事件
const type = 'zzzz'; // string
const data = {name: 'lisi'}; // object
/*
* type: 任务分组
* data: 任务数据
*
* 数据例子:
* createSchema('zzzz',{name:'lisi'})
* createSchema('qqqq',{name:'zhanglei'})
* */
// console.log('[time start]', new Date())
// 测试手动过期schema,触发queueEvent.js的subscribeSchema(){...}的schemaMessage()方法
// queue.createSchema(type, data).ttl(2000).schedule(200000).save()
// queue.createSchema(type, data).ttl(11000).schedule(200000).save()

/*
* case1: queue.ontime('zzzz')
* case2: queue.ontime({type:'zzzz',only:true})
* */
// const schemaObj1 = queue.ontime({type: 'zzzz', only: true})
// 如果在schemaObj1执行后，立即执行schemaObj2
// const schemaObj2 = queue.ontime({type: 'zzzz', only: true})
// 如果在schemaObj1执行后，延时2s，再执行schemaObj3
// setImmediate(function () {
//   const schemaObj3 = queue.ontime({type: 'zzzz', only: true})
//   schemaObj3
//     .then(res => {
//       let {id, data} = res
//       console.log('[schemaObj3 res]', id, data)
//     })
//     .catch(err => {
//       console.log('[schemaObj3 err]', err)
//     })
// }, 2000) // 延迟2s

// console.log('[schemaObj1]', schemaObj1)
// console.log('[schemaObj2]', schemaObj2)

// schemaObj1
//   .then(res => {
//     let {id, data} = res
//     console.log('[schemaObj1 res]', id, data) // 36 { name: 'lisi' }
//   })
//   .catch(err => {
//     console.log('[schemaObj1 err]', err)
//   })

// schemaObj2
//   .then(res => {
//     let {id, data} = res
//     console.log('[schemaObj2 res]', id, data) // 38 { name: 'lisi' }
//   })
//   .catch(err => {
//     console.log('[schemaObj2 err]', err)
//   })
/*
* 结论:
*   1.当传入的参数为{type:'zzzz',only:true}时，只有schemaObj1的promise值返回打印
*   2.当注释掉const schemaObj1 = queue.ontime({type: 'zzzz', only: true})时，schemaObj2的promise值才返回打印
*
* */

// ------------------------------------
// const schemaObj3 = queue.ontime('zzzz')
// const schemaObj4 = queue.ontime('zzzz')
//
// console.log('[schemaObj3]', schemaObj3)
// console.log('[schemaObj4]', schemaObj4)
//
// schemaObj3
//   .then(res => {
//     let {id, data} = res
//     console.log('[schemaObj3 res]', id, data)
//   })
//   .catch(err => {
//     console.log('[schemaObj3 err]', err)
//   })
//
// schemaObj4
//   .then(res => {
//     let {id, data} = res
//     console.log('[schemaObj4 res]', id, data)
//   })
//   .catch(err => {
//     console.log('[schemaObj4 err]', err)
//   })

// log('[this.id]', queue.id)
// xqueue:dcj-pc:9910
//  传参:主机名:进程PID

/*
* 1.从index.js中module.exports导出的是fxQueue对象{}
*   (1) 接下来，我们2种方式来使用它
*      queue.createJob()
*      queue.createSchema()
*
*   (2) fxqueue.createQueue()时，才会重新调用RedisClient
*
*   (3)否则, queue.createJob()和queue.createSchema()用一个RedisClient对象的
*
*   (4) 相同的，在使用fxqueue.createQueue()时，Warlock(this.redis)
*       因为this.redis就是RedisClient，而在
*       const queue = fxqueue.createQueue()调用1次的时候
*       RedisClient是同一个 >>> this.redis是同一个
*       Warlock也是同一个 >>> this.warlock也是同一个
*
* 2.queue.createSchema()
*   (1) 每次创建新的schema定时计划时，都会new一个新的schema对象
*       也就是说
*       queue.createSchema() --- 新schema对象1
*       queue.createSchema() --- 新schema对象2
*
*   (2) 根据type来取出schema对象，然后拿来emit...on...，难道type的的存储和type类型有关?
*       因为schema.emit(...)和schema.on(...)是要同一个对象才能发布/监听到
* */

// const RedisClient = queue.getRedisClient()
// RedisClient
//   .client
//   .multi()
//   .set('name', 1)
//   .expire('name', 0)
//   .exec((err) => {
//     console.log('[err]', err)
//   })

/*
* 创建队列任务
*   1.queue.createJob('email1',{name:'zhangsan'})
*     (1)优先级 priority
*     (2)延时任务
*     (3)backoff
*   2.任务行为事件监听
*     (1)当前任务对象事件监听
*     (2)队列任务事件监听
*   3.从队列获得任务
* */
// queue.createJob('email1', {name: 'zhangsan'})