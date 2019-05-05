const {getDoctors, getDoc} = require('../modules/doctor');

module.exports = async (fastify, options, next) => {
    /**
     * @api {get} /api/doctors GetDoctors(获取所有医生信息)
     * @apiName GetDoctors(获取医生信息)
     * @apiGroup Doctor
     *
     * @apiParam {Object} _id 医生ID
     * @apiParam {Object} user 用户ID
     * @apiParam {String} name 标题
     * @apiParam {String} specialty 科室
     * @apiParam {String} education 学历
     * @apiParam {String} profession 专业
     * @apiParam {String} title 职称
     * @apiParam {String} hospital 医院
     * @apiParam {String} experience 经历
     * @apiParam {String} face 医生头像
     * @apiParam {Number} state 在线状态(0离线,1在线)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "59e6f0ffac3f89b0675a8f2b",
     *                  user: "59e0497322b76d18046ad591",
     *                  name: "卢欣",
     *                  specialty: "肝脏外科",
     *                  education: "医学博士",
     *                  profession: "对肝胆系统疾病有很高造诣，擅长肝胆系统良性肿瘤、...",
     *                  title: "主任医师",
     *                  hospital: "北京协和医院",
     *                  experience: "1988-1996年，就读于中国协和医科大学医学系，...",
     *                  face: "/face/2018042510441287438.png",
     *                  state: 0
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
    fastify.get('/doctors', async (req, reply) => {
        await getDoctors(req, reply)
    });

    /**
     * @api {get} /api/doctor GetDoctor(获取单个医生信息)
     * @apiName GetDoctor(获取单个医生信息)
     * @apiGroup Doctor
     *
     * @apiParam {Object} id 医生ID,必填(放在headers中)
     * @apiParam {Object} user 用户ID
     * @apiParam {String} name 标题
     * @apiParam {String} specialty 科室
     * @apiParam {String} education 学历
     * @apiParam {String} profession 专业
     * @apiParam {String} title 职称
     * @apiParam {String} hospital 医院
     * @apiParam {String} experience 经历
     * @apiParam {String} face 医生头像
     * @apiParam {Number} state 在线状态(0离线,1在线)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "59e6f0ffac3f89b0675a8f2b",
     *              user: "59e0497322b76d18046ad591",
     *              name: "卢欣",
     *              specialty: "肝脏外科",
     *              education: "医学博士",
     *              profession: "对肝胆系统疾病有很高造诣，擅长肝胆系统良性肿瘤、...",
     *              title: "主任医师",
     *              hospital: "北京协和医院",
     *              experience: "1988-1996年，就读于中国协和医科大学医学系，...",
     *              face: "/face/2018042510441287438.png",
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
    fastify.get('/doctor', async (req, reply) => {
        await getDoc(req, reply)
    });

    next()
};

// module.exports = routes;