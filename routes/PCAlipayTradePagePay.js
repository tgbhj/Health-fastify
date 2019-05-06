/**
 * PC电脑网站支付 --- 统一收单下单并支付页面接口
 * 2个版本:
 * 1.method='post': 返回表单
 * 2.method='get' : 返回url
 * */
const AlipayFactory = require('../service/pay/lib2/factory');
const alipayFactory = new AlipayFactory();
const QueueFactory = require('../service/queue/v2/factory');
const queueFactory = new QueueFactory();
const snakeCaseKeys = require('snakecase-keys');

module.exports = async (fastify, options, next) => {
    /**
     * @api {post} /api/alipay/appPay AliPay(支付宝支付)
     * @apiName AliPay(支付宝支付)
     * @apiGroup Pay
     *
     * @apiParam {String} totalAmount 价格
     * @apiParam {String} subject 支付项目
     * @apiParam {String} body 支付项目(可以和subject填写相同内容)
     * @apiParam {String} user_id 付款用户ID
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       status: 'success',
     *       url: 'app_id=2018040902524266&charset=utf-8&sign_type=RSA2&version=1.0...'
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       status: 'fail',
     *       description: '保存到数据库失败'
     *     }
     */
    fastify.post('/alipay/appPay', async (req, reply) => {
        try {
            let outTradeNo = AlipayFactory.generateOutTradeNo();
            const {totalAmount, subject, body, user_id} = req.body;
            req.body.totalAmount = req.body.totalAmount / 1000;
            // 验证参数有效性
            let errArray = [];
            !AlipayFactory.isType(totalAmount) && errArray.push('totalAmount is required');
            !AlipayFactory.isType(subject) && errArray.push('subject is required');
            !AlipayFactory.isType(body) && errArray.push('body is required');
            !AlipayFactory.isType(user_id) && errArray.push('user_id is required');

            // 保存到数据库(??? 需要测试)
            !await alipayFactory.createAlipayDb().save(outTradeNo, req.body) && errArray.push('保存到数据库失败');

            if (errArray.length !== 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            // 创建alipayForm
            let formData = AlipayFactory.createAlipayForm()
                .addField('notifyUrl', alipayFactory.notifyUrl)
                .addField('returnUrl', alipayFactory.returnUrl)
                .addField('bizContent', {
                    outTradeNo,
                    productCode: 'FAST_INSTANT_TRADE_PAY',
                    totalAmount,
                    subject,
                    body
                });
            // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
            formData.setMethod('get');
            // console.log('[formData]', formData);

            // 创建alipaySdk
            const url = await alipayFactory.createAlipaySdk().appExec(
                alipayFactory.ALIPAY_API_MAPPING,
                {},
                {
                    formData: formData
                });
            console.log(decodeURI(url.slice(38)));
            reply.send({
                status: 'success',
                url: decodeURI(url.slice(38))
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradePagePay _err]: ${_err}`
            })
        }
    });

    fastify.get('/alipay/pagePay', async (req, reply) => {
        try {
            let outTradeNo = AlipayFactory.generateOutTradeNo();
            const {totalAmount, subject, body, user_id} = req.query;
            req.query.totalAmount = req.query.totalAmount / 1000;
            // 验证参数有效性
            let errArray = [];
            !AlipayFactory.isType(totalAmount) && errArray.push('totalAmount is required');
            !AlipayFactory.isType(subject) && errArray.push('subject is required');
            !AlipayFactory.isType(body) && errArray.push('body is required');
            !AlipayFactory.isType(user_id) && errArray.push('user_id is required');

            // 保存到数据库(??? 需要测试)
            !await alipayFactory.createAlipayDb().save(outTradeNo, req.query) && errArray.push('保存到数据库失败');

            if (errArray.length !== 0) {
                return reply.send({
                    status: 'fail',
                    description: errArray.join('&')
                })
            }

            // 创建alipayForm
            let formData = AlipayFactory.createAlipayForm()
                .addField('notifyUrl', alipayFactory.notifyUrl)
                .addField('returnUrl', alipayFactory.returnUrl)
                .addField('bizContent', {
                    outTradeNo,
                    productCode: 'FAST_INSTANT_TRADE_PAY',
                    totalAmount,
                    subject,
                    body
                });
            // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
            formData.setMethod('get');
            console.log('[formData]', formData);

            // 创建alipaySdk
            const url = await alipayFactory.createAlipaySdk().exec(
                alipayFactory.ALIPAY_API_MAPPING,
                {},
                {
                    formData: formData
                });

            outTradeNo = snakeCaseKeys({outTradeNo});
            // 开始轮询
            queueFactory.createQueue().createJob('alipay', outTradeNo)
                .delay(5000)
                .backoff({delay: 3000})
                .ttl(2000)
                .attempts(10)
                .save();
            console.log('[url]', url);

            return reply.send({
                status: 'success',
                url: url
            })
        } catch (_err) {
            return reply.send({
                status: 'fail',
                description: `[PCAlipayTradePagePay _err]: ${_err}`
            })
        }
    });

    // fastify.post('/alipay/pagePay', async (req, reply) => {
    //     try {
    //         let outTradeNo = AlipayFactory.generateOutTradeNo();
    //         const {totalAmount, subject, body, user_id} = req.body;
    //         // 验证参数有效性
    //         let errArray = [];
    //         !AlipayFactory.isType(totalAmount) && errArray.push('totalAmount is required');
    //         !AlipayFactory.isType(subject) && errArray.push('subject is required');
    //         !AlipayFactory.isType(body) && errArray.push('body is required');
    //         !AlipayFactory.isType(user_id) && errArray.push('user_id is required');
    //
    //         // 保存到数据库
    //         !await alipayFactory.createAlipayDb().save(outTradeNo, req.body) && errArray.push('保存到Alipay数据库失败');
    //
    //         if (errArray.length !== 0) {
    //             return reply.send({
    //                 status: 'fail',
    //                 description: errArray.join('&')
    //             })
    //         }
    //
    //         // 创建alipayForm
    //         let formData = AlipayFactory.createAlipayForm()
    //             .addField('notifyUrl', alipayFactory.notifyUrl)
    //             .addField('returnUrl', alipayFactory.returnUrl)
    //             .addField('bizContent', {
    //                 outTradeNo,
    //                 productCode: 'FAST_INSTANT_TRADE_PAY',
    //                 totalAmount,
    //                 subject,
    //                 body
    //             });
    //
    //         // 创建alipaySdk
    //         const form = await alipayFactory.createAlipaySdk().exec(
    //             alipayFactory.ALIPAY_API_MAPPING,
    //             {},
    //             {
    //                 formData: formData
    //             });
    //
    //         outTradeNo = snakeCaseKeys({outTradeNo});
    //         // 开始轮询
    //         queueFactory.createQueue().createJob('alipay', outTradeNo)
    //             .delay(5000)
    //             .backoff({delay: 3000})
    //             .ttl(2000)
    //             .attempts(10)
    //             .save();
    //
    //         console.log('[form]', form);
    //         reply
    //             .send(form)
    //     } catch (_err) {
    //         return reply.send({
    //             status: 'fail',
    //             description: `[PCAlipayTradePagePay _err]: ${_err}`
    //         })
    //     }
    // });

    next()
};