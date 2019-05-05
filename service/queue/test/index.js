const RedisFactory = require('./redis');
const Queue = require('./xqueue');

module.exports = {
    // 创建队列
    createQueue({options, redisConfig}) {
        // console.log('[index.createQueue()]')
        let RedisClient = new RedisFactory(options, redisConfig);
        // console.log('[index]', RedisClient)
        return new Queue(options, RedisClient)
    }
};

/*
*  重要: 为了是用键事件通知和键空间通知，在启动redis的时候，无论在redis.conf中是否激活了requirepass密码选项，
*  启动时，都要: redis-server /usr/local/redis--3.0.6/redis.conf
*  1.开启notify-keyspace-events --- Redis的键空间通知&键事件通知
*  2.开启key-space-event notification
*  3.开启key-event-notify
*  */

/*
* 1.影响job的事件
* - `enqueue` 任务进入队列
  - `active` 任务已被获取
  - `promotion` 任务从delay状态过渡进入队列
  - `failed` 任务失败
  - `complete` 任务完成
  - `retry` 任务失败并已重试

  2.job的属性
  -`data`           任务数据
  -`type`           任务分组
  -`priority`       优先级
  -`ttl`            任务生存时间 (从被获取到相应的最大时间)
  -`state`          任务状态
  -`max_attempts`   最大尝试次数
  -`created_at`     任务创建时间
  -`update_at`      任务修改时间
  -`attempts`       已经尝试次数
  -`backoff`        backoff参数细节
  -`remaning`      剩余重试次数
* */