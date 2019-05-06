/**
 * PC电脑网站支付(测试) --- 同步回调(get)
 * */
const QueueFactory = require('../service/queue/v2/factory');
const queueFactory = new QueueFactory();

module.exports = async (fastify, options, next) => {
    fastify.get('/alipay/callback/return', async (req, reply) => {
        try {
            console.log('[...]', req.query, typeof req.query);
            // 1.获取out_trade_no
            const {out_trade_no} = req.query;
            // 2.开始轮询
            queueFactory.createQueue().createJob('alipay', {out_trade_no})
                .delay(5000)
                .backoff({delay: 3000})
                .ttl(2000)
                .attempts(10)
                .save();

            return reply.redirect('http://localhost:9009/')
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[同步回调 err]: ${_err}`
            })
        }
    });

    next()
};