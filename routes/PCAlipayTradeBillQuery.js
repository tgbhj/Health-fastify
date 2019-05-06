/**
 * PC电脑网站支付 --- 查询对账单下载地址
 * 1.这个接口是下载离线账单的，需要T+1天生成账单，不能查询当日或者是当月的账单，如果日期是当天或者是当月的会返回“参数不合法”；
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory({method: 'billQuery'});

module.exports = async (fastify, options, next) => {
    fastify.post('/alipay/billQuery', async (req, reply) => {
        try {
            let {billType, billDate} = req.body;

            let errArray = [];
            !AlipayFactory.isType(billType) && errArray.push('billType is required');
            !AlipayFactory.isType(billDate) && errArray.push('billDate is required');

            if (errArray.length !== 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            let billQueryRes = await alipayFactory.createAlipaySdk().exec(
                alipayFactory.ALIPAY_API_MAPPING,
                {
                    bizContent: {
                        billType,
                        billDate
                    }
                },
                {
                    validateSign: true // 验签
                }
            );
            console.log('[billQueryRes]', billQueryRes);
            return reply.send({
                status: 'success',
                description: billQueryRes
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradeBillQuery _err]: ${_err}`
            })
        }
    });

    next()
};