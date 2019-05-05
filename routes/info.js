const {getInfo, getInfos, setCollect, delCollect, delLike, setLike, getMed} = require('../modules/info');

module.exports = async (fastify, options, next) => {
    /**
     * @api {get} /api/infos GetInfos(获取所有医学信息)
     * @apiName GetInfos(获取所有医学信息)
     * @apiGroup Info
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "5a5455a1684d3b2b308f6128",
     *                  title: "还童有术——干细胞",
     *                  image: "/images/20180417093029.jpg",
     *                  detail: "干细胞(Stem Cell)是一种未充分分化，尚不成熟的细胞，...",
     *                  view: 0,
     *                  like: [
     *                           "59e0497322b76d18046ad591",
     *                           ...
     *                        ],
     *                  createTime: "2018-01-09T05:39:45.220Z",
     *                  collect: [
     *                              "59e0497322b76d18046ad591",
     *                              ...
     *                           ]
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
     */
    fastify.get('/infos', async (req, reply) => {
        await getInfos(req, reply);
    });

    /**
     * @api {get} /api/info GetInfo(获取单个医学信息)
     * @apiName GetInfo(获取单个医学信息)
     * @apiGroup Info
     *
     * @apiParam {Object} id 医学信息ID,必填(放在headers中)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "5a5455a1684d3b2b308f6128",
     *              title: "还童有术——干细胞",
     *              image: "/images/20180417093029.jpg",
     *              detail: "干细胞(Stem Cell)是一种未充分分化，尚不成熟的细胞，...",
     *              createTime: "2018-01-09T05:39:45.220Z",
     *              view: 0,
     *              like: [
     *                       "59e0497322b76d18046ad591",
     *                       ...
     *                    ],
     *              collect: [
     *                          "59e0497322b76d18046ad591",
     *                          ...
     *                       ]
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
    fastify.get('/info', async (req, reply) => {
        await getInfo(req, reply);
    });

    /**
     * @api {post} /api/setCollect SetCollect(医学信息表里收藏的用户ID)
     * @apiName SetCollect(医学信息表里收藏的用户ID)
     * @apiGroup Info
     *
     * @apiParam {Object} infoId 医学信息ID,必填
     * @apiParam {Object} userId 用户ID,必填
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "5a5455a1684d3b2b308f6128",
     *              title: "还童有术——干细胞",
     *              image: "/images/20180417093029.jpg",
     *              detail: "干细胞(Stem Cell)是一种未充分分化，尚不成熟的细胞，...",
     *              view: 0,
     *              like: [
     *                       "59e0497322b76d18046ad591",
     *                       ...
     *                    ],
     *              createTime: "2018-01-09T05:39:45.220Z",
     *              collect: [
     *                          "59e0497322b76d18046ad591",
     *                          ...
     *                       ]
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
    fastify.post('/setCollect', async (req, reply) => {
        await setCollect(req, reply)
    });

    /**
     * @api {post} /api/delCollect DelCollect(删除用户表里收藏信息的ID)
     * @apiName DelCollect(删除用户表里收藏信息的ID)
     * @apiGroup Info
     *
     * @apiParam {Object} infoId 医学信息ID,必填
     * @apiParam {Object} userId 用户ID,必填
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
    fastify.post('/delCollect', async (req, reply) => {
        await delCollect(req, reply)
    });

    /**
     * @api {post} /api/delLike DelLike(删除用户表里点赞信息的ID)
     * @apiName DelLike(删除用户表里点赞信息的ID)
     * @apiGroup Info
     *
     * @apiParam {Object} infoId 医学信息ID,必填
     * @apiParam {Object} userId 用户ID,必填
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
    fastify.post('/delLike', async (req, reply) => {
        await delLike(req, reply)
    });

    /**
     * @api {post} /api/setLike SetLike(医学信息表里点赞的用户ID)
     * @apiName SetLike(医学信息表里点赞的用户ID)
     * @apiGroup Info
     *
     * @apiParam {Object} infoId 医学信息ID,必填
     * @apiParam {Object} userId 用户ID,必填
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "5a5455a1684d3b2b308f6128",
     *              title: "还童有术——干细胞",
     *              image: "/images/20180417093029.jpg",
     *              detail: "干细胞(Stem Cell)是一种未充分分化，尚不成熟的细胞，...",
     *              view: 0,
     *              like: [
     *                       "59e0497322b76d18046ad591",
     *                       ...
     *                    ],
     *              createTime: "2018-01-09T05:39:45.220Z",
     *              collect: [
     *                          "59e0497322b76d18046ad591",
     *                          ...
     *                       ]
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
    fastify.post('/setLike', async (req, reply) => {
        await setLike(req, reply)
    });

    /**
     * @api {get} /api/getMed GetMed(获取国外处方药)
     * @apiName GetMed(获取国外处方药)
     * @apiGroup Info
     *
     * @apiParam {String} medicine 药品名称
     * @apiParam {String} component 有效成分
     * @apiParam {String} disease 适用症状
     * @apiParam {String} company 所属公司
     * @apiParam {String} approval 批准时间
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "59915d69fca098b11cc2e4c2",
     *                  medicine: "Imfinzi",
     *                  component: "durvalumab",
     *                  disease: "治疗局部晚期或转移性尿路上皮癌患者",
     *                  company: "AstraZeneca（阿斯利康制药）",
     *                  approval: "2017-04-30T16:00:00.000Z",
     *                  createTime: "2017-08-14T08:20:57.534Z",
     *                  __v: 0
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
    fastify.get('/getMed', async (req, reply) => {
        await getMed(req, reply)
    });

    next()
};

// module.exports = routes;