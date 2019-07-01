const {getQuestions, getQuestion, postQuestion, questionHistory, answer, docAnswer, accept, consult} = require('../modules/question');

module.exports = async fastify => {
    let funPromise = time => {
        return new Promise((resolve, reject) => {
            //Pending 进行中
            setTimeout(() => {
                resolve() //从 pending 变为 resolved
            }, time)
        })
    };

    /**
     * @api {get} /api/questions GetQuestions(获取所有问题)
     * @apiName GetQuestions(获取所有问题)
     * @apiGroup Question
     *
     * @apiParam {Object} _id 问题ID
     * @apiParam {Object} user 用户ID
     * @apiParam {String} title 标题
     * @apiParam {String} detail 详细信息
     * @apiParam {String} createTime 创建时间
     * @apiParam {Object} answer
     * @apiParam {String} answer.content 医生的回答
     * @apiParam {Object} answer.doctor 医生ID
     * @apiParam {String} answer.time 回答时间
     * @apiParam {Number} state 问题状态(0=可接单，1=已接单，2=已回答)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "5a335d1ca1850d51d3d80f80",
     *                  user: "59e0497322b76d18046ad591",
     *                  title: "title",
     *                  detail: "detail",
     *                  createTime: "2017-12-10T06:14:31.738Z",
     *                  answer:
     *                          {
     *                             content: "gfhdhdf",
     *                             doctor: "59e6f0ffac3f89b0675a8f2b",
     *                             time: "2018-05-30T05:10:13.592Z"
     *                          },
     *                  state: 1
     *
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
    fastify.get('/questions', async (req, reply) => {
        await getQuestions(req, reply)
    });

    /**
     * @api {get} /api/question GetQuestion(获取单个问题)
     * @apiName GetQuestion(获取单个问题)
     * @apiGroup Question
     *
     * @apiParam {Object} id 问题ID,必填(放在headers中)
     * @apiParam {Object} user 用户ID
     * @apiParam {String} title 标题
     * @apiParam {String} detail 详细信息
     * @apiParam {String} createTime 创建时间
     * @apiParam {Object} answer
     * @apiParam {String} answer.content 医生的回答
     * @apiParam {Object} answer.doctor 医生信息
     * @apiParam {String} answer.time 回答时间
     * @apiParam {Number} state 问题状态(0=可接单，1=已接单，2=已回答)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: {
     *              _id: "5a335d1ca1850d51d3d80f80",
     *              user: "59e0497322b76d18046ad591",
     *              title: "title",
     *              detail: "detail",
     *              createTime: "2017-12-10T06:14:31.738Z",
     *              answer:
     *                      {
     *                         content: "gfhdhdf",
     *                         doctor: {
     *                                    _id: "59e6f0ffac3f89b0675a8f2b",
     *                                    user: "59e0497322b76d18046ad591",
     *                                    name: "卢欣",
     *                                    specialty: "肝脏外科",
     *                                    education: "医学博士",
     *                                    profession: "对肝胆系统疾病有很高造诣，擅长肝胆系统良性肿瘤、...",
     *                                    title: "主任医师",
     *                                    hospital: "北京协和医院",
     *                                    experience: "1988-1996年，就读于中国协和医科大学医学系，...",
     *                                    face: "/face/2018042510441287438.png",
     *                                    state: 0
     *                                  },
     *                         time: "2018-05-30T05:10:13.592Z"
     *                    },
     *              state: 1
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
    fastify.get('/question', async (req, reply) => {
        await getQuestion(req, reply)
    });

    /**
     * @api {get} /api/question-history QuestionHistory(获取咨询历史记录)
     * @apiName QuestionHistory(获取咨询历史记录)
     * @apiGroup Question
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {Object} id 问题ID,必填(放在headers中)
     * @apiParam {Object} user 用户ID
     * @apiParam {String} title 标题
     * @apiParam {String} detail 详细信息
     * @apiParam {String} createTime 创建时间
     * @apiParam {Object} answer
     * @apiParam {String} answer.content 医生的回答
     * @apiParam {Object} answer.doctor 医生ID
     * @apiParam {String} answer.time 回答时间
     * @apiParam {Number} state 问题状态(0=可接单，1=已接单，2=已回答)
     *
     * @apiSuccessExample Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       code: 20000,
     *       msg: 'Success',
     *       cb: [
     *              {
     *                  _id: "5a335d1ca1850d51d3d80f80",
     *                  user: "59e0497322b76d18046ad591",
     *                  title: "title",
     *                  detail: "detail",
     *                  createTime: "2017-12-10T06:14:31.738Z",
     *                  answer:
     *                          {
     *                              content: "gfhdhdf",
     *                              doctor: "59e6f0ffac3f89b0675a8f2b"
     *                              time: "2018-05-30T05:10:13.592Z"
     *                          },
     *                  state: 1
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
     *
     *     {
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     *
     *     {
     *       code: 50009,
     *       msg: '医生不存在',
     *       cb: {}
     *     }
     */
    fastify.get('/question-history', async (req, reply) => {
        questionHistory(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/question CreateQuestion(提问)
     * @apiName CreateQuestion(提问)
     * @apiGroup Question
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} title 标题,必填
     * @apiParam {String} detail 详细信息,必填
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
     *
     *     {
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     */
    fastify.post('/question', async (req, reply) => {
        postQuestion(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/consult CreateConsult(一对一咨询)
     * @apiName CreateConsult(一对一咨询)
     * @apiGroup Question
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} title 标题,必填
     * @apiParam {String} detail 详细信息,必填
     * @apiParam {Object} doctorId 咨询医生id,必填
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
     *
     *     {
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     */
    fastify.post('/consult', async (req, reply) => {
        consult(req, reply);
        await funPromise(500);
    });

    /**
     * @api {post} /api/answer AnswerQuestion(回答问题)
     * @apiName AnswerQuestion(回答问题)
     * @apiGroup Question
     *
     * @apiParam {String} token 用户凭证,必填(放在headers中)
     * @apiParam {String} content 问题答案,必填
     * @apiParam {Object} _id 问题ID,必填
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
     *
     *     {
     *       code: 50006,
     *       msg: 'Token过期',
     *       cb: {}
     *     }
     */
    fastify.post('/answer', async (req, reply) => {
        await answer(req, reply)
    });

    /**
     * @api {post} /api/accept AcceptQuestion(接受咨询订单)
     * @apiName AcceptQuestion(接受咨询订单)
     * @apiGroup Question
     *
     * @apiParam {Object} questionId 问题id,必填
     * @apiParam {Object} userId 用户id,必填
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
    fastify.post('/accept', async (req, reply) => {
        await accept(req, reply)
    });

    fastify.get('/doctor-answer', async (req, reply) => {
        await docAnswer(req, reply)
    });

};