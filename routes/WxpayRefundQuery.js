/**
 * 微信支付2.0 --- 退款查询
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');

module.exports = async (fastify, options, next) => {
    fastify.post('/wxpay/refundquery', async (req, reply) => {
        try {
            const {outTradeNo} = req.body;
            if (!WxpaySdkFactory.isType(outTradeNo)) {
                return reply.send({
                    status: 'fail',
                    description: 'outTradeNo is required'
                })
            }

            wxpayFactory.setMethod('refundquery');
            let refundQueryRes = await wxpayFactory.createWxpaySdk2().exec(
                wxpayFactory.WXPAY_API_MAPPING,
                {
                    outTradeNo
                },
                {
                    validateSign: true
                }
            );

            return reply.send({
                status: 'success',
                description: refundQueryRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[WxpayRefundQuery err]: ${_err}`
            })
        }
    });

    next()
};

// module.exports = routes;

// module.exports = class {
//     async mountingRoute() {
//         return {
//             path: '/auth/wxpay/refundquery2.0/',
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
//         const {outTradeNo} = ctx.request.body;
//         if (!wxpayFactory.isType(outTradeNo)) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: 'outTradeNo is required'
//             }
//         }
//
//         wxpayFactory.setMethod('refundquery');
//         let refundQueryRes = await wxpayFactory.createWxpaySdk2().exec(
//             wxpayFactory.WXPAY_API_MAPPING,
//             {
//                 outTradeNo
//             },
//             {
//                 validateSign: true
//             }
//         );
//
//         return ctx.body = {
//             status: 'success',
//             description: refundQueryRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[WxpayRefundQuery err]: ${_err}`
//         }
//     }
// }