/**
 * PC电脑网站支付 --- 统一收单交易退款查询接口
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'refundQuery'});

module.exports = async fastify => {
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

};