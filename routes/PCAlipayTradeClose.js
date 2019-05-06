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