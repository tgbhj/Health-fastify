/**
 * PC电脑网站支付 --- 统一收单交易关闭接口
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'close'});

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/close', async (req, reply) => {
        try {
            let {outTradeNo} = req.body;

            if (!AlipayFactory.isType(outTradeNo)) {
                return reply.send({
                    status: 'fail',
                    description: 'outTradeNo is required.'
                })
            }

            let closeRes = await alipayFactory.createAlipaySdk().exec(
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
            console.log('[queryRes]', closeRes);
            return reply.send({
                status: 'success',
                description: closeRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradeClose _err]: ${_err}`
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
//             path: '/auth/alipay/close2.0',
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
//                 description: 'outTradeNo is required.'
//             }
//         }
//
//         let closeRes = await alipayFactory.createAlipaySdk().exec(
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
//         console.log('[queryRes]', closeRes);
//         return ctx.body = {
//             status: 'success',
//             description: closeRes
//         }
//     } catch (_err) {
//         return ctx.body = {
//             status: 'fail',
//             description: `[PCAlipayTradeClose _err]: ${_err}`
//         }
//     }
// }

// 成功
// {
//   "code": "10000",
//   "msg": "Success",
//   "outTradeNo": "20180813767989",
//   "tradeNo": "2018081321001004630540930266"
// }

// outTradeNo不存在
// {
//   "code": "40004",
//   "msg": "Business Failed",
//   "subCode": "ACQ.TRADE_NOT_EXIST",
//   "subMsg": "交易不存在"
// }