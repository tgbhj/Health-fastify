/**
 * 微信支付2.0 --- 关闭订单
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');

module.exports = async fastify => {
    fastify.post('/wxpay/closeorder', async (req, reply) => {
        try {
            const {outTradeNo} = req.body;
            if (!WxpaySdkFactory.isType(outTradeNo)) {
                return reply.send({
                    status: 'fail',
                    description: 'outTradeNo is required'
                })
            }

            wxpayFactory.setMethod('closeorder');
            let closeOrderRes = await wxpayFactory.createWxpaySdk2().exec(
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
                description: closeOrderRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[WxpayCloseOrder err]: ${_err}`
            })
        }
    });

};