const getVCode = require('../modules/vcode');

module.exports = async (fastify, options, next) => {
    let funPromise = time => {
        return new Promise((resolve, reject) => {
            //Pending 进行中
            setTimeout(() => {
                resolve() //从 pending 变为 resolved
            }, time)
        })
    };

    /**
     * @api {post} /api/code GetVCode(获取验证码)
     * @apiName GetVCode(获取验证码)
     * @apiGroup VCode
     *
     * @apiParam {String} phone 手机,必填
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
     *       code: 50000,
     *       msg: 'UnKnow-Error',
     *       cb: {}
     *     }
     */
    fastify.post('/code', async (req, reply) => {
        getVCode(req, reply);
        await funPromise(500);
    });

    next()
};

// module.exports = routes;