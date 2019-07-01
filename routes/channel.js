const {getChannels, getChannel, createChannel, modifyChannel, channelDel, userChannel} = require('../modules/channel');

module.exports = async fastify => {

    /**
     * @api {post} /api/channel CreateChannel(创建直播间)
     * @apiName CreateChannel(创建直播间)
     * @apiGroup Channel
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} title 标题
     * @apiParam {String} detail 详细信息
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59edadee142f633ee7683aca",
     *              user: "59e0497322b76d18046ad591",
     *              title: "医生直播",
     *              detail: "医生直播",
     *              createTime: "2017-10-23T05:04:51.892Z",
     *              state: 1,(0未直播,1直播)
     *              poster: "/images/poster.jpg"
     *           }
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50000,
     *       msg: 'UnKnow-Error',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50008,
     *       msg: '直播间已存在',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50006,
     *       msg: 'token过期',
     *       cb: {}
     *     }
     */
    fastify.post("/channel", async (req, reply) => {
        await createChannel(req, reply)
    });

    /**
     * @api {put} /api/channel PutChannel(修改直播间)
     * @apiName Channel(修改直播间)
     * @apiGroup Channel
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} title 标题
     * @apiParam {String} detail 详细信息
     * @apiParam {Number} state 直播间状态(0,1)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59edadee142f633ee7683aca",
     *              user: "59e0497322b76d18046ad591",
     *              title: "医生直播",
     *              detail: "医生直播",
     *              createTime: "2017-10-23T05:04:51.892Z",
     *              state: 1,(0未直播,1直播)
     *              poster: "/images/poster.jpg"
     *           }
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
    fastify.put("/channel", async (req, reply) => {
        await modifyChannel(req, reply)
    });


    fastify.delete('/channelDel/:_id', async (req, reply) => {
        await channelDel(req, reply)
    });

    /**
     * @api {get} /api/channels GetChannels(获取所有频道)
     * @apiName GetChannels(获取所有频道)
     * @apiGroup Channel
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "59edadee142f633ee7683aca",
     *                  user: "59e0497322b76d18046ad591",
     *                  title: "医生直播",
     *                  detail: "医生直播",
     *                  createTime: "2017-10-23T05:04:51.892Z",
     *                  state: 1,(0未直播,1直播)
     *                  poster: "/images/poster.jpg"
     *              },
     *              { ... }
     *           ]
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
    fastify.get('/channels', async (req, reply) => {
        await getChannels(req, reply)
    });

    /**
     * @api {get} /api/channel GetChannel(获取单个频道)
     * @apiName GetChannel(获取单个频道)
     * @apiGroup Channel
     *
     * @apiParam {Object} id 频道ID,必填(放在headers中)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59edadee142f633ee7683aca",
     *              user: "59e0497322b76d18046ad591",
     *              title: "医生直播",
     *              detail: "医生直播",
     *              createTime: "2017-10-23T05:04:51.892Z",
     *              state: 1,(0未直播,1直播)
     *              poster: "/images/poster.jpg"
     *           }
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
    fastify.get('/channel', async (req, reply) => {
        await getChannel(req, reply)
    });

    /**
     * @api {get} /api/userChannel UserChannel(查询用户直播间是否存在)
     * @apiName UserChannel(查询用户直播间是否存在)
     * @apiGroup Channel
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20001,
     *       msg: '直播间不存在',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 20002,
     *       msg: '直播间已存在',
     *       cb: {}
     *     }
     */
    fastify.get('/userChannel', async (req, reply) => {
        await userChannel(req, reply)
    });

    /**
     * @api {} stream(直播推流)
     * @apiName stream(直播推流)
     * @apiGroup Channel
     *
     * @apiParam {String} url rtmp://www.seeihealth.com/live/59e0497322b76d18046ad591(推流测试地址),59e0497322b76d18046ad591为推流码,用户ID作为推流码使用
     */

};