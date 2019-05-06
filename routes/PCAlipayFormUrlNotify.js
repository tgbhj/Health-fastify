/**
 * PC电脑网站支付(测试) --- 异步回调(post)
 * */

const AlipayDb = require("../service/pay/lib2/db");
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory();

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/callback/notify', async (req, reply) => {
        try {
            // 真实数据
            console.log('[支付宝post请求notifyUrl]');
            const postData = req.body;

            // 1.验签
            let signRes = alipayFactory.createAlipaySdk().checkNotifySign(postData);
            if (!signRes) {
                return reply.send({
                    status: 'fail',
                    description: '验签失败'
                })
            }
            // 2.比对数据(outTradeNo, appId, totalAmount)
            let checkRes = await AlipayDb.checkNotifyData(postData);
            if (!checkRes) {
                return reply.send({
                    status: 'fail',
                    description: '比对数据失败'
                })
            }

            // 3.检查trade_status
            let tradeStatus = [];
            !(postData['trade_status'] === 'TRADE_SUCCESS') && tradeStatus.push('fail');
            // !(postData['trade_status'] === 'TRADE_FINISH') && tradeStatus.push('fail')
            if (tradeStatus.length > 0) {
                return reply.send({
                    status: 'fail',
                    description: '检查trade_status失败'
                })
            }

            // 4.业务处理, 修改订单状态
            const updateArr = [
                'gmt_create',
                'gmt_payment',
                'notify_time',
                'buyer_id',
                'invoice_amount',
                'notify_id',
                'fund_bill_list',
                'notify_type',
                'trade_no',
                'receipt_amount',
                'seller_id'
            ];
            const conditionArr = ['out_trade_no', 'total_amount', 'app_id'];
            const payStatus = 1;
            let updateRes = await AlipayDb.upDateOrderStatus(postData, updateArr, conditionArr, {payStatus});
            if (!updateRes) {
                return reply.send({
                    status: 'fail',
                    description: '业务处理, 修改订单状态失败'
                })
            }

            return reply.send('success')
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[异步回调 err]: ${_err}`
            })
        }
    });

    next()
};