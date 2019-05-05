const {getLines} = require('../modules/line');

module.exports = async (fastify, options, next) => {
    /**
     * @api {get} /api/lines GetLines(获取所有线路)
     * @apiName GetLines(获取所有线路)
     * @apiGroup Line
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "5c173fa1e39a6f8154006e8e",
     *              name: "health",
     *              rtmp: "",
     *              hls: "https://dnionh265.seei.tv",
     *              (点播地址示例：https://dnionh265.seei.tv/health/YveKZe8SHsRjssWsO8d6DaxMcBGuksMn.mp4(视频名,可以不加.mp4后缀)/index.m3u8)
     *              sort: 3,
     *              limit: 100,
     *              isCdn: true,
     *              status: "ready",
     *              online: 0
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
    fastify.get("/lines", async (req, reply) => {
        await getLines(req, reply);
    });

    next()
};

// module.exports = routes;