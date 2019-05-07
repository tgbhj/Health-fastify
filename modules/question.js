const questions = require('../dbs/questions');
const doctors = require('../dbs/doctors');
const {findByToken} = require('../modules/user');
const mongoose = require('mongoose');
const hhlusers = require('../dbs/hhlusers');

async function getQuestions(req, reply) {
    await questions
        .find({state: 0})
        .sort({createTime: -1})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'Null',
                cb: cb
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        })
}

async function getQuestion(req, reply) {
    await questions
        .findById({_id: req.headers.id})
        .populate('answer.doctor')
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'Null',
                cb: cb
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        })
}

async function questionHistory(req, reply) {
    await findByToken(req, reply).then(async user => {
        if (user.length !== 0) {
            if (user[0].type === 0) {
                await questions
                    .find({user: user[0]._id})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'Null',
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            cb: {}
                        })
                    })
            } else {
                await doctors
                    .findOne({user: user[0]._id})
                    .then(doctor => {
                        if (doctor != null) {
                            questions
                                .find({'answer.doctor': doctor._id})
                                .then(cb => {
                                    reply.send({
                                        code: 20000,
                                        msg: 'Success',
                                        err: 'Null',
                                        cb: cb
                                    })
                                }, err => {
                                    reply.send({
                                        code: 50000,
                                        msg: 'UnKnow-Error',
                                        err: err,
                                        cb: {}
                                    })
                                })
                        } else {
                            reply.send({
                                code: 50009,
                                msg: '医生不存在',
                                cb: {}
                            })
                        }
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            cb: {}
                        })
                    })
            }
        } else {
            reply.send({
                code: 50006,
                msg: 'token过期',
                err: 'Null',
                cb: {}
            })
        }
    });
}

async function postQuestion(req, reply) {
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            new questions({
                user: user[0]._id,
                title: req.body.title,
                detail: req.body.detail
            }).save((err, cb) => {
                if (err == null) {
                    reply.send({
                        code: 20000,
                        msg: 'Success',
                        err: 'Null',
                        cb: cb
                    })
                } else {
                    reply.send({
                        code: 50000,
                        msg: 'UnKnow-Error',
                        err: err,
                        cb: {}
                    })
                }
            })
        } else {
            reply.send({
                code: 50006,
                msg: 'Token过期',
                err: 'Null',
                cb: {}
            })
        }
    });
}

async function consult(req, reply) {
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            new questions({
                user: user[0]._id,
                title: req.body.title,
                detail: req.body.detail,
                answer: {
                    doctor: req.body.doctorId,
                    time: new Date()
                },
                state: 1
            }).save((err, cb) => {
                if (err == null) {
                    reply.send({
                        code: 20000,
                        msg: 'Success',
                        err: 'Null',
                        cb: cb
                    })
                } else {
                    reply.send({
                        code: 50000,
                        msg: 'UnKnow-Error',
                        err: err,
                        cb: {}
                    })
                }
            })
        } else {
            reply.send({
                code: 50006,
                msg: 'Token过期',
                err: 'Null',
                cb: {}
            })
        }
    });
}

async function answer(req, reply) {
    await findByToken(req, reply).then(async user => {
        if (user.length !== 0) {
            await questions
                .findByIdAndUpdate({_id: req.body._id}, {
                    $set: {
                        'answer.content': req.body.content,
                        state: 2
                    }
                })
                .then(() => {
                    hhlusers.findOneAndUpdate({_id: user[0]._id}, {$set: {virtual: user[0].virtual + 10}}).exec();
                    reply.send({
                        code: 20000,
                        msg: 'Success',
                        err: 'Null',
                        cb: {}
                    })
                }, err => {
                    reply.send({
                        code: 50000,
                        msg: 'UnKnow-Error',
                        err: err,
                        cb: {}
                    })
                })
        } else {
            reply.send({
                code: 50006,
                msg: 'Token过期',
                err: 'Null',
                cb: {}
            })
        }
    });
}

async function docAnswer(req, reply) {
    await findByToken(req, reply).then(async user => {
        if (user.length !== 0) {
            let doc = await doctors.findOne({user: user[0]._id}).exec();
            if (doc != null) {
                await questions
                    .findOne({'answer.doctor': doc._id, _id: mongoose.Types.ObjectId(req.headers._id)})
                    .then(cb => {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'Null',
                            cb: cb
                        })
                    }, err => {
                        reply.send({
                            code: 50000,
                            msg: 'UnKnow-Error',
                            err: err,
                            cb: {}
                        })
                    })
            } else {
                reply.send({
                    code: 50009,
                    msg: '该医生不存在',
                    err: 'Null',
                    cb: {}
                })
            }
        } else {
            reply.send({
                code: 50006,
                msg: 'Token过期',
                err: 'Null',
                cb: {}
            })
        }
    });
}

async function accept(req, reply) {
    let doc = await doctors.findOne({user: req.body.userId}).exec();
    await questions
        .findOneAndUpdate({_id: req.body.questionId}, {
            $set: {
                answer: {
                    doctor: doc._id,
                    time: new Date()
                },
                state: 1
            }
        }, {new: true})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'Null',
                cb: cb
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        })
}

module.exports = {getQuestions, getQuestion, postQuestion, questionHistory, answer, docAnswer, accept, consult};