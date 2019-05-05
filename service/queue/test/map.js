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