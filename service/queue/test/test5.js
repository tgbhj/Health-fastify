/*
* 测试date，在new Date(date)
* 结论:
 date和date一样没什么区别
* */

const Promise = require("path");
const EventEmitter = require('events');
const {clientTest} = require('/redis');

function t1(date) {
    console.log('[date]', date, date instanceof Date);
    const date2 = new Date(date);
    console.log('[new Date(date)]', date2, date2 instanceof Date)
}

// t1(new Date())

function t2(id, event, type, ...args) {
    // let obmsg = {id: id, event: event, type: type}
    let obmsg = {id, event, type};
    console.log('[t2]', obmsg);
    console.log('[args]', args, args.length)
}

// t2('1', 'retry', 'email1', {retry_at: Date.now(), delay: 200000})
// t2('1', 'failed', 'email1', {err: 'err', stack: 'stack' || 0})
// t2('1', 'promotion', 'email1', {promote_at: Date.now()})

function t3(id, event, type, ...args) {
    let obmsg = {id, event, type};
    let _arg = [];
    let _msg = null;
    if (args !== []) {
        args = args.filter((x) => {
            if (isNaN(x) === false || typeof x === 'object') { // 当x是一个数字或者是一个对象时
                _msg = Object.assign(obmsg, x);
            } else { // 当x不是一个数字或者一个对象时
                return x
            }
        });
        _msg = Object.assign(obmsg, {args})
        /*
        * 如果args传入的是数字或对象，那么将args中的内容直接合并到obmsg{}
        * 如果args传入的不是数字或对象(String)，那么将args中的内容添加到obmsg{}的args:[]属性中去
        * */
    } else {
        // args为空
        _msg = Object.assign({}, obmsg, {args: []})
    }
    // object >>> string
    obmsg = JSON.stringify(_msg)
}

// 当args === 对象object
// t3('1', 'retry', 'email1', {retry_at: Date.now(), delay: 200000})
// [x] { retry_at: 1528269758231, delay: 200000 }
// [args] []
// [_msg] { id: '1',
//   event: 'retry',
//   type: 'email1',
//   retry_at: 1528269758231,
//   delay: 200000 }
// [_msg] { id: '1',
//   event: 'retry',
//   type: 'email1',
//   retry_at: 1528269758231,
//   delay: 200000,
//   args: [] }

// 当args === 数字
// t3('1', 'retry', 'email1', 1)
// [args] []
// [_msg] { id: '1', event: 'retry', type: 'email1' }
// [_msg] { id: '1', event: 'retry', type: 'email1', args: [] }

// 当args === 字符串
// t3('1', 'retry', 'email1', 'string字符串')
// [x] string字符串
// [args] [ 'string字符串' ]
// [_msg] null
// [_msg] { id: '1',
//   event: 'retry',
//   type: 'email1',
//   args: [ 'string字符串' ] }

async function t5_save() {

    let object = await new Promise((resolve, reject) => {
        return resolve('t5_save')
    });

    console.log('[t5_object]', object);

    return 't5'
}

function t5() {
    t5_save()
        .then(res => {
            console.log('[t5_res]', res)
        })
}

// t5()

class Job extends EventEmitter {
    constructor() {
        super();
        // ...
        this._delay = 0
    }

    on(event, callback) {
        super.on(event, function (msg) {
            callback(msg)
        });
        return Promise.resolve('123')
    }

    async save() {
        let object = await new Promise((resolve) => {
            // this.id = id;
            let multi = clientTest.multi();
            let hkey = 'q:job:100';
            this.created_at = Date.now();
            multi.hset(hkey, 'created_at', Date.now())
                .exec((err, effectNum) => {
                    if (err) {
                        return super.emit('error', err)
                    }
                    return resolve(effectNum + ':No.1')
                });

            Job.addTypes();
            Job.addIntoJobs();
            // event.addObJob(this.id, this);
            if (this._delay !== 0) {
                return Job.state('delay') // 这里的return只是
            }
            // this._state = this._state || 'inactive';
            Job.state('inactive')
        });

        //
        console.log('[save_object]', object, ':No.2');
        return this
        /*
        * return
        * 除了最后一个return this，表示返回this(job)对象
        * 其他的return的功能仅仅表示流程上的判断与走向
        * */
    }

    static addTypes() {
        console.log('addTypes', ':No.2')
    }

    static addIntoJobs() {
        console.log('addIntoJobs', ':No.3')
    }

    static state(state) {
        console.log('[state]', state, ':No.4')
    }
}

// const job = new Job()
// const event = 'enqueue'
// const data = '我已经加入队列'
// job.on(event, function (msg) {
//   console.log('[job on]', msg)
// })
//   .then(data => {
//     console.log('[then data]', data)
//   })
// job.emit(event, data)

/*
* 测试返回值t6
* */
async function t6() {
    const job = new Job();
    const saveRes = await job.save();
    console.log('[t6]', saveRes)
}

// t6()