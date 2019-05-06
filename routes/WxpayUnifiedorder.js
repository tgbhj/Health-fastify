/***
 * 微信支付2.0 --- 统一下单
 */
const WxpayFactory = require('../service/pay/lib2/wfactory');
const wxpayFactory = new WxpayFactory();
const QueueFactory = require('../service/queue/v2/factory');
const queueFactory = new QueueFactory();
const snakeCaseKeys = require('snakecase-keys');
const QRCode = require('qrcode');
const WxpaySdkFactory = require('../service/pay/lib2/wfactory');
const moment = require("moment");

module.exports = async (fastify, options, next) => {
    const createQR = async (qr_url) => {
        try {
            return await QRCode.toDataURL(qr_url)
        } catch (err) {
            console.error(err)
        }
    };

    /**
     * @api {post} /api/wxpay/pay WXPay(微信支付)
     * @apiName WXPay(微信支付)
     * @apiGroup Pay
     *
     * @apiParam {String} totalFee 价格
     * @apiParam {String} body 支付项目
     * @apiParam {String} user_id 付款用户ID
     * @apiParam {String} User-Agent 固定为'APP',添加在http请求头(headers)里
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       status: 'success',
     *       xml: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xml>xml内容</xml>'
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       status: 'fail',
     *       description: '保存到数据库失败'
     *     }
     */
    fastify.post('/wxpay/pay', async (req, reply) => {
        try {
            let outTradeNo = WxpaySdkFactory.generateOutTradeNo();
            const {body, totalFee, user_id} = req.body;
            req.body.totalFee = req.body.totalFee / 10;
            // 验证参数有效性
            let errArray = [];
            !WxpaySdkFactory.isType(body) && errArray.push('body is required');
            !WxpaySdkFactory.isType(totalFee) && errArray.push('totalFee is required');
            !WxpaySdkFactory.isType(user_id) && errArray.push('user_id is required');

            // 保存到数据库
            !await wxpayFactory.createWxpayDb().save(outTradeNo, req.body) && errArray.push('保存到Wxpay数据库失败');

            if (errArray.length > 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            if (req.headers['user-agent'] === 'APP') {
                let unifiedorderResult = await wxpayFactory.createWxpaySdk3().exec(
                    wxpayFactory.WXPAY_API_MAPPING,
                    {
                        body,
                        outTradeNo,
                        totalFee: parseInt(totalFee), // 0.01
                        spbillCreateIp: wxpayFactory.wxpaySdkConfig.spbillCreateIp,
                        tradeType: wxpayFactory.wxpaySdkConfig.tradeType,
                        notifyUrl: wxpayFactory.wxpaySdkConfig.notifyUrl
                    },
                    {
                        validateSign: true
                    }
                );
                let xml = await wxpayFactory.createWxpaySdk3().secondXML(
                    wxpayFactory.WXPAY_API_MAPPING,
                    {
                        appid: unifiedorderResult.appid,
                        partnerid: unifiedorderResult.mchId,
                        package: 'Sign=WXPay',
                        timestamp: moment().unix(),
                        noncestr: unifiedorderResult.nonceStr,
                        prepayid: unifiedorderResult.prepayId
                    });
                reply.send({
                    status: 'success',
                    xml: xml
                });
            } else {
                let unifiedorderResult = await wxpayFactory.createWxpaySdk2().exec(
                    wxpayFactory.WXPAY_API_MAPPING,
                    {
                        body,
                        outTradeNo,
                        totalFee: parseInt(totalFee), // 0.01
                        spbillCreateIp: wxpayFactory.wxpaySdkConfig.spbillCreateIp,
                        tradeType: wxpayFactory.wxpaySdkConfig.tradeType,
                        notifyUrl: wxpayFactory.wxpaySdkConfig.notifyUrl
                    },
                    {
                        validateSign: true
                    }
                );
                await createQR(unifiedorderResult.codeUrl).then(qrcode => {
                    reply.send({
                        status: 'success',
                        qrcode: qrcode
                    })
                });
            }

            outTradeNo = snakeCaseKeys({outTradeNo});
            // 开始轮询
            queueFactory.createQueue().createJob('wxpay', outTradeNo)
                .delay(5000)
                .backoff({delay: 3000})
                .ttl(2000)
                .attempts(10)
                .save();

        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[WxpayUnifiedorder _err] ${_err}`
            })
        }
    });

    next()
};