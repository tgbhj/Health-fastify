const {inquire, insure, payment, payInfo, getInsure} = require('../modules/huatai');

module.exports = async fastify => {
    /**
     * @api {post} /api/inquire QueryPrice(查询价格,step1)
     * @apiName QueryPrice(查询价格)
     * @apiGroup HuaTai
     *
     * @apiParam {String} plan 社保(有A,无B)
     * @apiParam {String} birthday 投保人出生年月日
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *             premium: '0.01'(华泰返回的查询价格)
     *           }
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50010,
     *       msg: res.data.errMsg(华泰返回的错误信息),
     *       cb: {}
     *     }
     */
    fastify.post('/inquire', async (req, reply) => {
        await inquire(req, reply);
    });

    /**
     * @api {post} /api/insure PolicyHolderInfo(投保人信息,step2)
     * @apiName PolicyHolderInfo(投保人信息)
     * @apiGroup HuaTai
     *
     * @apiParam {String} name 投保人姓名
     * @apiParam {String} sex 投保人性别(0:男, 1:女, 2: 未知)
     * @apiParam {String} phone 投保人手机号
     * @apiParam {String} IdCard 投保人身份证号
     * @apiParam {Object} userId 用户ID
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {}
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50011,
     *       msg: res.data.responseInfo(华泰返回的错误信息),
     *       cb: {}
     *     }
     */
    fastify.post('/insure', async (req, reply) => {
        await insure(req, reply);
    });

    /**
     * @api {get} /api/payment?userId=59e0497322b76d18046ad591 GetPaymentForm(获取支付表单,step3)
     * @apiName GetPaymentForm(获取支付表单)
     * @apiGroup HuaTai
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       请求成功直接返回Form表单(直接显示表单即可,表单为华泰收银台)
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50012,
     *       msg: res.data.errMsg(华泰返回的错误信息),
     *       cb: {}
     *     }
     */
    fastify.get('/payment', async (req, reply) => {
        await payment(req, reply);
    });

    fastify.post('/paymentCallBack', async (req, reply) => {
        await payInfo(req, reply);
    });

    /**
     * @api {get} /api/getInsure GetInsure(获取所有保险信息)
     * @apiName GetInsure(获取所有保险信息)
     * @apiGroup HuaTai
     *
     * @apiParam {Object} _id ID
     * @apiParam {String} company 公司名称
     * @apiParam {String} title 保险项目名称
     * @apiParam {String} content 适用范围
     * @apiParam {String} time 期限
     * @apiParam {String} price 价格
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: "Success",
     *       cb: [
     *              {
     *                 _id: "5bd6d18a229c61e968552cda",
     *                 company: "华泰保险",
     *                 title: "泰然无忧百万医疗险：无社保款",
     *                 content: "适用人群：癌症/医疗/意外均保｜特殊门诊/不限社保",
     *                 time: "保险期限：365天",
     *                 price: "￥289.0起"
     *              },
     *              { ... }
     *           ]
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50000,
     *       msg: "UnKnow-Error",
     *       cb: {}
     *     }
     */
    fastify.get('/getInsure', async (req, reply) => {
        await getInsure(req, reply)
    });

};