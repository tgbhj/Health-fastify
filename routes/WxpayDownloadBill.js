/**
 * 微信支付2.0 --- 下載对账单
 * */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');

module.exports = async fastify => {
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

};