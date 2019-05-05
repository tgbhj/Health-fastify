// 发布的消息频道
const obList = new Map();
// 键事件通知(键空间通知&键事件通知)
const subList = new Map();
// 正在进行的工作
const jobsList = new Map();

exports.obList = obList;
exports.subList = subList;
exports.jobsList = jobsList;

// add
// has
// get
// clear
// delete
exports.addObJob = (id, job) => {
    obList.set(id, job)
};

exports.hasObJob = (id) => {
    return obList.has(id)
};

exports.getObJob = (id) => {
    return obList.get(id)
};

exports.clearObMap = () => {
    obList.clear()
};

exports.deleteFromObMap = (id) => {
    obList.delete(id)
};

// has
// get
// add
// clear
// deleteFromObMap & deleteFromWorkMap

// 键事件通知
exports.hasSubMap = function (type) {
    return subList.has(type)
};

exports.getSubMap = function (type) {
    return subList.get(type)
};

exports.addSubMap = function (type, schema) {
    subList.set(type, schema)
    /*
    * schema.js的subType()/lockType()
    * */
};

exports.clearSubMap = function () {
    return subList.clear()
};

// 工作队列
exports.addInWorkMap = function (id, job) {
    jobsList.set(id, job)
};

exports.deleteFromWorkMap = function (id) {
    jobsList.delete(id)
};

exports.clearWorkMap = function () {
    jobsList.clear()
};

exports.hasWorkMap = function (id) {
    return jobsList.has(id)
};

exports.getWorkMap = function (id) {
    return jobsList.get(id)
};

/*
* jobsList>>>工作队列
*         >>>任务事件
*         >>>调用getJob(),将job实例添加到jobsList
*                        当事件为delay,retry,inactive时,更新事件,然后返回job实例
*                        否则,直接返回job实例
*         >>>调用done(),  当传参不是Error对象时,标记任务成功,将job实例从jobsList中删除
*                        当传参为Error对象时,标记任务失败
*         >>>相同的id,多次getJob(),只会更新(key=id,value=job实例)
*
* addInWorkMap:
* (1)xqueue.js.getJob(id)
*
* deleteFromWorkMap
* (1)xqueue.js.done()
*
* clearWorkMap
* (1)worker.js.clear()
*
* hasWorkMap
*
* getWorkMap
* */

/*
* obList>>>发布消息的频道
*       >>>该map中的(键,值)队用来接收/发布, 各个任务事件修改时的通知
*       >>>例如,event.emit.bind(this)('id','delay',...)
*       >>>job.hasObJob(id)
*       >>>job.getObJob(id)
*       >>>job.emit(event,message)
*
* addObJob
* (1)job.js.save()
* (2)xqueue.js.observed()
*
* hasObJob
* (1)queueEvent.js.queueMessage()
*
* getObJob
* (1)queueEvent.js.queueMessage()
*
* clearObMap
* (1)worker.js.clear()
*
* deleteFromObMap
* (1)queueEvent.js.queueMessage()
* */

/*
* subList>>>过期事件触发时
*        >>>计划任务执行时间到达任务最大完成耗时,触发__keyevent@4__:expired过期事件
*        >>>
*
* 1.addSubMap
* (1)schema.js.subType()>>>用的是(3)
* (2)schema.js.lockType()>>>用的是(3)
* (3)queueEvent.js.addSubMap()>>>对map.js.addSubMap()的封装
*
* 2.getSubMap
* (1)queueEvent.js.schemaMessage()>>>用的是map.js.getSubMap()原生方法
*
* 3.hasSubMap
* (1)schema.js.lockType()>>>用的是(2)
* (2)queueEvent.js.hasSubMap()>>>对map.js.hasSubMap()的封装
* (3)queueEvent.js.schemaMessage()>>>用的是map.js.hasSubMap()原生方法
*
* 4.clearSubMap
* (1)worker.clear()>>>用的是map.js.clearSubMap()原生方法
* */