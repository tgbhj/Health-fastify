const info = require('../dbs/hhlInfo');
const medicine = require('../dbs/medicine');

async function getInfos(req, reply) {
    await info
        .find()
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

async function getInfo(req, reply) {
    await info
        .findOneAndUpdate({_id: req.headers.id}, {$inc: {view: 1}})
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

async function setCollect(req, reply) {
    await info
        .findOneAndUpdate({_id: req.body.infoId}, {$push: {collect: req.body.userId}}, {new: true})
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

async function delCollect(req, reply) {
    await info
        .findOneAndUpdate({_id: req.body.infoId}, {$pull: {collect: req.body.userId}})
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

async function setLike(req, reply) {
    await info
        .findOneAndUpdate({_id: req.body.infoId}, {$push: {like: req.body.userId}}, {new: true})
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

async function delLike(req, reply) {
    await info
        .findOneAndUpdate({_id: req.body.infoId}, {$pull: {like: req.body.userId}})
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

async function getMed(req, reply) {
    await medicine
        .find()
        .sort({approval: -1})
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

module.exports = {getInfos, getInfo, setCollect, delCollect, setLike, delLike, getMed};