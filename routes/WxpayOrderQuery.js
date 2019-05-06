/**
 * 微信支付2.0 --- 查询订单
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');

module.exports = async (fastify, options, next) => {
    fastify.post('/wxpay/orderquery', async (req, reply) => {
        try {
            const {outTradeNo} = req.body;

            if (!WxpaySdkFactory.isType(outTradeNo)) {
                return reply.send({
                    status: 'fail',
                    description: 'outTradeNo is required'
                })
            }

            wxpayFactory.setMethod('orderquery');
            let queryRes = await wxpayFactory.createWxpaySdk2().exec(
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
                description: queryRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[WxpayOrderQuery err]: ${_err}`
            })
        }
    });

    next()
};