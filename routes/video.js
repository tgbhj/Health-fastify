const {getVideos, getVideo, saveVideo, videoDel, uploadVideo} = require('../modules/video');

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
     * @api {get} /api/videos GetVideos(获取所有视频)
     * @apiName GetVideos(获取所有视频)
     * @apiGroup Video
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "59ed9bf8142f633ee768340e",
     *                  name: "video",
     *                  size: 123456,
     *                  title: "医学视频",
     *                  poster: "/images/poster.jpg",
     *                  createTime: "2017-01-22T07:43:38.358Z",
     *                  collect: [],
     *                  money: 0
     *              }，
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
    fastify.get('/videos', async (req, reply) => {
        await getVideos(req, reply)
    });

    /**
     * @api {get} /api/video GetVideo(获取单个视频)
     * @apiName GetVideo(获取单个视频)
     * @apiGroup Video
     *
     * @apiParam {Object} id 视频ID,必填(放在headers中)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59ed9bf8142f633ee768340e",
     *              name: "video",
     *              size: 123456,
     *              title: "医学视频",
     *              createTime: "2017-01-22T07:43:38.358Z",
     *              collect: [],
     *              money: 0,
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
    fastify.get('/video', async (req, reply) => {
        await getVideo(req, reply)
    });

    fastify.post("/saveVideo", async (req, reply) => {
        saveVideo(req, reply, video);
        await funPromise(500);
    });

    fastify.delete('/videoDel/:_id', async (req, reply) => {
        await videoDel(req, reply);
    });

    fastify.post('/uploadVideo', async (req, reply) => {
        uploadVideo(req, reply);
        await funPromise(500);
    });

    next()
};