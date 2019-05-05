const RedisFactory = require('./lib/redis');
const Queue = require('./lib/xqueue');

module.exports = {
    // 创建队列
    createQueue({options, redisConfig}) {
        let RedisClient = new RedisFactory(options, redisConfig);
        return new Queue(options, RedisClient)
    }
};

/*
* 1.createQueue(): 创建队列
* 2.RedisClient>>>redis实例
* 3.Queue()>>>共用RedisClient
* */

/*
*  重要: 为了是用键事件通知和键空间通知，在启动redis的时候，无论在redis.conf中是否激活了requirepass密码选项，
*  启动时，都要: redis-server /usr/local/redis--3.0.6/redis.conf
*  1.开启notify-keyspace-events --- Redis的键空间通知&键事件通知
*  2.开启key-space-event notification
*  3.开启key-event-notify
*  */