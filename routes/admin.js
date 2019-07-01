const {admin, editType} = require('../modules/admin');

module.exports = async fastify => {
    fastify.get("/admin", async (req, reply) => {
        await admin(req, reply);
    });

    /**
     * @api {put} /api/editType EditType(修改用户类型)
     * @apiName EditType(修改用户类型)
     * @apiGroup Admin
     *
     * @apiParam {Object} _id 用户ID,必填
     * @apiParam {Number} type 用户类型,必填(0普通用户,1医生)
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
    fastify.put('/editType', async (req, reply) => {
        await editType(req, reply);
    });

    /**
     * @api {} TestUser TestUser(测试账号)
     * @apiName TestUser(测试账号)
     * @apiGroup Admin
     *
     * @apiParam {String} phone 15221662562(登录账号)
     * @apiParam {String} password 123456789(登录密码)
     */

};