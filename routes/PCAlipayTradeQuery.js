/**
 * PC电脑网站支付 --- 统一收单线下交易查询接口
 * 1.设置不同接口
 *  (1)实例化时指定, alipayFactory = new AlipayFactory({method:'query'})
 *  (2)setMethod(...), alipayFactory.setMethod('query')
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'query'});

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/query', async (req, reply) => {
        try {
            let {outTradeNo} = req.body;

            if (!AlipayFactory.isType(outTradeNo)) {
                return reply.send({
                    status: 'fail',
                    description: 'outTradeNo is required'
                })
            }

            let queryRes = await alipayFactory.createAlipaySdk().exec(
                alipayFactory.ALIPAY_API_MAPPING,
                {
                    bizContent: {
                        outTradeNo
                    }
                },
                {
                    validateSign: true // 验签
                }
            );
            console.log('[queryRes]', queryRes);
            return reply.send({
                status: 'success',
                description: queryRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradeQuery _err]: ${_err}`
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
//             path: '/auth/alipay/query2.0',
//             middleware: [middleware],
//             needBeforeRoutes: false,
//             needAfterRoutes: false,
//         }
//     }
// };
//
// async function middleware(ctx, next) {
//     try {
//         let {outTradeNo} = ctx.request.body;
//
//         if (!alipayFactory.isType(outTradeNo)) {
//             return ctx.body = {
//                 status: 'fail',
//                 description: 'outTradeNo is required'
//             }
//         }
//
//         let queryRes = await alipayFactory.createAlipaySdk().exec(
//             alipayFactory.ALIPAY_API_MAPPING,
//             {
//                 bizContent: {
//                     outTradeNo
//                 }
//             },
//             {
//                 validateSign: true // 验签
//             }
//         );
//         console.log('[queryRes]', queryRes);
//         return ctx.body = {
//             status: 'success',
//             description: queryRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[PCAlipayTradeQuery _err]: ${_err}`
//         }
//     }
// }

// 成功
// {
//   "code": "10000",
//   "msg": "Success",
//   "buyerLogonId": "www***@qq.com",
//   "buyerPayAmount": "0.00",
//   "buyerUserId": "2088502347015634",
//   "invoiceAmount": "0.00",
//   "outTradeNo": "20181533695615748",
//   "pointAmount": "0.00",
//   "receiptAmount": "0.00",
//   "sendPayDate": "2018-08-08 10:33:45",
//   "totalAmount": "0.01",
//   "tradeNo": "2018080821001004630517787770",
//   "tradeStatus": "TRADE_SUCCESS"
// }

// 交易不存在
// { code: '40004',
//   msg: 'Business Failed',
//   subCode: 'ACQ.TRADE_NOT_EXIST',
//   subMsg: '交易不存在',
//   buyerPayAmount: '0.00',
//   invoiceAmount: '0.00',
//   outTradeNo: '201815336956157482',
//   pointAmount: '0.00',
//   receiptAmount: '0.00' }

// 未支付outTradeNo: 20180813767989(扫码后产生订单, PC电脑网站支付在同步返回时, 开始轮询)
// {
//   "code": "40004",
//   "msg": "Business Failed",
//   "subCode": "ACQ.TRADE_NOT_EXIST",
//   "subMsg": "交易不存在",
//   "buyerPayAmount": "0.00",
//   "invoiceAmount": "0.00",
//   "outTradeNo": "20180813767989",
//   "pointAmount": "0.00",
//   "receiptAmount": "0.00"
// }

// 扫码, 但未支付
// {
//   "code": "10000",
//   "msg": "Success",
//   "buyerLogonId": "www***@qq.com",
//   "buyerPayAmount": "0.00",
//   "buyerUserId": "2088502347015634",
//   "invoiceAmount": "0.00",
//   "outTradeNo": "20180813767989",
//   "pointAmount": "0.00",
//   "receiptAmount": "0.00",
//   "totalAmount": "0.01",
//   "tradeNo": "2018081321001004630540930266",
//   "tradeStatus": "WAIT_BUYER_PAY"
// }

// 订单关闭
// {
//   "code": "10000",
//   "msg": "Success",
//   "buyerLogonId": "www***@qq.com",
//   "buyerPayAmount": "0.00",
//   "buyerUserId": "2088502347015634",
//   "invoiceAmount": "0.00",
//   "outTradeNo": "20180813767989",
//   "pointAmount": "0.00",
//   "receiptAmount": "0.00",
//   "totalAmount": "0.01",
//   "tradeNo": "2018081321001004630540930266",
//   "tradeStatus": "TRADE_CLOSED"
// }