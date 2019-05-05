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

// module.exports = routes;

// module.exports = class {
//     async mountingRoute() {
//         return {
//             path: '/auth/zfb/callback/return/',
//             method: 'get',
//             middleware: [middleware],
//             needBeforeRoutes: false,
//             needAfterRoutes: false,
//         }
//     }
// };
//
// /**
//  * 1.获取out_trade_no: 获取到out_trade_no, 说明用户已经支付了, 才会有同步回调. 因此, 开始轮询是没有问题的.
//  * 2.开始轮询
//  * */
// async function middleware(ctx, next) {
//     try {
//         console.log('[...]', ctx.request.query, typeof ctx.request.query);
//         // 1.获取out_trade_no
//         // const {out_trade_no} = ctx.request.query
//         // 2.开始轮询
//         // queueFactory.createQueue().createJob('alipay', {out_trade_no})
//         //   .delay(5000)
//         //   .backoff({delay: 3000})
//         //   .ttl(2000)
//         //   .attempts(10)
//         //   .save()
//
//         return ctx.redirect('http://localhost:9009/')
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[同步回调 err]: ${_err}`
//         }
//     }
// }

// info: [PCAlipayFormUrlReturn] [支付宝get请求returnUrl]
// info: [PCAlipayFormUrlReturn] [同步返回参数 ctx.request.query] total_amount=0.01, timestamp=2018-08-10 16:44:56, sign=UyDh5ihDJAUjG1oV0BxW6kLSTd/mCNBhZw8LVbL0262kJm4ZkI6mm68QrcYwCgN6zEEoEDbIMueA3Ze4TqLAYnFkslZpR0DiDq/pn14YZl44uWeEKpd3sd62FOc3VeW+88+7q3686u6Ml0TUznHzluKKmx8pzeylcKhcMildkRVbPQlpWYkO+LChQ0ZCmNw2XwSFvvtl93stUYbouDKmms/Gmws+qGCxaiw4ppygOKBJtBCd+spA/nTB05BnZhsrsNVCYzTCZ2vDyiZjFz3N3RPVO8qnxzICPulr4Ne/uvi3jMsg5w3fgAZDl2rvR/FNliD539v3pzxh0oZNM7zcLA==, trade_no=2018081021001004630527566153, sign_type=RSA2, auth_app_id=2018040902524266, charset=utf-8, seller_id=2088031697679176, method=alipay.trade.page.pay.return, app_id=2018040902524266, out_trade_no=20180810882927, version=1.0
// info: [PCAlipayFormUrlReturn] [同步返回参数 ctx.request.querystring] total_amount=0.01&timestamp=2018-08-10+16%3A44%3A56&sign=UyDh5ihDJAUjG1oV0BxW6kLSTd%2FmCNBhZw8LVbL0262kJm4ZkI6mm68QrcYwCgN6zEEoEDbIMueA3Ze4TqLAYnFkslZpR0DiDq%2Fpn14YZl44uWeEKpd3sd62FOc3VeW%2B88%2B7q3686u6Ml0TUznHzluKKmx8pzeylcKhcMildkRVbPQlpWYkO%2BLChQ0ZCmNw2XwSFvvtl93stUYbouDKmms%2FGmws%2BqGCxaiw4ppygOKBJtBCd%2BspA%2FnTB05BnZhsrsNVCYzTCZ2vDyiZjFz3N3RPVO8qnxzICPulr4Ne%2Fuvi3jMsg5w3fgAZDl2rvR%2FFNliD539v3pzxh0oZNM7zcLA%3D%3D&trade_no=2018081021001004630527566153&sign_type=RSA2&auth_app_id=2018040902524266&charset=utf-8&seller_id=2088031697679176&method=alipay.trade.page.pay.return&app_id=2018040902524266&out_trade_no=20180810882927&version=1.0
// info: [PCAlipayFormUrlReturn] [同步返回参数 ctx.request.body]

// 支付完成后, 跳转
// http://zfb.seei.tv:7007/auth/zfb/callback/return?total_amount=0.01&timestamp=2018-08-10+16%3A44%3A56&sign=UyDh5ihDJAUjG1oV0BxW6kLSTd%2FmCNBhZw8LVbL0262kJm4ZkI6mm68QrcYwCgN6zEEoEDbIMueA3Ze4TqLAYnFkslZpR0DiDq%2Fpn14YZl44uWeEKpd3sd62FOc3VeW%2B88%2B7q3686u6Ml0TUznHzluKKmx8pzeylcKhcMildkRVbPQlpWYkO%2BLChQ0ZCmNw2XwSFvvtl93stUYbouDKmms%2FGmws%2BqGCxaiw4ppygOKBJtBCd%2BspA%2FnTB05BnZhsrsNVCYzTCZ2vDyiZjFz3N3RPVO8qnxzICPulr4Ne%2Fuvi3jMsg5w3fgAZDl2rvR%2FFNliD539v3pzxh0oZNM7zcLA%3D%3D&trade_no=2018081021001004630527566153&sign_type=RSA2&auth_app_id=2018040902524266&charset=utf-8&seller_id=2088031697679176&method=alipay.trade.page.pay.return&app_id=2018040902524266&out_trade_no=20180810882927&version=1.0