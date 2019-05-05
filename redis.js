const {redisPassword, redisPart4, redisPartTest, redisHost, redisPort} = require('./config/config.js');
const redis = require('redis');
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const auth = redisPassword ? {password: redisPassword} : {};
const part4 = redisPart4 ? {db: redisPart4} : {};
const partTest = redisPartTest ? {db: redisPartTest} : {};

const client = redis.createClient(Object.assign({}, auth, {
    host: redisHost,
    port: redisPort
}));

const client_Pay = redis.createClient(Object.assign({}, auth, part4, {
    host: redisHost,
    port: redisPort
}));

const clientTest = redis.createClient(Object.assign({}, auth, partTest, {
    host: redisHost,
    port: redisPort
}));

client_Pay.on('connect', () => {
    console.log('Redis clientPay is Ready')
});

client_Pay.on('error', err => {
    console.log('Redis clientPay Error', err)
});

module.exports = {
    client, // session etc
    client_Pay, // 支付轮询
    clientTest // 测试
};