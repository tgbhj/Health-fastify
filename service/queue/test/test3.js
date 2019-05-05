/*
* 测试Promise和EventEmitter
* */

const EventEmitter = require('events');
const {clientTest} = require('/redis');
const {log} = console;

class Job extends EventEmitter {
    constructor() {
        super();
        this.eventError()
    }

    eventError() {
        super.on('error', err => {
            console.log('[eventError]', err, typeof err)
            // throw new Error(err)
        })
    }

    async saveTest() {
        let saveResInner = super.emit('error', '错误信息');
        console.log('[saveResInner]', saveResInner); // true
        return saveResInner
    }

    async saveTest2() {
        let saveTest2Inner = super.emit('message', '普通消息');
        console.log('[saveTest2Inner]', saveTest2Inner);
        return saveTest2Inner
    }

    async saveTest3() {
        // let _super = super
        // let id = await new Promise((resolve, reject) => {
        //   clientTest
        //     .incr('ids', (err, id) => {
        //       // (!err)
        //       //   ? resolve(id)
        //       //   : reject(new Error('error'))
        //       // resolve(id)
        //       reject(new Error('自定义error'))
        //     })
        // })
        //   .catch(err => {
        //     console.log('[saveTest3 catch]', err.message, err instanceof Error) // Error类型
        //     return super.emit('error', new Error(err))
        //   })
        // log('[id]', id) // resolve(id)

        let id = await new Promise((resolve, reject) => {
            clientTest
                .incr('ids', (err, id) => {
                    // (!err)
                    //   ? resolve(id)
                    //   : reject(new Error('error'))
                    reject(new Error('自定义错误'))
                })
        }).catch((error) => {
            return super.emit('error', error);
        })

        // 1.直接
        // super.emit('error', new Error('自定义error')); // [saveRes3] Promise { undefined }
        // 2.return
        // return super.emit('error', new Error('自定义error')) // [saveRes3] Promise { true }
        // 3.try...catch...
        // try {
        //   throw new Error('try...catch...error')
        // } catch (err) {
        //   console.log('[try...catch...]', err)
        //   super.emit('error', new Error('自定义错误')) // [saveRes3] Promise { true }
        // }
        // 4.Promise.reject()

        // let promise = await new Promise((resolve, reject) => {
        //   reject(new Error('自定义错误')) // 异步结果是一个Error类型
        //   // reject('自定义错误') // 异步结果是一个String类型
        // })
        //
        // // console.log('[promise]', promise)
        // promise
        //   .catch(err => {
        //     // console.log('[err]', err)
        //     return super.emit('error', 'Hello')
        //   })
    }
}

// try {
const job = new Job();

// super.emit('error','错误消息') >>> 返回true
// let saveRes = job.saveTest()
// console.log('[saveRes]', saveRes) // Promise {true}
// saveRes
//   .then(res => console.log('[saveResThen]', res))
//   .catch(err => console.log('[saveResCatch]', err))

// super.emit('message','普通消息') >>> 返回false
// let saveRes2 = job.saveTest2()
// console.log('[saveRes2]', saveRes2) // Promise {false}

//
let saveRes3 = job.saveTest3();
log('[saveRes3]', saveRes3);
saveRes3
    .catch(err3 => {
        log('[err3]', err3)
    });

// } catch (err_try_catch) {
//   console.log('[err_try_catch]', err_try_catch)
// }
/*
* super.emit('message','普通消息') >>> 返回false
* super.emit('error','错误消息') >>> 返回true
*       >>> 它会触发super.on('error',function(...){
*           throw new Error(...) // 它在这里会抛出错误
*       })
* */