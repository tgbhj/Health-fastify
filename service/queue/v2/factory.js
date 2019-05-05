/**
 * 队列工厂类
 * 1.引用service/queue/lib2/index.js
 * */
const config = require('../../../config/config');
const fxqueue = require('./index');

class QueueFactory {
    constructor() {
        this.queueConfig = {
            prefix: 'q',
            name: 'xqueue',
            port: config.redisPort,
            host: config.redisHost,
            auth: config.redisPassword,
            db: config.redisPart4
        }
    }

    createQueue() {
        return fxqueue.createQueue({
            options: {
                prefix: this.queueConfig.prefix,
                name: this.queueConfig.name
            },
            redisConfig: {
                port: this.queueConfig.port,
                host: this.queueConfig.host,
                auth: this.queueConfig.auth,
                db: this.queueConfig.db
            }
        })
    }
}

module.exports = QueueFactory;