const findPwd = require('../dbs/findPwd');
const hhlusers = require('../dbs/hhlusers');
const policies = require('../dbs/policies');
const moment = require('moment');
const crypto = require('crypto');
const {randomWord} = require('./random');
const fs = require("fs");
const pump = require('pump');

async function findVCode(req, reply) {
    return await findPwd.find({
        phone: req.body.phone,
        isUsed: false
    }).where('getTime').gte(moment().subtract(5, 'minutes')._d).lte(new Date()).limit(1).sort({getTime: -1}).exec();
}

async function findByToken(req, reply) {
    return await hhlusers.aggregate([
        {$project: {password: 0, regTime: 0}},
        {$match: {'token.content': req.headers.token, 'token.endTime': {$gt: new Date()}}}
    ]).exec();
}

async function validateToken(req, reply) {
    let user = await findByToken(req, reply);
    if (user.length !== 0) {
        reply.send({
            code: 20000,
            msg: 'Success',
            cb: {}
        })
    } else {
        reply.send({
            code: 50006,
            msg: 'Token过期',
            cb: {}
        })
    }
}

async function reg(req, reply) {
    req.body.password = crypto.createHash('md5').update(req.body.password + ':adinno').digest('hex');
    let VCode = await findVCode(req, reply);
    if (VCode.length !== 0) {
        console.log(typeof req.body.VCode);
        if (VCode[0].vcode === req.body.VCode) {
            await hhlusers
                .findOne({phone: req.body.phone})
                .then(async cb => {
                    if (cb != null) {
                        if (cb.phone === req.body.phone) {
                            reply.send({
                                code: 50001,
                                msg: '手机已注册',
                                err: 'null',
                                cb: {}
                            })
                        } else if (cb.phone !== req.body.phone) {
                            await regByPhone(req, reply)
                        }
                    } else {
                        await regByPhone(req, reply)
                    }
                }, err => {
                    reply.send({
                        code: 50000,
                        msg: 'UnKnow-Error',
                        err: err,
                        cb: {}
                    })
                })
        } else if (VCode[0].vcode !== req.body.VCode) {
            reply.send({
                code: 50002,
                msg: '验证码错误',
                err: 'null',
                cb: {}
            })
        } else {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: 'null',
                cb: {}
            })
        }
    } else if (VCode.length === 0) {
        reply.send({
            code: 50003,
            msg: '验证码不存在或过期',
            err: 'null',
            cb: {}
        })
    } else {
        reply.send({
            code: 50000,
            msg: 'UnKnow-Error',
            err: 'null',
            cb: {}
        })
    }
}

async function regByPhone(req, reply) {
    let userNO = randomWord(true, 9, 9);
    await new hhlusers({
        username: userNO,
        password: req.body.password,
        phone: req.body.phone,
        token: {
            content: randomWord(true, 36, 36),
            startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
            endTime: moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
        }
    }).save((err, cb) => {
        if (cb != null) {
            findPwd.findOneAndUpdate({phone: req.body.phone}, {$set: {isUsed: true}}).sort({getTime: -1}).exec();
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: {
                    token: cb.token.content
                }
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
}

async function signByPass(req, reply) {
    req.body.password = crypto.createHash('md5').update(req.body.password + ':adinno').digest('hex');
    let user = await hhlusers.findOneAndUpdate({
        phone: req.body.phone,
        password: req.body.password
    }, {$set: {'token.endTime': moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss')}}, {new: true}).exec();
    if (user != null) {
        reply.send({
            code: 20000,
            msg: 'Success',
            err: 'null',
            cb: {
                token: user.token.content,
                type: user.type
            }
        })
    } else {
        reply.send({
            code: 50004,
            msg: "账号或密码错误",
            err: 'null',
            cb: {}
        })
    }
}

async function getUsers(req, reply) {
    await hhlusers
        .aggregate([{$project: {password: 0}}])
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function getUser(req, reply) {
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: user[0]
            })
        } else {
            reply.send({
                code: 50006,
                msg: 'Token过期',
                err: 'null',
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
    });
}

async function fp_step1(req, reply) {
    let VCode = await findVCode(req, reply);
    if (VCode.length === 0) {
        reply.send({
            code: 50003,
            msg: '验证码不存在或过期',
            err: 'null',
            cb: {}
        })
    } else {
        if (VCode[0].vcode === req.body.VCode) {
            await findPwd.findOneAndUpdate({phone: req.body.phone}, {$set: {isUsed: true}}).sort({getTime: -1}).exec();
            await hhlusers
                .findOne({phone: req.body.phone})
                .then(cb => {
                    if (cb != null) {
                        reply.send({
                            code: 20000,
                            msg: 'Success',
                            err: 'null',
                            cb: {}
                        })
                    } else {
                        reply.send({
                            code: 50007,
                            msg: '此号码未注册',
                            err: 'null',
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
        } else {
            reply.send({
                code: 50002,
                msg: '验证码错误',
                err: 'null',
                cb: {}
            })
        }
    }
}

async function fp_step2(req, reply) {
    req.body.password = crypto.createHash('md5').update(req.body.password + ':adinno').digest('hex');
    await hhlusers
        .findOneAndUpdate({phone: req.body.phone}, {$set: {password: req.body.password}})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function getPolicy(req, reply) {
    await findByToken(req, reply).then(async user => {
        if (user.length !== 0) {
            await policies
                .find({user: user[0]._id, state: 1})
                .then(cb => {
                    reply.send({
                        code: 20000,
                        msg: 'Success',
                        err: 'null',
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
                code: 50006,
                msg: 'token过期',
                err: 'null',
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
    });
}

async function getUserCollect(req, reply) {
    await hhlusers
        .findOne({'token.content': req.headers.token}, {collect: 1})
        .populate('collect')
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function userCollect(req, reply) {
    await hhlusers
        .findOneAndUpdate({'token.content': req.headers.token}, {$push: {collect: req.body.infoId}}, {new: true})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function delUserCollect(req, reply) {
    await hhlusers
        .findOneAndUpdate({'token.content': req.headers.token}, {$pull: {collect: req.body.infoId}})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function userLike(req, reply) {
    await hhlusers
        .findOneAndUpdate({'token.content': req.headers.token}, {$push: {like: req.body.infoId}}, {new: true})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function delUserLike(req, reply) {
    await hhlusers
        .findOneAndUpdate({'token.content': req.headers.token}, {$pull: {like: req.body.infoId}})
        .then(cb => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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

async function edit(req, reply) {
    await hhlusers
        .findOneAndUpdate({_id: req.body._id}, {$set: req.body.userInfo})
        .then(() => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
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
}

let face;
async function uploadFace(req, reply) {
    await req.multipart(handler, err => {
        if (err) {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        } else {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: {}
            })
        }
    });

    function handler(field, file, filename, encoding, mimetype) {
        filename = randomWord(true, 32, 32) + '.' + mimetype.slice(6);
        pump(file, fs.createWriteStream('./public/face/' + filename));
        face = filename;
    }
}

async function saveFace(req, reply) {
    await hhlusers
        .findByIdAndUpdate(req.body._id, {face: '/face/' + face})
        .then(() => {
            reply.send({
                code: 20000,
                msg: 'Success',
                err: 'null',
                cb: {}
            })
        }, err => {
            reply.send({
                code: 50000,
                msg: 'UnKnow-Error',
                err: err,
                cb: {}
            })
        });
}

module.exports = {
    reg,
    signByPass,
    getUsers,
    getUser,
    fp_step1,
    fp_step2,
    findByToken,
    getPolicy,
    getUserCollect,
    userCollect,
    delUserCollect,
    userLike,
    delUserLike,
    edit,
    validateToken,
    uploadFace,
    saveFace
};