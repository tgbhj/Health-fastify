/**
 * PC电脑网站支付 --- 统一收单交易退款接口
 * */
const AlipayDb = require("../service/pay/lib2/db");
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'refund'});

module.exports = async fastify => {
    fastify.post('/alipay/refund', async (req, reply) => {
        try {
            let {outTradeNo, refundAmount, refundReason} = req.body;

            let errArray = [];
            !AlipayFactory.isType(outTradeNo) && errArray.push('outTradeNo is required');
            !AlipayFactory.isType(refundAmount) && errArray.push('refundAmount is required');
            !AlipayFactory.isType(refundReason) && errArray.push('refundReason is required');

            if (errArray.length !== 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            let refundRes = await alipayFactory.createAlipaySdk().exec(
                alipayFactory.ALIPAY_API_MAPPING,
                {
                    bizContent: {
                        outTradeNo,
                        refundAmount,
                        refundReason
                    }
                },
                {
                    validateSign: true // 验签
                }
            );

            if (refundRes['msg'] !== 'Success') {
                return reply.send({
                    status: 'fail',
                    description: '退款失败'
                })
            }

            const updateArr = ['buyer_logon_id', 'buyer_user_id', 'fund_change', 'gmt_refund_pay', 'refund_fee'];
            const conditionArr = ['out_trade_no', 'trade_no'];
            const refundStatus = 1; // 已退款
            let updateRes = await AlipayDb.upDateOrderStatus(refundRes, updateArr, conditionArr, {refundStatus});
            if (!updateRes) {
                return reply.send({
                    status: 'fail',
                    description: '业务处理, 更新订单退款信息失败'
                })
            }

            return reply.send({
                status: 'success',
                description: refundRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradeRefund _err]: ${_err}`
            })
        }
    });

};

// 已支付订单
// { code: '10000',
//   msg: 'Success',
//   buyerLogonId: 'www***@qq.com',
//   buyerUserId: '2088502347015634',
//   fundChange: 'Y',
//   gmtRefundPay: '2018-08-13 17:58:30',
//   outTradeNo: '20181533695615748',
//   refundFee: '0.01',
//   sendBackFee: '0.00',
//   tradeNo: '2018080821001004630517787770' }

// 未支付订单
// {
//   "code": "40004",
//   "msg": "Business Failed",
//   "subCode": "ACQ.TRADE_STATUS_ERROR",
//   "subMsg": "交易状态不合法",
//   "refundFee": "0.00",
//   "sendBackFee": "0.00"
// }

// 已关闭订单
// {
//   "code": "40004",
//   "msg": "Business Failed",
//   "subCode": "ACQ.TRADE_HAS_CLOSE",
//   "subMsg": "交易已经关闭",
//   "refundFee": "0.00",
//   "sendBackFee": "0.00"
// }