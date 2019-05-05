/**
 * 1.redis.js的构造函数constructor(){...} options:redisConfig.options会不会覆盖传参options
 * 答:不会。因为
 * options:redisConfig.options
 * 指的是 this.redisConfig = {
 *    options:redisConfig.options
 *    prefix: options.prefix, // options是构造函数中的参数options，如果是上面的options,应该怎么写prefix:this.redisConfig.prefix
 *    separator: options.separator // separator: this.redisConfig.separator
 * }
 *
 * 2.Redis.js中的shutDown===false,请问它在哪里修改了shutDown这个属性呢???
 *
 *
 * */
const EventEmitter = require('events');

class RedisFactory extends EventEmitter {
    constructor(options, redisConfig) {
        super();
        this.redisConfig = {
            options: redisConfig.options,
            prefix: options.prefix,
            separator: options.separator,
        }
    }
}

const options = {
    prefix: 'options的prefix',
    separator: 'options的separator'
};
const redisConfig = {
    options: {
        prefix: 'redisConfig的prefix',
        separator: 'redisConfig的separator'
    }
};
const RedisClient = new RedisFactory(options, redisConfig);
console.log(RedisClient.redisConfig);
// {
//  options:
//    { prefix: 'redisConfig的prefix',
//      separator: 'redisConfig的separator' },
//  prefix: 'options的prefix',
//  separator: 'options的separator'
// }
// 结论:不会影响

/*
* 在queueEvent.js中的方法分别在哪些地方被调用了
* (1) subscribeEvent()
*     xqueue.js.subscribeEvent()
* (2) subcribeSchema()
*     xqueue.js.subcribeSchema()
* (3) addObJob()
*     xqueue.js.observed()
* (4) emit()
*     xqueue.js.doPromote()
*     xqueue.js.removeTTLJobs()
*
*
* */