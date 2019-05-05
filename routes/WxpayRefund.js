/**
 * 微信支付2.0 --- 申请退款
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');
const WxpayDb = require("../service/pay/lib2/wdb");

module.exports = async (fastify, options, next) => {
    fastify.post('/wxpay/refund', async (req, reply) => {
        try {
            // 传入参数outTradeNo/outRefundNo其中一个
            // 传入参数totalFee/refundFee其中一个
            const {outTradeNo, totalFee} = req.body;
            const outRefundNo = outTradeNo;
            const refundFee = totalFee;

            console.log('[totalFee]', typeof parseInt(totalFee));

            let errArray = [];
            !WxpaySdkFactory.isType(outTradeNo) && errArray.push('outTradeNo is required');
            !WxpaySdkFactory.isType(totalFee) && errArray.push('totalFee is required');

            if (errArray.length > 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            let formData = WxpaySdkFactory.createWxpayForm()
                .addField('outTradeNo', outTradeNo)
                .addField('outRefundNo', outRefundNo)
                .addField('totalFee', parseInt(totalFee))
                .addField('refundFee', parseInt(refundFee));

            wxpayFactory.setMethod('refund');
            let refundRes = await wxpayFactory.createWxpaySdk2().exec(
                wxpayFactory.WXPAY_API_MAPPING,
                {},
                {
                    formData,
                    validateSign: true
                }
            );

            // 保存退款信息
            if (refundRes['resultCode'] !== 'SUCCESS') {
                return reply.send({
                    status: 'fail',
                    description: '申请退款失败'
                })
            }
            console.log('[refundRes]', refundRes);
            const updateArr = ['transaction_id', 'out_refund_no', 'refund_id', 'refund_fee'];
            const conditionArr = ['out_trade_no', 'total_fee'];
            const refundStatus = 1; // 已退款
            // 将退款信息更新到数据库
            let updateRes = WxpayDb.upDateOrderStatus(refundRes, updateArr, conditionArr, {refundStatus});
            console.log('[WxpayRefund updateRes]', updateRes);
            if (!updateRes) {
                return reply.send({
                    status: 'fail',
                    description: '业务处理, 更新订单退款信息失败'
                })
            }

            return reply.send({
                status: 'success',
                description: refundRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[WxpayRefund err]: ${_err}`
            })
        }
    });

    next()
};

// module.exports = routes;

// module.exports = class {
//     async mountingRoute() {
//         return {
//             path: '/auth/wxpay/refund2.0/',
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
//         // 传入参数outTradeNo/outRefundNo其中一个
//         // 传入参数totalFee/refundFee其中一个
//         const {outTradeNo, totalFee} = ctx.request.body;
//         const outRefundNo = outTradeNo;
//         const refundFee = totalFee;
//
//         console.log('[totalFee]', typeof parseInt(totalFee));
//
//         let errArray = [];
//         !wxpayFactory.isType(outTradeNo) && errArray.push('outTradeNo is required');
//         !wxpayFactory.isType(totalFee) && errArray.push('totalFee is required');
//
//         if (errArray.length > 0) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: errArray.join('&')
//             }
//         }
//
//         let formData = wxpayFactory.createWxpayForm()
//             .addField('outTradeNo', outTradeNo)
//             .addField('outRefundNo', outRefundNo)
//             .addField('totalFee', parseInt(totalFee))
//             .addField('refundFee', parseInt(refundFee));
//
//         wxpayFactory.setMethod('refund');
//         let refundRes = await wxpayFactory.createWxpaySdk2().exec(
//             wxpayFactory.WXPAY_API_MAPPING,
//             {},
//             {
//                 formData,
//                 validateSign: true
//             }
//         );
//
//         // 保存退款信息
//         if (refundRes['resultCode'] !== 'SUCCESS') {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '申请退款失败'
//             }
//         }
//         console.log('[refundRes]', refundRes);
//         const updateArr = ['transaction_id', 'out_refund_no', 'refund_id', 'refund_fee'];
//         const conditionArr = ['out_trade_no', 'total_fee'];
//         const refundStatus = 1; // 已退款
//         // 将退款信息更新到数据库
//         let updateRes = wxpayFactory.createWxpayDb().upDateOrderStatus(refundRes, updateArr, conditionArr, {refundStatus});
//         console.log('[WxpayRefund updateRes]', updateRes);
//         if (!updateRes) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: '业务处理, 更新订单退款信息失败'
//             }
//         }
//
//         return ctx.body = {
//             status: 'success',
//             description: refundRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[WxpayRefund err]: ${_err}`
//         }
//     }
// }

// {
//   "status": "success",
//   "description": {
//   "returnCode": "SUCCESS",
//     "returnMsg": "OK",
//     "appid": "wx315ac5d37a858129",
//     "mchId": "1274134501",
//     "nonceStr": "lwXuXKpfU9sys8YF",
//     "sign": "E5CF7CA360958F589DEA9C4FEB7EA513",
//     "resultCode": "SUCCESS",
//     "transactionId": "4200000178201808209378586642",
//     "outTradeNo": "20180820847980",
//     "outRefundNo": "20180820847980",
//     "refundId": "50000207762018082006026199483",
//     "refundChannel": "",
//     "refundFee": "1",
//     "couponRefundFee": "0",
//     "totalFee": "1",
//     "cashFee": "1",
//     "couponRefundCount": "0",
//     "cashRefundFee": "1"
//   }
// }