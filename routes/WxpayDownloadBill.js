/**
 * 微信支付2.0 --- 下載对账单
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');

module.exports = async (fastify, options, next) => {
    fastify.post('/wxpay/downloadbill', async (req, reply) => {
        try {
            const {billDate, billType} = req.body;

            let errArray = [];
            !WxpaySdkFactory.isType(billDate) && errArray.push('billDate is required');
            !WxpaySdkFactory.isType(billType) && errArray.push('billType is required');

            if (errArray.length > 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            wxpayFactory.setMethod('downloadbill');
            let downloadbillRes = await wxpayFactory.createWxpaySdk2().exec(
                wxpayFactory.WXPAY_API_MAPPING,
                {
                    billDate,
                    billType
                },
                {
                    validateSign: false
                }
            );

            return reply.send({
                status: 'success',
                description: downloadbillRes
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
//             path: '/auth/wxpay/downloadbill2.0/',
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
//         const {billDate, billType} = ctx.request.body;
//
//         let errArray = [];
//         !wxpayFactory.isType(billDate) && errArray.push('billDate is required');
//         !wxpayFactory.isType(billType) && errArray.push('billType is required');
//
//         if (errArray.length > 0) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: errArray.join('&')
//             }
//         }
//
//         wxpayFactory.setMethod('downloadbill');
//         let downloadbillRes = await wxpayFactory.createWxpaySdk2().exec(
//             wxpayFactory.WXPAY_API_MAPPING,
//             {
//                 billDate,
//                 billType
//             },
//             {
//                 validateSign: false
//             }
//         );
//
//         return ctx.body = {
//             status: 'success',
//             description: downloadbillRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[WxpayRefundQuery err]: ${_err}`
//         }
//     }
// }