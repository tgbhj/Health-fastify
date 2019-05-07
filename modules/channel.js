const hhlchannels = require('../dbs/hhlchannels');
const hhlusers = require('../dbs/hhlusers');
const {findByToken} = require('../modules/user');

async function getChannels(req, reply) {
    await hhlchannels
        .find({state: 1})
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

async function getChannel(req, reply) {
    await hhlchannels
        .findById({_id: req.headers.id})
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

async function createChannel(req, reply) {
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            hhlchannels.findOne({user: user[0]._id}).then(hhlChannel => {
                if (hhlChannel == null) {
                    let channel = req.body;
                    channel.user = user[0]._id;
                    new hhlchannels(channel).save().then(newChannel => {
                        if (newChannel != null) {
                            hhlusers
                                .findByIdAndUpdate(user[0]._id, {$set: {channel: newChannel._id}})
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
                                code: 50000,
                                msg: 'UnKnow-Error',
                                err: 'Null',
                                cb: {}
                            })
                        }
                    })
                } else {
                    reply.send({
                        code: 50008,
                        msg: '直播间已存在',
                        err: 'Null',
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
                code: 50006,
                msg: 'token过期',
                err: 'Null',
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

async function modifyChannel(req, reply) {
    let channel = {
        state: req.body.state,
        title: req.body.title,
        detail: req.body.detail
    };
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            hhlchannels
                .findOneAndUpdate({user: user[0]._id}, channel)
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
    })
}

async function channelDel(req, reply) {
    await hhlchannels
        .deleteOne({_id: req.headers.id})
        .then(() => {
            hhlusers
                .findOneAndUpdate({'token.content': req.headers.token}, {$unset: {channel: req.headers._id}})
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
        })
}

async function userChannel(req, reply) {
    await findByToken(req, reply).then(user => {
        if (user.length !== 0) {
            hhlchannels
                .findOne({user: user[0]._id})
                .then(hhlChannel => {
                    if (hhlChannel == null) {
                        reply.send({
                            code: 20001,
                            msg: '直播间不存在',
                            err: 'Null',
                            cb: {}
                        })
                    } else {
                        reply.send({
                            code: 20002,
                            msg: '直播间已存在',
                            err: 'Null',
                            cb: hhlChannel
                        })
                    }
                })
        }
    })
}

module.exports = {getChannels, getChannel, createChannel, modifyChannel, channelDel, userChannel};