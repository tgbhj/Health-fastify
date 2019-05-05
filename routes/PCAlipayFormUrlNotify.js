/**
 * PC电脑网站支付(测试) --- 异步回调(post)
 * */

const AlipayDb = require("../service/pay/lib2/db");
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory();

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/callback/notify', async (req, reply) => {
        try {
            // 真实数据
            console.log('[支付宝post请求notifyUrl]');
            const postData = req.body;

            // 1.验签
            let signRes = alipayFactory.createAlipaySdk().checkNotifySign(postData);
            if (!signRes) {
                return reply.send({
                    status: 'fail',
                    description: '验签失败'
                })
            }
            // 2.比对数据(outTradeNo, appId, totalAmount)
            let checkRes = await AlipayDb.checkNotifyData(postData);
            if (!checkRes) {
                return reply.send({
                    status: 'fail',
                    description: '比对数据失败'
                })
            }

            // 3.检查trade_status
            let tradeStatus = [];
            !(postData['trade_status'] === 'TRADE_SUCCESS') && tradeStatus.push('fail');
            // !(postData['trade_status'] === 'TRADE_FINISH') && tradeStatus.push('fail')
            if (tradeStatus.length > 0) {
                return reply.send({
                    status: 'fail',
                    description: '检查trade_status失败'
                })
            }

            // 4.业务处理, 修改订单状态
            const updateArr = [
                'gmt_create',
                'gmt_payment',
                'notify_time',
                'buyer_id',
                'invoice_amount',
                'notify_id',
                'fund_bill_list',
                'notify_type',
                'trade_no',
                'receipt_amount',
                'seller_id'
            ];
            const conditionArr = ['out_trade_no', 'total_amount', 'app_id'];
            const payStatus = 1;
            let updateRes = await AlipayDb.upDateOrderStatus(postData, updateArr, conditionArr, {payStatus});
            if (!updateRes) {
                return reply.send({
                    status: 'fail',
                    description: '业务处理, 修改订单状态失败'
                })
            }

            return reply.send('success')
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[异步回调 err]: ${_err}`
            })
        }
    });

    next()
};

// module.exports = routes;

// module.exports = class {
//     async mountingRoute() {
//         return {
//             path: '/auth/zfb/callback/notify/',
//             method: 'post',
//             middleware: [middleware],
//             needBeforeRoutes: false,
//             needAfterRoutes: false,
//         }
//     }
// };
//
// async function middleware(ctx, next) {
//     try {
//         // 真实数据
//         console.log('[支付宝post请求notifyUrl]');
//         const postData = ctx.request.body;
//
//         // 1.验签
//         let signRes = alipayFactory.createAlipaySdk().checkNotifySign(postData);
//         if (!signRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '验签失败'
//             }
//         }
//         // 2.比对数据(outTradeNo, appId, totalAmount)
//         let checkRes = await alipayFactory.createAlipayDb().checkNotifyData(postData);
//         if (!checkRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '比对数据失败'
//             }
//         }
//
//         // 3.检查trade_status
//         let tradeStatus = [];
//         !(postData['trade_status'] === 'TRADE_SUCCESS') && tradeStatus.push('fail');
//         // !(postData['trade_status'] === 'TRADE_FINISH') && tradeStatus.push('fail')
//         if (tradeStatus.length > 0) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '检查trade_status失败'
//             }
//         }
//
//         // 4.业务处理, 修改订单状态
//         const updateArr = [
//             'gmt_create',
//             'gmt_payment',
//             'notify_time',
//             'buyer_id',
//             'invoice_amount',
//             'notify_id',
//             'fund_bill_list',
//             'notify_type',
//             'trade_no',
//             'receipt_amount',
//             'seller_id'
//         ];
//         const conditionArr = ['out_trade_no', 'total_amount', 'app_id'];
//         const payStatus = 1;
//         let updateRes = await alipayFactory.createAlipayDb().upDateOrderStatus(postData, updateArr, conditionArr, {payStatus});
//         if (!updateRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '业务处理, 修改订单状态失败'
//             }
//         }
//
//         return ctx.body = 'success'
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[异步回调 err]: ${_err}`
//         }
//     }
// }

// { gmt_create: '2018-08-08 10:33:41', --- db
//   charset: 'utf-8',
//   gmt_payment: '2018-08-08 10:33:45', --- db
//   notify_time: '2018-08-08 10:33:46', --- db
//   subject: '商品',
//   sign: 'Jl3lMMuECPEJlouYM1EMjNJkQL0Tt3APr7Wh4iYf+hUrwa7CQKzrNbeGxacXh/xwG/b1X1RTpQECOUvyUeHg+U70o1Cf9yuMN0jhkL2gF+L+GsAn7J2IwyERiPjvChOqDcmoLBbegPBGeSx0ln5UbSfyX3mDamI2C2pesH3Q7j6+pmWvKqkwLk/5TcG/NT8HxhdQZ4CBhBAVAtQJyzbMtSBBd1Nj9kfmi5yv+KDOL4t9Z+L/7T3TFE3PK+sayePoPwo7BMSrVQl/Cuv6ppKqNdKZQSaCahV/rpHNsR9eD5radeWWMAaxOq+Z/2VMLwvmAPMhAhyC4T1VoULsRCjRzA==',
//   buyer_id: '2088502347015634', --- db
//   body: '商品详情',
//   invoice_amount: '0.01', --- db
//   version: '1.0',
//   notify_id: '860bc31c118a47ee862c0437821d34ckv5', --- db
//   fund_bill_list: '[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]', --- db
//   notify_type: 'trade_status_sync', --- db
//   out_trade_no: '20181533695615748',
//   total_amount: '0.01',
//   trade_status: 'TRADE_SUCCESS',
//   trade_no: '2018080821001004630517787770', --- db
//   auth_app_id: '2018040902524266',
//   receipt_amount: '0.01', --- db
//   point_amount: '0.00',
//   app_id: '2018040902524266',
//   buyer_pay_amount: '0.01',
//   sign_type: 'RSA2',
//   seller_id: '2088031697679176' } object --- db

// gmt_create
// gmt_payment
// notify_time
// buyer_id
// invoice_amount
// notify_id
// fund_bill_list
// notify_type
// trade_no
// receipt_amount
// seller_id