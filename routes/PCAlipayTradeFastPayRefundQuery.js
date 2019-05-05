/**
 * PC电脑网站支付 --- 统一收单交易退款查询接口
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'refundQuery'});

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/refundQuery', async (req, reply) => {
        try {
            let {outTradeNo, outRequestNo, tradeNo} = req.body;

            let errArray = [];
            !AlipayFactory.isType(outTradeNo) && errArray.push('outTradeNo is required');
            !AlipayFactory.isType(outRequestNo) && errArray.push('outRequestNo is required');
            !AlipayFactory.isType(tradeNo) && errArray.push('trade is required');

            if (errArray.length !== 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            let refundQueryRes = await alipayFactory.createAlipaySdk().exec(
                alipayFactory.ALIPAY_API_MAPPING,
                {
                    bizContent: {
                        tradeNo,
                        outTradeNo,
                        outRequestNo
                    }
                },
                {
                    validateSign: true // 验签
                }
            );
            console.log('[refundQueryRes]', refundQueryRes);
            return reply.send({
                status: 'success',
                description: refundQueryRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradeFastPayRefundQuery _err]: ${_err}`
            })
        }
    });

    next()
};

// module.exports = routes;

// module.exports = class {
//     async mountingRoute() {
//         return {
//             method: 'post',
//             path: '/auth/alipay/refundQuery2.0',
//             middleware: [middleware],
//             needBeforeRoutes: false,
//             needAfterRoutes: false,
//         }
//     }
// };
//
// async function middleware(ctx, next) {
//     try {
//         let {outTradeNo, outRequestNo, tradeNo} = ctx.request.body;
//
//         let errArray = [];
//         !alipayFactory.isType(outTradeNo) && errArray.push('outTradeNo is required');
//         !alipayFactory.isType(outRequestNo) && errArray.push('outRequestNo is required');
//         !alipayFactory.isType(tradeNo) && errArray.push('trade is required');
//
//         if (errArray.length !== 0) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: errArray.join('&')
//             }
//         }
//
//         let refundQueryRes = await alipayFactory.createAlipaySdk().exec(
//             alipayFactory.ALIPAY_API_MAPPING,
//             {
//                 bizContent: {
//                     tradeNo,
//                     outTradeNo,
//                     outRequestNo
//                 }
//             },
//             {
//                 validateSign: true // 验签
//             }
//         );
//         console.log('[refundQueryRes]', refundQueryRes);
//         return ctx.body = {
//             status: 'success',
//             description: refundQueryRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[PCAlipayTradeFastPayRefundQuery _err]: ${_err}`
//         }
//     }
// }

// 成功
// {
//   "code": "10000", >>> 表示请求成功
//   "msg": "Success" >>> 表示退款成功
// }

// outTradeNo错误
// {
//   "code": "40004",
//   "msg": "Business Failed",
//   "subCode": "ACQ.TRADE_NOT_EXIST",
//   "subMsg": "交易不存在",
//   "outTradeNo": "201815336946045791"
// }

// out_request_no: 2018080821001004630518127817
