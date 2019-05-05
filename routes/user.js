const {reg, signByPass, getUsers, getUser, fp_step1, fp_step2, getPolicy, getUserCollect, userCollect, delUserCollect, delUserLike, userLike, edit, validateToken, uploadFace, saveFace} = require('../modules/user');

module.exports = async (fastify, options, next) => {
    fastify.register(require('fastify-multipart'));
    let funPromise = time => {
        return new Promise((resolve, reject) => {
            //Pending 进行中
            setTimeout(() => {
                resolve() //从 pending 变为 resolved
            }, time)
        })
    };

    /**
     * @api {post} /api/reg Reg(注册)
     * @apiName reg 注册
     * @apiGroup User
     *
     * @apiParam {String} phone  手机,必填
     * @apiParam {String} password 密码,必填
     * @apiParam {String} VCode  验证码,必填
     * @apiParam {String} token 用户凭证
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: "Success",
     *       cb: {
     *              token: "7OVRajH4L5FuZ7zWgWy7bylB7XLW8UtL"
     *           }
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50001,
     *       msg: "手机已注册",
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50003,
     *       msg: "验证码不存在或过期",
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50002,
     *       msg: "验证码错误",
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50000,
     *       msg: "UnKnow-Error",
     *       cb: {}
     *     }
     */
    fastify.post("/reg", async (req, reply) => {
        reg(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/sign Sign(登录)
     * @apiName sign(登录)
     * @apiGroup User
     *
     * @apiParam {String} phone 手机,必填
     * @apiParam {String} password 密码,必填
     * @apiParam {String} token 用户凭证
     * @apiParam {Number} type 用户类型(0普通用户,1医生)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: "Success",
     *       cb: {
     *              token: "7OVRajH4L5FuZ7zWgWy7bylB7XLW8UtL",
     *              type: 0
     *           }
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50004,
     *       msg: "账号或密码错误",
     *       cb: {}
     *     }
     */
    fastify.post("/sign", async (req, reply) => {
        signByPass(req, reply);
        await funPromise(500);
    });

    fastify.get('/users', async (req, reply) => {
        await getUsers(req, reply)
    });

    /**
     * @api {get} /api/user GetUser(获取用户信息)
     * @apiName GetUser(获取用户信息)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {Object} _id 用户ID
     * @apiParam {String} username 用户名
     * @apiParam {String} email 邮箱
     * @apiParam {String} phone 手机号
     * @apiParam {String} name 姓名
     * @apiParam {String} token.content 用户凭证
     * @apiParam {String} token.startTime 用户凭证生成时间
     * @apiParam {String} token.endTime 用户凭证过期时间
     * @apiParam {Number} jurisdiction 直播权限(0没有权限,1有权限)
     * @apiParam {Number} admin 管理员权限(0没有权限,1有权限)
     * @apiParam {Number} type 用户类型(0普通用户,1医生)
     * @apiParam {String} face 头像
     * @apiParam {String} birthday 出生日期
     * @apiParam {Number} sex 性别
     * @apiParam {Number} virtual 积分
     * @apiParam {String} name 真实姓名
     * @apiParam {String} IdCard 身份证
     * @apiParam {String} use 账号是否冻结(0否，1冻结)
     * @apiParam {String} collect 收藏信息的id
     * @apiParam {String} like 点赞信息id
     * @apiParam {Number} state 在线状态(0离线,1在线)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: "Success"
     *       cb: {
     *              _id: "59e0497322b76d18046ad591",
     *              username: "adinno123",
     *              email: "123@qq.com",
     *              phone: "15221661234",
     *              token: {
     *                         content: "VBSTqfr4gx8wnNQSzeKW5Vz0tmH5CSVLWhYU",
     *                         startTime: "2018-09-13T05:04:51.892Z",
     *                         endTime: "2018-09-20T05:04:51.892Z"
     *                     },
     *              jurisdiction: 1,
     *              admin: 0,
     *              vip: 0,
     *              type: 1,
     *              face: "/face/2018042510441287438.png",(默认头像/face/face.png)
     *              virtual: 0,(积分)
     *              name: 'abc',
     *              IdCard: '123456789012345678',
     *              use: 0,
     *              sex: 0,
     *              birthday: '1990-01-01',
     *              collect: [
     *                          "5a5455a1684d3b2b308f6128",
     *                          ...
     *                       ],
     *              like: [
     *                       "5a5455a1684d3b2b308f6128",
     *                       ...
     *                    ],
     *              state: 0
     *           }
     *     }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50006,
     *       msg: "Token过期",
     *       cb: {}
     *     }
     */
    fastify.get('/user', async (req, reply) => {
        await getUser(req, reply)
    });

    /**
     * @api {get} /api/token ValidateToken(Token验证)
     * @apiName ValidateToken(Token验证)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中),单独验证token时使用
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
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     */
    fastify.get('/token', async (req, reply) => {
        await validateToken(req, reply)
    });

    /**
     * @api {post} /api/first FindPasswordStep1(找回密码，修改密码的第一步)
     * @apiName FindPasswordStep1(找回密码，修改密码的第一步)
     * @apiGroup User
     *
     * @apiParam {String} phone 手机,必填
     * @apiParam {String} VCode 验证码,必填
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
     *       code: 50002,
     *       msg: '验证码错误',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50003,
     *       msg: '验证码不存在或过期',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50007,
     *       msg: '此号码未注册',
     *       cb: {}
     *     }
     */
    fastify.post('/first', async (req, reply) => {
        fp_step1(req, reply);
        await funPromise(500);
    });

    /**
     * @api {put} /api/second FindPasswordStep2(找回密码，修改密码的第二步)
     * @apiName FindPasswordStep2(找回密码，修改密码的第二步)
     * @apiGroup User
     *
     * @apiParam {String} phone 手机,必填
     * @apiParam {String} password 密码,必填
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
    fastify.put('/second', async (req, reply) => {
        fp_step2(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/uploadFace UploadFace(上传头像)
     * @apiName UploadFace(上传头像)
     * @apiGroup User
     *
     * @apiParam {File} face single='face'上传文件,必填
     * @apiParam {String} Content-Type 固定为'multipart/form-data',添加在http请求头(headers)里
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
    fastify.post('/uploadFace', async (req, reply) => {
        uploadFace(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/saveFace SaveFace(保存头像)
     * @apiName SaveFace(保存头像)
     * @apiGroup User
     *
     * @apiParam {Object} _id 用户ID,必填
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
    fastify.post('/saveFace', async (req, reply) => {
        await saveFace(req, reply)
    });

    /**
     * @api {get} /api/policy GetPolicy(获取用户保险购买记录)
     * @apiName GetPolicy(获取用户保险购买记录)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} orderId 投保序列号
     * @apiParam {String} channelOrderNo 订单号
     * @apiParam {String} plan A(有社保),B(无社保)
     * @apiParam {String} premium 保费
     * @apiParam {String} amount 保额
     * @apiParam {String} effectivTime 保险起期
     * @apiParam {String} terminalTime 保险止期
     * @apiParam {String} policyNo 保单号
     * @apiParam {String} policyAddress 电子保单下载地址
     * @apiParam {String} recognize 投保人姓名
     * @apiParam {String} recognizeTelNumber 投保人电话
     * @apiParam {Number} state 0(未支付),1(已支付)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "5b8f46f64d05411c4b5b774b",
     *                  user: "59e0497322b76d18046ad591",
     *                  orderId: "123456",
     *                  channelOrderNo: "12345678",
     *                  plan: "A",
     *                  premium: "1.00",
     *                  amount: "10",
     *                  effectivTime: "2018-09-03 00:00:00",
     *                  terminalTime: "2018-09-03 23:59:59",
     *                  policyNO: "abcd",
     *                  policyAddress: "http://seeihealth.com",
     *                  recognize: "1111",
     *                  recognizeeTelNumber: "15221662562",
     *                  state: 1
     *              },
     *              { ... }
     *       ]
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
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     */
    fastify.get('/policy', async (req, reply) => {
        await getPolicy(req, reply);
    });

    /**
     * @api {get} /api/userCollect UserCollect(获取用户收藏记录)
     * @apiName UserCollect(获取用户收藏记录)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *                  _id: "59e0497322b76d18046ad591",
     *                  collect: [
     *                               {
     *                                  _id: "5a5455a1684d3b2b308f6128",
     *                                  title: "还童有术——干细胞",
     *                                  image: "/images/20180417093029.jpg",
     *                                  detail: "干细胞(Stem Cell)是一种未充分分化，尚不成熟的细胞，...",
     *                                  createTime: "2018-01-09T05:39:45.220Z",
     *                                  like: [
     *                                           "59e0497322b76d18046ad591",
     *                                           ...
     *                                        ],
     *                                  view: 0,
     *                                  collect: [
     *                                              "59e0497322b76d18046ad591",
     *                                              ...
     *                                           ]
     *                               }
     *                           ]
     *              },
     *              { ... }
     *           }
     *
     * @apiErrorExample Error-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 50000,
     *       msg: 'UnKnow-Error',
     *       cb: {}
     *     }
     */
    fastify.get('/userCollect', async (req, reply) => {
        await getUserCollect(req, reply);
    });

    /**
     * @api {post} /api/userCollect UserCollect(用户表里存收藏信息的ID)
     * @apiName UserCollect(用户表里存收藏信息的ID)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {Object} infoId 医学信息ID,必填
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59e0497322b76d18046ad591",
     *              username: "SH-1",
     *              email: "123@qq.com",
     *              phone: "15221662562",
     *              virtual: 0,
     *              token: {
     *                         content: "b1rcoNZnvMQLTc75934tLjHArDmq2TvTVLN9",
     *                         startTime: "2018-09-13T05:04:51.892Z",
     *                         endTime: "2018-11-21T02:35:16.000Z"
     *                     },
     *              jurisdiction: 0,
     *              admin: 1,
     *              vip: 0,
     *              face: "/face/2018042510441287438.png",
     *              type: 1,
     *              IdCard: "123456789012345678",
     *              name: "1234",
     *              use: 0,
     *              sex: 0,
     *              birthday: '1990-01-01',
     *              collect: [
     *                          "5a5455a1684d3b2b308f6128",
     *                          ...
     *                       ],
     *              like: [
     *                       "5a5455a1684d3b2b308f6128",
     *                       ...
     *                    ],
     *              state: 0
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
    fastify.post('/userCollect', async (req, reply) => {
        await userCollect(req, reply)
    });

    /**
     * @api {post} /api/delUserCollect DelUserCollect(删除用户表里收藏信息的ID)
     * @apiName DelUserCollect(删除用户表里收藏信息的ID)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填
     * @apiParam {Object} infoId 医学信息ID,必填
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
    fastify.post('/delUserCollect', async (req, reply) => {
        await delUserCollect(req, reply)
    });

    /**
     * @api {post} /api/userLike UserLike(用户表里存点赞信息的ID)
     * @apiName UserLike(用户表里存点赞信息的ID)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {Object} infoId 医学信息ID,必填
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59e0497322b76d18046ad591",
     *              username: "SH-1",
     *              email: "123@qq.com",
     *              phone: "15221662562",
     *              virtual: 0,
     *              token: {
     *                         content: "b1rcoNZnvMQLTc75934tLjHArDmq2TvTVLN9",
     *                         startTime: "2018-09-13T05:04:51.892Z",
     *                         endTime: "2018-11-21T02:35:16.000Z"
     *                     },
     *              jurisdiction: 0,
     *              admin: 1,
     *              vip: 0,
     *              face: "/face/2018042510441287438.png",
     *              type: 1,
     *              IdCard: "123456789012345678",
     *              name: "1234",
     *              use: 0,
     *              sex: 0,
     *              birthday: '1990-01-01',
     *              collect: [
     *                          “5a5455a1684d3b2b308f6128",
     *                          ...
     *                       ],
     *              like: [
     *                       "5a5455a1684d3b2b308f6128",
     *                       ...
     *                    ],
     *              state: 0
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
    fastify.post('/userLike', async (req, reply) => {
        await userLike(req, reply)
    });

    /**
     * @api {post} /api/delUserLike DelUserLike(删除用户表里点赞信息的ID)
     * @apiName DelUserLike(删除用户表里点赞信息的ID)
     * @apiGroup User
     *
     * @apiParam {String} token 用户凭证,必填
     * @apiParam {Object} infoId 医学信息ID,必填
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
    fastify.post('/delUserLike', async (req, reply) => {
        await delUserLike(req, reply)
    });

    /**
     * @api {put} /api/edit UserInfoEdit(修改用户信息)
     * @apiName UserInfoEdit(修改用户信息)
     * @apiGroup User
     *
     * @apiParam {Object} _id 用户ID,必填
     * @apiParam {Object} userInfo {username:'123',email:'132@qq.com',name:'132',birthday:'1999-01-01',sex:0}
     * @apiParam {String} username 用户名,选填(除_id外至少填1项)
     * @apiParam {String} email 邮箱,选填(除_id外至少填1项)
     * @apiParam {String} name 姓名,选填(除_id外至少填1项)
     * @apiParam {String} birthday 出生日期,选填(除_id外至少填1项)
     * @apiParam {Number} sex 性别,选填(除_id外至少填1项)
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
    fastify.put('/edit', async (req, reply) => {
        await edit(req, reply)
    });

    /**
     * @api {get} /agreement Agreement(用户协议)
     * @apiName Agreement(用户协议)
     * @apiGroup User
     *
     * @apiParam {Url} agreement https://seeihealth.com/agreement(直接加载网页)
     */

    /**
     * @api {get} /filename Url(临时用点播直播地址)
     * @apiName Url(临时用点播直播地址)
     * @apiGroup User
     *
     * @apiParam {Url} hls http://dnionh265.seei.tv/health/YveKZe8SHsRjssWsO8d6DaxMcBGuksMn/index.m3u8
     * @apiParam {Url} mp4 https://seeihealth.com/videos/YveKZe8SHsRjssWsO8d6DaxMcBGuksMn.mp4(hls不可用时使用)
     * @apiParam {Url} vod 点播使用同上，直播暂时固定为YveKZe8SHsRjssWsO8d6DaxMcBGuksMn
     */

    next()
};

// module.exports = routes;