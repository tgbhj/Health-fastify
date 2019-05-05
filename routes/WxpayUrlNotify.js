/**
 * 微信支付2.0 --- 异步通知
 * */

const WxpayDb = require("../service/pay/lib2/wdb");
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();

module.exports = async (fastify, options, next) => {
    fastify.post('/wxpay/callback/notify', async (req, reply) => {
        try {
            // 真实数据
            console.log('[微信支付post请求notifyUrl]');
            const postData = req.body;
            console.log('[postData]', postData, typeof postData);

            // 1.验签
            let signRes = await wxpayFactory.createWxpaySdk2().checkNotifySign(postData);
            console.log('[signRes]', signRes);
            if (!signRes) {
                return reply.send({
                    status: 'fail',
                    description: '验签失败'
                })
            }

            // 2.比对数据(outTradeNo, appId, totalAmount)
            let checkRes = await WxpayDb.checkNotifyData(postData);
            console.log('[checkRes]', checkRes);
            if (!checkRes) {
                return reply.send({
                    status: 'fail',
                    description: '比对数据失败'
                })
            }

            // 3.检查trade_status
            // let tradeStatus = []
            // !(postData['trade_status'] === 'TRADE_SUCCESS') && tradeStatus.push('fail')
            // // !(postData['trade_status'] === 'TRADE_FINISH') && tradeStatus.push('fail')
            // if (tradeStatus.length > 0) {
            //   return ctx.body = {
            //     status: 'fail',
            //     description: '检查trade_status失败'
            //   }
            // }

            // 3.调用查询接口(trade_state来判断交易是否成功)
            wxpayFactory.setMethod('orderquery');
            let queryRes = await wxpayFactory.createWxpaySdk2().exec(
                wxpayFactory.WXPAY_API_MAPPING,
                {
                    outTradeNo: postData['out_trade_no']
                },
                {
                    validateSign: true
                }
            );
            console.log('[查询结果]', queryRes);
            console.log('[查询结果]', queryRes['tradeState']);

            if (queryRes['tradeState'] !== 'SUCCESS') {
                return reply.send({
                    status: 'fail',
                    description: '检查trade_status失败'
                })
            }

            // 4.业务处理, 修改订单状态
            const updateArr = ['bank_type', 'fee_type', 'nonce_str', 'openid', 'time_end', 'total_fee', 'transaction_id'];
            const conditionArr = ['out_trade_no', 'total_fee'];
            const payStatus = 1;
            let updateRes = await WxpayDb.upDateOrderStatus(postData, updateArr, conditionArr, {payStatus});
            console.log('[updateRes]', updateRes);
            if (!updateRes) {
                return reply.send({
                    status: 'fail',
                    description: '业务处理, 更新订单异步返回信息失败'
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
//             path: '/auth/wxpay/callback/notify/',
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
//         console.log('[微信支付post请求notifyUrl]');
//         const postData = ctx.request.body;
//         console.log('[postData]', postData, typeof postData);
//
//         // 1.验签
//         let signRes = await wxpayFactory.createWxpaySdk2().checkNotifySign(postData);
//         console.log('[signRes]', signRes);
//         if (!signRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '验签失败'
//             }
//         }
//
//         // 2.比对数据(outTradeNo, appId, totalAmount)
//         let checkRes = await wxpayFactory.createWxpayDb().checkNotifyData(postData);
//         console.log('[checkRes]', checkRes);
//         if (!checkRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '比对数据失败'
//             }
//         }
//
//         // 3.检查trade_status
//         // let tradeStatus = []
//         // !(postData['trade_status'] === 'TRADE_SUCCESS') && tradeStatus.push('fail')
//         // // !(postData['trade_status'] === 'TRADE_FINISH') && tradeStatus.push('fail')
//         // if (tradeStatus.length > 0) {
//         //   return ctx.body = {
//         //     status: 'fail',
//         //     description: '检查trade_status失败'
//         //   }
//         // }
//
//         // 3.调用查询接口(trade_state来判断交易是否成功)
//         wxpayFactory.setMethod('orderquery');
//         let queryRes = await wxpayFactory.createWxpaySdk2().exec(
//             wxpayFactory.WXPAY_API_MAPPING,
//             {
//                 outTradeNo: postData['out_trade_no']
//             },
//             {
//                 validateSign: true
//             }
//         );
//         console.log('[查询结果]', queryRes);
//         console.log('[查询结果]', queryRes['tradeState']);
//
//         if (queryRes['tradeState'] !== 'SUCCESS') {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '检查trade_status失败'
//             }
//         }
//
//         // 4.业务处理, 修改订单状态
//         const updateArr = ['bank_type', 'fee_type', 'nonce_str', 'openid', 'time_end', 'total_fee', 'transaction_id'];
//         const conditionArr = ['out_trade_no', 'total_fee'];
//         const payStatus = 1;
//         let updateRes = await wxpayFactory.createWxpayDb().upDateOrderStatus(postData, updateArr, conditionArr, {payStatus});
//         console.log('[updateRes]', updateRes);
//         if (!updateRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '业务处理, 更新订单异步返回信息失败'
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

// [postData] { appid: 'wx315ac5d37a858129',
//   bank_type: 'CFT',
//   cash_fee: '1',
//   fee_type: 'CNY',
//   is_subscribe: 'Y',
//   mch_id: '1274134501',
//   nonce_str: 'QhGtV7o8s8AXoRGPd2dgXMgPeJZQYmCT',
//   openid: 'o1IeduC5u5f5fGzX07bcKL2_bH14',
//   out_trade_no: '20180820342538',
//   result_code: 'SUCCESS',
//   return_code: 'SUCCESS',
//   sign: 'CF5B1BFC98F887B028E446FCCECFC0DF',
//   time_end: '20180820153930',
//   total_fee: '1',
//   trade_type: 'NATIVE',
//   transaction_id: '4200000166201808207585328494' } object
