/*
* 本文件，记录fxqueue代码中发现的错误
* 1.job.js的priority()
*   priority(level) {
        this.priority = priorities[level];
        if (this.id) {
            this.setJob('priority', this.priority)
            this.setJob('update_at', this.priority)
        }
        return this;
    }
    this.setJob('update_at',this.priority) 应改为 this.setJob('update_at',Date.now())

* 2.queueEvent.js的hasSubMap()
*   exports.hasSubMap = (type, schema) => {
      return jobsMap.hasSubMap(type, schema);
    }
    应改为
    exports.hasSubMap = (type) => {
      return jobsMap.hasSubMap(type)
    }
*
* 3.xqueue.js的recoverAndClear()
*  redis.client
       .multi()
       .set(stringKey, 1)
       .expire(stringKey, 0)
       .exec(function (err) {
          if (err) {
             throw new Error(err)
          }
       })

   应改为
   redis.client
       .multi()
       .set(stringKey, 1)
       .expire(stringKey, 1) // 原expire(stringKey,0)
       .exec(function (err) {
          if (err) {
             throw new Error(err)
          }
       })

* 4.queueEvent.js的queueMessage()
*
*   ['complete', 'false'].indexOf(event) !== -1
*   应改为
*   ['complete', 'failed'].indexOf(event) !== -1
*
*   false >>> failed
*
*5.job.js的args()方法没有地方调用，这影响了this.args=null属性唯一赋值的函数
*  没有调用args()是什么意思
*
*
*6.job.js的on()方法
*  有代码:
*  let job1=queue.createJob('email1',{name:'zhangsan'}).dealy(10).save()
   job1.on('enqueue').then(data=>{
    console.log(data)
   })

   推断处job1.on('enqueue')必须返回一个promise对象，才可以继续使用链式写法来调用.then(...)方法
   而job.js的与原on()方法是
   on(event, callback) {
   super.on(event, function (msg) {
      callback(msg)
     })
   }
   中,并没有返回值,更加谈不上返回一个promise对象，所以推测这个方法啊有问题，于是改写
     on(event) {
    console.log('[job.js.on()方法]')
    return new Promise((resolve) => {
      super.on(event, function (msg) {
        // resolve(msg)
        console.log('[job.js.super.on()]')
        resolve('[job.on()]')
      })
    })
  }
  返回一个promise对象，该promise对象中，调用父类EventEmitter的on()来监听job实例发出的信息
  resolve()返回异步结果 >>> 外部就能拿到这个监听结果了(监听enqueue,active,promotion,failed,complete,retry)

*
*7.job.js的_toActive()方法
*multi.
* ...
* .zrem(getKey('jobs', 'inactive'), ttl || this.priority, zid)
* 删除时候，只要提供一个zid即可，为什么还要提供ttl || this.priority
* 应改为
* .zrem(geetKey('jobs','inactive'), zid) // 我觉得原来写法是不对的
*
*
* 8.job.js的_toActive()方法
* multi.
* ...
* .zrem(getKey('jobs', this.type, 'inactive'), zid)
* 应该要删除，但是缺少了这条删除q:jobs:email1:inactive的语句，我把它加上去了
*
*
* 9.map.js的deleteFromWorkMap()方法
* exports.deleteFromWorkMap = function(id,job){
*    jobsList.set(id,job)
* }
* 应改为
* exports.deleteFromWorkMap = function (id) {
  jobsList.delete(id)
}
*
* 10.Xqueue.js的doPromote(locdata){
*     ...
*     event.emit.bind(job)(jobs.id, 'promoting',job.type,[{promoted_at:Data.now()}])
*     jobs.id应改为job.id
*     'promoting'应改为'promotion'
*     [{promoted_at:Data.now()}]应改为{promote_at:Date.now()}
* }
*
* 11.Xqueue.js的removeTTLJobs(){...}
* 用于判断的job.complete，没有在Job.js.getJob()中添加这个属性，所以手动添加代码
* Job.js.getJob(id)中添加
*      if (hash.complete) {
*         job.complete = hash.complete
*      }
*
* 12.Job.js.constructor()中this.redis修改
* 原this.redis = queue.redis
* 改为this.redis = queue ? queue.redis : null
* 原因: Job.js.getJob()中有代码let job = new Job()
* 没有传入queue参数，按照原来的写法，此时运行queue.redis会报错
* */